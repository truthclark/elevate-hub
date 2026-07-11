import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth, authConfigured } from "@/auth";
import { TOOL_DECLARATIONS, executeTool } from "@/lib/assistant/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gemini (free tier) agent loop with function calling.
// Swap providers later by replacing callModel().

const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

interface Part {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}
interface Content {
  role: "user" | "model";
  parts: Part[];
}

function systemPrompt(actor: string, teamLine: string, brand: { appName: string; companyName: string; brokerageName: string; city: string }) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  return `You are the ${brand.appName} assistant for ${brand.companyName} (${brand.city} real estate, brokered by ${brand.brokerageName}). Today is ${today}. You are talking to ${actor}.

You help the team manage deals (buyers/listings/referrals), leads, and tasks using your tools.

Rules:
- You can ADD and EDIT records and complete tasks. You can NEVER delete anything — if asked, say deletes must be done in the app by an admin.
- Before updating any record, use search_records to find its id. If several records could match, list them and ask which one — never guess.
- When the user pastes unstructured info (a text conversation, meeting notes), extract the details into the right fields.
- Dates in M/D/YYYY format. Prices as plain numbers. Commission as percent number (3 = 3%).
- Current team members: ${teamLine}. Only assign work to these people.
- After making changes, confirm exactly what you did in one short sentence.
- When the user asks for several changes at once, make MULTIPLE tool calls in the same turn (parallel function calls) instead of one at a time.
- Be brief and warm. Plain text only — no markdown headers or bullet lists unless asked.`;
}

async function callModel(model: string, system: string, contents: Content[]) {
  const res = await fetch(GEMINI_URL(model), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.candidates?.[0]?.content ?? { role: "model", parts: [] }) as Content;
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      reply:
        "I'm not connected yet — add a GEMINI_API_KEY in the environment settings (free at aistudio.google.com) and I'll be ready to help.",
      actions: [],
    });
  }

  let actor = "the team";
  if (authConfigured) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    actor = session.user.name?.split(" ")[0] ?? session.user.email ?? "the team";
  }

  const { messages } = (await req.json()) as {
    messages: { role: "user" | "assistant"; text: string }[];
  };

  const { store } = await import("@/lib/store");
  const { brandOf } = await import("@/lib/brand");
  const brand = brandOf(await store.getSettings());
  const team = await store.listTeam();
  const teamLine =
    team
      .filter((m) => m.active)
      .map((m) => `${m.name} (${m.role}${m.focus ? ` — ${m.focus}` : ""})`)
      .join("; ") || "the team admins";

  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const contents: Content[] = messages.slice(-12).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));

  const actions: string[] = [];

  try {
    for (let turn = 0; turn < 16; turn++) {
      const reply = await callModel(model, systemPrompt(actor, teamLine, brand), contents);
      const calls = (reply.parts ?? []).filter((p) => p.functionCall);

      if (calls.length === 0) {
        const text =
          (reply.parts ?? []).map((p) => p.text ?? "").join("").trim() ||
          "Done.";
        if (actions.length > 0) {
          for (const p of ["/", "/deals", "/pipeline", "/leads", "/tasks"])
            revalidatePath(p);
        }
        return NextResponse.json({ reply: text, actions });
      }

      contents.push({ role: "model", parts: reply.parts });
      const responseParts: Part[] = [];
      for (const call of calls) {
        const fc = call.functionCall!;
        const { result, action } = await executeTool(fc.name, fc.args ?? {}, actor);
        if (action) actions.push(action);
        responseParts.push({
          functionResponse: { name: fc.name, response: result },
        });
      }
      contents.push({ role: "user", parts: responseParts });
    }
    return NextResponse.json({
      reply: "That was a big one — I completed the changes listed below but ran out of steps. Tell me what's still missing and I'll finish it.",
      actions,
    });
  } catch (err) {
    console.error("Assistant error:", err);
    return NextResponse.json({
      reply: `Something went wrong talking to the AI service: ${(err as Error).message}. Try again in a moment.`,
      actions,
    });
  }
}
