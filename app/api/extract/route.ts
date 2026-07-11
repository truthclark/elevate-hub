import { NextRequest, NextResponse } from "next/server";
import { auth, authConfigured } from "@/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Reads an uploaded contract PDF with Gemini and returns the key TC dates.
// Free tier, same key as the assistant.

const PROMPT = `You are reading a Texas residential real estate purchase contract (TREC 20-17 or similar).
Extract these values and reply with ONLY a JSON object, no markdown:
{
  "contractDate": "YYYY-MM-DD or empty string",   // effective/execution date
  "optionDeadline": "YYYY-MM-DD or empty string", // end of option period (effective date + option days)
  "financingDeadline": "YYYY-MM-DD or empty string", // financing/third party approval deadline
  "closeDate": "YYYY-MM-DD or empty string",      // closing date
  "price": number or null,                         // sales price in dollars
  "address": "property address or empty string"
}
If the option period is given in days, add it to the effective date (day after effective date counts as day 1).
Use empty strings for anything you cannot find. Reply with the raw JSON only.`;

export async function POST(req: NextRequest) {
  if (authConfigured) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 400 });
  }

  const { pdf, mime } = (await req.json()) as { pdf?: string; mime?: string };
  if (!pdf) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (pdf.length > 14_000_000) {
    return NextResponse.json({ error: "File too large (10MB max)" }, { status: 400 });
  }

  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: mime || "application/pdf", data: pdf } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: `Gemini error ${res.status}` },
      { status: 502 }
    );
  }
  const out = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = out.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "Could not read the contract" }, { status: 422 });
  try {
    return NextResponse.json(JSON.parse(match[0]));
  } catch {
    return NextResponse.json({ error: "Could not parse the contract" }, { status: 422 });
  }
}
