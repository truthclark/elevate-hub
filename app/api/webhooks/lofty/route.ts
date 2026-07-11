import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

// Inbound doorway: Lofty → Hub (via Zapier).
// When a Lofty lead books a consult (stage → Appointment Set, or tag "hub"),
// Zapier POSTs here and the lead appears in the Hub — deduplicated.
//
// Auth: ?key=LOFTY_WEBHOOK_SECRET (set in env; give the full URL to Zapier).
// Body (JSON, all optional except name):
//   { name, phone, email, type, source, timeline, budget, area, agent, notes, loftyId }

const norm = (s: unknown) =>
  String(s ?? "").toLowerCase().replace(/[^a-z0-9@]/g, "");

export async function POST(req: Request) {
  const secret = process.env.LOFTY_WEBHOOK_SECRET;
  const key = new URL(req.url).searchParams.get("key");
  if (!secret || key !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim();
  const loftyId = String(body.loftyId ?? "").trim();
  const noteBits = [
    "From Lofty",
    loftyId && `Lofty ID: ${loftyId}`,
    String(body.notes ?? "").trim(),
  ].filter(Boolean);

  // ── Dedup: match on Lofty ID, email, phone, then exact name ────
  const [leads, deals] = await Promise.all([store.listLeads(), store.listDeals()]);

  const leadMatch = leads.find(
    (l) =>
      !l.archived &&
      ((loftyId && l.notes.includes(`Lofty ID: ${loftyId}`)) ||
        (email && norm(l.email) === norm(email)) ||
        (phone && norm(l.phone) === norm(phone)) ||
        norm(l.name) === norm(name))
  );

  // Already an active client? Don't create anything — just report it.
  const dealMatch = deals.find(
    (d) => !d.archived && !d.closedDate && norm(d.name) === norm(name)
  );
  if (dealMatch && !leadMatch) {
    return NextResponse.json({
      ok: true,
      action: "skipped",
      reason: `Already an active ${dealMatch.side.toLowerCase()} deal (#${dealMatch.id})`,
    });
  }

  const fields = {
    phone: phone || leadMatch?.phone || "",
    email: email || leadMatch?.email || "",
    source: String(body.source ?? "").trim() || leadMatch?.source || "Lofty",
    type: String(body.type ?? "").trim() || leadMatch?.type || "Buyer",
    timeline: String(body.timeline ?? "").trim() || leadMatch?.timeline || "0-3 months",
    budget: String(body.budget ?? "").trim() || leadMatch?.budget || "",
    area: String(body.area ?? "").trim() || leadMatch?.area || "",
    agent: String(body.agent ?? "").trim() || leadMatch?.agent || "",
    followUpStatus: "Hot — consult booked",
  };

  let action: string;
  let id: number;
  if (leadMatch) {
    const mergedNotes = noteBits.filter((b) => !leadMatch.notes.includes(b));
    // If we matched on a hard identifier (Lofty ID / email / phone), trust
    // the incoming name — Lofty is the system of record for people.
    const matchedByIdentity =
      (loftyId && leadMatch.notes.includes(`Lofty ID: ${loftyId}`)) ||
      (email && norm(leadMatch.email) === norm(email)) ||
      (phone && norm(leadMatch.phone) === norm(phone));
    await store.updateLead(leadMatch.id, {
      ...fields,
      ...(matchedByIdentity ? { name } : {}),
      notes: [leadMatch.notes, ...mergedNotes].filter(Boolean).join(" · "),
      archived: false,
    });
    action = "updated";
    id = leadMatch.id;
  } else {
    const created = await store.createLead({
      date: new Date().toLocaleDateString("en-US"),
      name,
      ...fields,
      lastContact: "",
      notes: noteBits.join(" · "),
    });
    action = "created";
    id = created.id;
  }

  for (const p of ["/", "/leads"]) revalidatePath(p);
  return NextResponse.json({ ok: true, action, leadId: id });
}
