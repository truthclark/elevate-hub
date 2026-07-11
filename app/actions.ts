"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { store } from "@/lib/store";
import { auth, authConfigured, currentRole } from "@/auth";
import { templateTasks, reflowTasks } from "@/lib/derive";
import { notifyTaskAssigned } from "@/lib/notify";
import { Deal, Lead, TaskItem, TeamMember, Settings, Side, Sop, PnlEntry, Checklists } from "@/lib/types";

function revalidateAll() {
  for (const p of ["/", "/deals", "/pipeline", "/leads", "/tasks", "/team", "/reports", "/settings", "/sops", "/money", "/calendar"])
    revalidatePath(p);
}

async function actorName(): Promise<string> {
  if (!authConfigured) return "Team";
  const session = await auth();
  return session?.user?.name?.split(" ")[0] ?? "Team";
}

const s = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const n = (fd: FormData, key: string): number | null => {
  const v = s(fd, key).replace(/[$,%\s]/g, "");
  if (!v) return null;
  const num = parseFloat(v);
  return isNaN(num) ? null : num;
};

async function requireAdmin() {
  const role = await currentRole();
  if (role !== "Admin") throw new Error("Admin access required");
}

// ── Deals ────────────────────────────────────────────────────────
function dealFromForm(fd: FormData): Omit<Deal, "id"> {
  // Checklist items are dynamic (configured per side in Settings) —
  // collect every checked check_* field
  const checklist: Record<string, string> = {};
  for (const key of Array.from(fd.keys())) {
    if (key.startsWith("check_") && fd.get(key)) checklist[key.slice(6)] = "Y";
  }
  return {
    side: (s(fd, "side") || "Buyer") as Side,
    name: s(fd, "name"),
    address: s(fd, "address"),
    agent: s(fd, "agent"),
    source: s(fd, "source"),
    referredBy: s(fd, "referredBy"),
    lender: s(fd, "lender"),
    closeGoal: s(fd, "closeGoal"),
    checklist,
    contractDate: s(fd, "contractDate"),
    optionDeadline: s(fd, "optionDeadline"),
    financingDeadline: s(fd, "financingDeadline"),
    appraisalDeadline: s(fd, "appraisalDeadline"),
    inspDate: s(fd, "inspDate"),
    closeDate: s(fd, "closeDate"),
    closedDate: s(fd, "closedDate"),
    price: n(fd, "price"),
    commPct: n(fd, "commPct"),
    referralPct: n(fd, "referralPct"),
    gci: n(fd, "gci"),
    status: s(fd, "status") || "Active",
    notes: s(fd, "notes"),
    year: n(fd, "year") ?? new Date().getFullYear(),
    // One-off fees/credits on this deal (parallel arrays from the form)
    adjustments: fd
      .getAll("adjLabel")
      .map((label, i) => ({
        label: String(label).trim(),
        amount:
          parseFloat(String(fd.getAll("adjAmount")[i] ?? "").replace(/[$,\s]/g, "")) || 0,
      }))
      .filter((a) => a.label && a.amount !== 0),
  };
}

// Outbound doorway: Hub → Lofty (via Zapier catch hook).
// Fired when a deal transitions to Closed so Lofty can tag the client
// "Past Client" and start the nurture Smart Plan. Fire-and-forget.
async function notifyClosed(deal: Deal) {
  const hook = process.env.ZAPIER_CLOSED_HOOK_URL;
  if (!hook) return;
  try {
    // Enrich with contact info from the converted lead, if we have it
    const leads = await store.listLeads();
    const lead = leads.find(
      (l) => l.name.toLowerCase() === deal.name.toLowerCase()
    );
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "deal_closed",
        name: deal.name,
        address: deal.address,
        side: deal.side,
        closedDate: deal.closedDate || deal.closeDate,
        price: deal.price,
        email: lead?.email ?? "",
        phone: lead?.phone ?? "",
      }),
    });
  } catch (err) {
    console.error("Zapier closed-hook failed (non-blocking):", err);
  }
}

const isClosedStatus = (d: { status: string; closedDate: string }) =>
  Boolean(d.closedDate) || d.status.toLowerCase() === "closed";

export async function saveDeal(fd: FormData) {
  const id = n(fd, "id");
  const deal = dealFromForm(fd);
  let saved: Deal;
  if (id != null) {
    const before = (await store.listDeals()).find((d) => d.id === id);
    await store.updateDeal(id, deal);
    saved = { ...deal, id };
    if (before && !isClosedStatus(before) && isClosedStatus(saved)) {
      await notifyClosed(saved);
    }
    // Contract/close date moved? Re-anchor open template tasks to the new dates.
    if (
      before &&
      (before.contractDate !== saved.contractDate || before.closeDate !== saved.closeDate)
    ) {
      const updates = reflowTasks(saved, await store.listTasks());
      for (const u of updates) await store.updateTask(u.id, { dueDate: u.dueDate });
    }
  } else {
    saved = await store.createDeal(deal);
  }
  // Apply a task template if requested
  const templateId = s(fd, "applyTemplate");
  if (templateId) {
    const [settings, team] = await Promise.all([store.getSettings(), store.listTeam()]);
    const tasks = templateTasks(saved, templateId, settings.templates, team);
    if (tasks.length) await store.createTasks(tasks);
  }
  revalidateAll();
}

// "Delete" from the UI = archive (soft delete, restorable from /archive)
export async function deleteDeal(fd: FormData) {
  const id = n(fd, "id");
  if (id != null) await store.updateDeal(id, { archived: true });
  revalidateAll();
}

// ── Leads ────────────────────────────────────────────────────────
export async function saveLead(fd: FormData) {
  const id = n(fd, "id");
  const checklist: Record<string, string> = {};
  for (const key of Array.from(fd.keys())) {
    if (key.startsWith("check_") && fd.get(key)) checklist[key.slice(6)] = "Y";
  }
  const lead: Omit<Lead, "id"> = {
    checklist,
    date: s(fd, "date") || new Date().toLocaleDateString("en-US"),
    name: s(fd, "name"),
    phone: s(fd, "phone"),
    email: s(fd, "email"),
    source: s(fd, "source"),
    type: s(fd, "type"),
    timeline: s(fd, "timeline"),
    budget: s(fd, "budget"),
    area: s(fd, "area"),
    agent: s(fd, "agent"),
    followUpStatus: s(fd, "followUpStatus"),
    lastContact: s(fd, "lastContact"),
    notes: s(fd, "notes"),
  };
  if (id != null) await store.updateLead(id, lead);
  else await store.createLead(lead);
  revalidateAll();
}

export async function deleteLead(fd: FormData) {
  const id = n(fd, "id");
  if (id != null) await store.updateLead(id, { archived: true });
  revalidateAll();
}

// ── Bulk actions ─────────────────────────────────────────────────
function parseIds(fd: FormData): number[] {
  return s(fd, "ids")
    .split(",")
    .map((x) => parseInt(x.trim()))
    .filter((x) => !isNaN(x));
}

export async function bulkDeals(fd: FormData) {
  const ids = parseIds(fd);
  const op = s(fd, "op");
  const value = s(fd, "value");
  for (const id of ids) {
    if (op === "archive") await store.updateDeal(id, { archived: true });
    else if (op === "status" && value) await store.updateDeal(id, { status: value });
    else if (op === "agent" && value) await store.updateDeal(id, { agent: value });
  }
  revalidateAll();
}

export async function bulkLeads(fd: FormData) {
  const ids = parseIds(fd);
  const op = s(fd, "op");
  const value = s(fd, "value");
  for (const id of ids) {
    if (op === "archive") await store.updateLead(id, { archived: true });
    else if (op === "status" && value) await store.updateLead(id, { followUpStatus: value });
    else if (op === "agent" && value) await store.updateLead(id, { agent: value });
  }
  revalidateAll();
}

// ── Archive management ───────────────────────────────────────────
export async function restoreRecord(fd: FormData) {
  const id = n(fd, "id");
  const kind = s(fd, "kind");
  if (id == null) return;
  if (kind === "deal") await store.updateDeal(id, { archived: false });
  else if (kind === "lead") await store.updateLead(id, { archived: false });
  revalidateAll();
}

// Permanent delete — admin only, from the Archive page
export async function destroyRecord(fd: FormData) {
  await requireAdmin();
  const id = n(fd, "id");
  const kind = s(fd, "kind");
  if (id == null) return;
  if (kind === "deal") await store.deleteDeal(id);
  else if (kind === "lead") await store.deleteLead(id);
  revalidateAll();
}

// ── Tasks ────────────────────────────────────────────────────────
export async function saveTask(fd: FormData) {
  const id = n(fd, "id");
  const task: Omit<TaskItem, "id"> = {
    task: s(fd, "task"),
    dueDate: s(fd, "dueDate"),
    dueTime: s(fd, "dueTime"),
    assignedTo: s(fd, "assignedTo"),
    priority: s(fd, "priority") || "Medium",
    relatedClient: s(fd, "relatedClient"),
    status: s(fd, "status") || "Open",
    notes: s(fd, "notes"),
    dealId: n(fd, "dealId"),
    recur: s(fd, "recur"),
  };
  // Email the assignee when a task lands on their plate (new task, or reassigned)
  let newlyAssigned = Boolean(task.assignedTo);
  if (id != null) {
    const before = (await store.listTasks()).find((t) => t.id === id);
    newlyAssigned = Boolean(task.assignedTo) && before?.assignedTo !== task.assignedTo;
    await store.updateTask(id, task);
  } else {
    await store.createTask(task);
  }
  if (newlyAssigned && task.status.toLowerCase() !== "done") {
    const [team, actor] = await Promise.all([store.listTeam(), actorName()]);
    const assignee = team.find(
      (m) => m.name.toLowerCase() === task.assignedTo.toLowerCase()
    );
    await notifyTaskAssigned(task, assignee, actor);
  }
  revalidateAll();
}

// Next due date for a recurring task
function nextRecurDate(dueDate: string, recur: string): string | null {
  const parts = dueDate.split(/[-/]/).map(Number);
  let d: Date;
  if (dueDate.includes("-") && parts[0] > 1000) d = new Date(parts[0], parts[1] - 1, parts[2]);
  else if (parts.length === 3) d = new Date(parts[2] < 100 ? 2000 + parts[2] : parts[2], parts[0] - 1, parts[1]);
  else d = new Date();
  if (isNaN(d.getTime())) d = new Date();
  if (recur === "daily") d.setDate(d.getDate() + 1);
  else if (recur === "weekdays") {
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  } else if (recur === "weekly") d.setDate(d.getDate() + 7);
  else if (recur === "monthly") d.setMonth(d.getMonth() + 1);
  else return null;
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function toggleTask(fd: FormData) {
  const id = n(fd, "id");
  const done = s(fd, "done") === "true";
  if (id != null) {
    await store.updateTask(id, { status: done ? "Done" : "Open" });
    // Recurring: completing spawns the next occurrence
    if (done) {
      const task = (await store.listTasks()).find((t) => t.id === id);
      if (task?.recur) {
        const next = nextRecurDate(task.dueDate, task.recur);
        if (next) {
          await store.createTask({ ...task, id: undefined as never, dueDate: next, status: "Open" } as Omit<import("@/lib/types").TaskItem, "id">);
        }
      }
    }
  }
  revalidateAll();
}

// Lightweight partial update (priority flag, snooze, drag-to-day)
export async function patchTask(fd: FormData) {
  const id = n(fd, "id");
  if (id == null) return;
  const patch: Record<string, string> = {};
  for (const key of ["priority", "dueDate", "status"]) {
    const v = fd.get(key);
    if (v != null) patch[key] = String(v);
  }
  await store.updateTask(id, patch);
  revalidateAll();
}

// Persist manual drag order (array index = position)
export async function reorderTasks(ids: number[]) {
  for (let i = 0; i < ids.length; i++) {
    await store.updateTask(ids[i], { sortOrder: i + 1 });
  }
  revalidatePath("/tasks");
}

// ── Pipeline grid: toggle a single checklist cell ────────────────
export async function toggleCheck(fd: FormData) {
  const kind = s(fd, "kind"); // "deal" | "lead"
  const id = n(fd, "id");
  const key = s(fd, "key");
  const on = s(fd, "on") === "true";
  if (id == null || !key) return;
  if (kind === "lead") {
    const lead = (await store.listLeads()).find((l) => l.id === id);
    if (!lead) return;
    const checklist = { ...(lead.checklist ?? {}) };
    if (on) checklist[key] = "Y";
    else delete checklist[key];
    await store.updateLead(id, { checklist });
  } else {
    const deal = (await store.listDeals()).find((d) => d.id === id);
    if (!deal) return;
    const checklist = { ...deal.checklist };
    if (on) checklist[key] = "Y";
    else delete checklist[key];
    await store.updateDeal(id, { checklist });
  }
  revalidateAll();
}

// ── Quick links ──────────────────────────────────────────────────
export async function saveLinks(links: import("@/lib/types").LinkItem[]) {
  const settings = await store.getSettings();
  settings.links = links;
  await store.saveSettings(settings);
  revalidatePath("/links");
}

export async function deleteTask(fd: FormData) {
  const id = n(fd, "id");
  if (id != null) await store.deleteTask(id);
  revalidateAll();
}

// ── Team ─────────────────────────────────────────────────────────
export async function saveMember(fd: FormData) {
  await requireAdmin();
  const id = n(fd, "id");
  const roles = (["Admin", "Agent", "Ops"] as const)
    .filter((r) => fd.get(`role_${r}`))
    .join(", ");
  const member: Omit<TeamMember, "id"> = {
    name: s(fd, "name"),
    email: s(fd, "email").toLowerCase(),
    phone: s(fd, "phone"),
    role: roles || "Agent",
    focus: s(fd, "focus"),
    color: s(fd, "color") || "#05c3f9",
    active: s(fd, "active") !== "false",
    photo: s(fd, "photo"),
    calendarUrl: s(fd, "calendarUrl"),
  };
  if (id != null) await store.updateMember(id, member);
  else await store.createMember(member);
  revalidateAll();
}

export async function deleteMember(fd: FormData) {
  await requireAdmin();
  const id = n(fd, "id");
  if (id != null) await store.deleteMember(id);
  revalidateAll();
}

// ── Settings ─────────────────────────────────────────────────────
export async function saveTargets(fd: FormData) {
  await requireAdmin();
  const settings = await store.getSettings();
  const year = n(fd, "year") ?? settings.year;
  settings.year = year;
  settings.targets[String(year)] = {
    annual: n(fd, "annual") ?? 0,
    q1: n(fd, "q1") ?? 0,
    q2: n(fd, "q2") ?? 0,
    q3: n(fd, "q3") ?? 0,
    q4: n(fd, "q4") ?? 0,
  };
  await store.saveSettings(settings);
  revalidateAll();
}

export async function saveTemplates(settings: Settings) {
  await requireAdmin();
  await store.saveSettings(settings);
  revalidateAll();
}

export async function saveBranding(fd: FormData) {
  await requireAdmin();
  const settings = await store.getSettings();
  const logo = s(fd, "logo");
  settings.branding = { ...settings.branding, logo };
  await store.saveSettings(settings);
  revalidateAll();
}

// Company identity — powers the app name, login page, share pages, emails
export async function saveBrandInfo(fd: FormData) {
  await requireAdmin();
  const settings = await store.getSettings();
  settings.branding = {
    ...settings.branding,
    appName: s(fd, "appName"),
    companyName: s(fd, "companyName"),
    brokerageName: s(fd, "brokerageName"),
    city: s(fd, "city"),
    tagline: s(fd, "tagline"),
  };
  await store.saveSettings(settings);
  revalidateAll();
}

// ── Activity log ─────────────────────────────────────────────────
export async function logActivity(fd: FormData) {
  const kind = s(fd, "kind");
  if (!kind) return;
  await store.createActivity({
    date: s(fd, "date") || new Date().toISOString().slice(0, 10),
    kind,
    who: s(fd, "who"),
    about: s(fd, "about"),
    notes: s(fd, "notes"),
  });
  revalidatePath("/tasks");
  revalidatePath("/scorecard");
  const dealId = n(fd, "dealId");
  if (dealId != null) revalidatePath(`/deals/${dealId}`);
}

export async function deleteActivity(fd: FormData) {
  const id = n(fd, "id");
  if (id != null) await store.deleteActivity(id);
  revalidatePath("/tasks");
  revalidatePath("/scorecard");
}

// KPI tally minus: remove the most recent matching entry for that person/day
export async function undoLastActivity(fd: FormData) {
  const kind = s(fd, "kind");
  const who = s(fd, "who");
  const date = s(fd, "date");
  if (!kind || !date) return;
  const all = await store.listActivities();
  const match = all
    .filter(
      (a) =>
        a.kind === kind &&
        a.date === date &&
        (!who || a.who.toLowerCase() === who.toLowerCase())
    )
    .sort((a, b) => b.id - a.id)[0];
  if (match) await store.deleteActivity(match.id);
  revalidatePath("/tasks");
  revalidatePath("/scorecard");
}

// ── Funnels: public landing pages ────────────────────────────────
export async function saveFunnel(fd: FormData) {
  await requireAdmin();
  const id = n(fd, "id");
  const slug = s(fd, "slug").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) return;
  // Custom questions: one per line. "Label: opt1 / opt2" = dropdown, plain = text.
  const fields = s(fd, "fieldsRaw")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((line, i) => {
      const colon = line.indexOf(":");
      const opts = colon > 0 ? line.slice(colon + 1).split("/").map((o) => o.trim()).filter(Boolean) : [];
      if (colon > 0 && opts.length > 1) {
        return { key: `q${i}`, label: line.slice(0, colon).trim(), type: "select" as const, options: opts };
      }
      return { key: `q${i}`, label: line, type: "text" as const };
    });

  // Optional uploaded freebie (PDF etc., ≤ 4MB) — stored in the row, served
  // from /f/[slug]/resource and attached to the delivery email.
  let resourceName = s(fd, "resourceNameKeep");
  let resourceData = ""; // "" = keep existing on update
  const file = fd.get("resourceFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > 4 * 1024 * 1024) throw new Error("Resource file must be under 4MB");
    resourceData = Buffer.from(await file.arrayBuffer()).toString("base64");
    resourceName = file.name;
  }

  const base = {
    slug,
    name: s(fd, "name") || slug,
    template: (s(fd, "template") === "call" ? "call" : "magnet") as "call" | "magnet",
    headline: s(fd, "headline"),
    subhead: s(fd, "subhead"),
    bullets: s(fd, "bullets").split("\n").map((b) => b.trim()).filter(Boolean).slice(0, 6),
    testimonial: s(fd, "testimonial"),
    ctaLabel: s(fd, "ctaLabel") || "Send it to me",
    resourceUrl: s(fd, "resourceUrl"),
    calendlyUrl: s(fd, "calendlyUrl"),
    fields,
    active: s(fd, "active") !== "false",
  };
  if (id != null) {
    const patch: Record<string, unknown> = { ...base };
    if (resourceData) {
      patch.resourceData = resourceData;
      patch.resourceName = resourceName;
    }
    await store.updateFunnel(id, patch);
  } else {
    await store.createFunnel({
      ...base,
      resourceName,
      resourceData,
      views: 0,
      submissions: 0,
    });
  }
  revalidatePath("/funnels");
  revalidatePath(`/f/${slug}`);
}

export async function deleteFunnel(fd: FormData) {
  await requireAdmin();
  const id = n(fd, "id");
  if (id != null) await store.deleteFunnel(id);
  revalidatePath("/funnels");
}

// Public form submission: creates a Hub lead, notifies Lofty via Zapier,
// emails the freebie. NO auth — this runs for prospects.
export async function submitFunnel(fd: FormData) {
  // Honeypot: bots fill every field; humans never see this one
  if (s(fd, "website")) return;
  const funnelId = n(fd, "funnelId");
  const name = s(fd, "name");
  const email = s(fd, "email");
  const phone = s(fd, "phone");
  if (funnelId == null || !name || (!email && !phone)) return;
  const funnel = (await store.listFunnels()).find((f) => f.id === funnelId && f.active);
  if (!funnel) return;

  // Custom answers → notes (and timeline if a question mentions it)
  const answers: string[] = [];
  let timeline = "";
  for (const f of funnel.fields) {
    const v = s(fd, f.key);
    if (!v) continue;
    answers.push(`${f.label}: ${v}`);
    if (/timeline|when|pcs|date/i.test(f.label) && !timeline) timeline = v;
  }

  await store.createLead({
    date: new Date().toLocaleDateString("en-US"),
    name,
    phone,
    email,
    source: funnel.name,
    type: "Buyer",
    timeline,
    budget: "",
    area: "",
    agent: "",
    followUpStatus: "New — needs first call",
    lastContact: "",
    notes: answers.join(" · "),
  });
  await store.bumpFunnel(funnel.id, "submissions");

  // → Lofty (via Zapier catch hook, fire-and-forget)
  const hook = process.env.ZAPIER_LEAD_HOOK_URL;
  if (hook) {
    fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "funnel_lead", funnel: funnel.name, name, email, phone, timeline, answers }),
    }).catch((err) => console.error("Funnel Zapier hook failed (non-blocking):", err));
  }

  // Email the freebie (needs RESEND_API_KEY + verified domain to reach prospects)
  if (process.env.RESEND_API_KEY && email && funnel.template === "magnet") {
    const settings = await store.getSettings();
    const { brandOf } = await import("@/lib/brand");
    const brand = brandOf(settings);
    const appUrl = process.env.APP_URL || "";
    const link = funnel.resourceData
      ? `${appUrl}/f/${funnel.slug}/resource`
      : funnel.resourceUrl;
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.DIGEST_FROM || `${brand.companyName} <onboarding@resend.dev>`,
        to: email,
        subject: `Here's your ${funnel.name}`,
        html: `<div style="font-family:sans-serif;max-width:480px">
          <p style="font-size:15px">Hey ${name.split(" ")[0]},</p>
          <p style="font-size:14px;color:#333">Here's the resource you asked for${link ? `: <a href="${link}" style="color:#05c3f9;font-weight:bold">open it here</a>` : " — it's attached"}.</p>
          <p style="font-size:13px;color:#555">Questions? Just reply to this email.<br/>— ${brand.companyName}</p>
        </div>`,
        ...(funnel.resourceData
          ? { attachments: [{ filename: funnel.resourceName || "resource.pdf", content: funnel.resourceData }] }
          : {}),
      }),
    }).catch((err) => console.error("Funnel delivery email failed (non-blocking):", err));
  }

  revalidatePath("/leads");
  revalidatePath("/funnels");
  redirect(`/f/${funnel.slug}?thanks=1`);
}

// ── Google Calendar ──────────────────────────────────────────────
// Disconnect your own calendar (admins can disconnect anyone's)
export async function disconnectCalendar(fd: FormData) {
  const email = s(fd, "email").toLowerCase();
  if (!email) return;
  const session = authConfigured ? await auth() : null;
  const self = session?.user?.email?.toLowerCase() === email;
  if (!self) await requireAdmin();
  await store.deleteCalendarToken(email);
  revalidatePath("/settings");
  revalidatePath("/tasks");
}

// ── Deal notes ───────────────────────────────────────────────────
export async function addNote(fd: FormData) {
  const dealId = n(fd, "dealId");
  const body = s(fd, "body");
  if (dealId == null || !body) return;
  await store.createNote({
    dealId,
    body,
    author: await actorName(),
    pinned: false,
    createdAt: new Date().toISOString(),
  });
  revalidatePath(`/deals/${dealId}`);
}

export async function togglePinNote(fd: FormData) {
  const id = n(fd, "id");
  const dealId = n(fd, "dealId");
  const pinned = s(fd, "pinned") === "true";
  if (id == null) return;
  await store.updateNote(id, { pinned });
  if (dealId != null) revalidatePath(`/deals/${dealId}`);
}

export async function deleteNote(fd: FormData) {
  const id = n(fd, "id");
  const dealId = n(fd, "dealId");
  if (id == null) return;
  await store.deleteNote(id);
  if (dealId != null) revalidatePath(`/deals/${dealId}`);
}

// Apply an SOP task template to an existing deal (from the deal record page)
export async function applyTemplateToDeal(fd: FormData) {
  const dealId = n(fd, "dealId");
  const templateId = s(fd, "templateId");
  if (dealId == null || !templateId) return;
  const deal = (await store.listDeals()).find((d) => d.id === dealId);
  if (!deal) return;
  const [settings, team] = await Promise.all([store.getSettings(), store.listTeam()]);
  const tasks = templateTasks(deal, templateId, settings.templates, team);
  if (tasks.length) await store.createTasks(tasks);
  revalidateAll();
  revalidatePath(`/deals/${dealId}`);
}

// ── Scorecard ────────────────────────────────────────────────────
export async function saveScore(fd: FormData) {
  const mid = s(fd, "mid");
  const week = s(fd, "week");
  const value = n(fd, "value");
  if (!mid || !week) return;
  const settings = await store.getSettings();
  settings.scores = settings.scores ?? {};
  settings.scores[mid] = settings.scores[mid] ?? {};
  if (value == null) delete settings.scores[mid][week];
  else settings.scores[mid][week] = value;
  await store.saveSettings(settings);
  revalidatePath("/scorecard");
}

export async function saveMeasurables(measurables: import("@/lib/types").Measurable[]) {
  await requireAdmin();
  const settings = await store.getSettings();
  settings.measurables = measurables;
  await store.saveSettings(settings);
  revalidatePath("/scorecard");
  revalidatePath("/settings");
}

// ── Client timeline sharing ──────────────────────────────────────
export async function enableShare(dealId: number): Promise<string> {
  const deals = await store.listDeals();
  const deal = deals.find((d) => d.id === dealId);
  if (!deal) return "";
  if (deal.shareToken) return deal.shareToken;
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 21);
  await store.updateDeal(dealId, { shareToken: token });
  revalidatePath("/deals");
  return token;
}

export async function disableShare(dealId: number) {
  await store.updateDeal(dealId, { shareToken: "" });
  revalidatePath("/deals");
}

// ── Onboarding ───────────────────────────────────────────────────
export async function markOnboarded() {
  const settings = await store.getSettings();
  settings.onboarded = true;
  await store.saveSettings(settings);
  revalidateAll();
}

export async function finishOnboarding() {
  await markOnboarded();
  redirect("/");
}

export async function saveChecklists(checklists: Checklists) {
  await requireAdmin();
  const settings = await store.getSettings();
  settings.checklists = checklists;
  await store.saveSettings(settings);
  revalidateAll();
}

export async function saveBrokerage(fd: FormData) {
  await requireAdmin();
  const settings = await store.getSettings();
  // Per-transaction fees arrive as parallel arrays (one row per fee)
  const labels = fd.getAll("feeLabel").map(String);
  const amounts = fd.getAll("feeAmount").map(String);
  const timings = fd.getAll("feeTiming").map(String);
  const kinds = fd.getAll("feeKind").map(String);
  const fees = labels
    .map((label, i) => ({
      label: label.trim(),
      amount: parseFloat((amounts[i] ?? "").replace(/[$,%\s]/g, "")) || 0,
      timing: (["always", "beforeCap", "afterCap"].includes(timings[i])
        ? timings[i]
        : "always") as "always" | "beforeCap" | "afterCap",
      kind: (kinds[i] === "pct" ? "pct" : "flat") as "flat" | "pct",
    }))
    .filter((f) => f.label && f.amount > 0);
  settings.brokerage = {
    splitPct: n(fd, "splitPct") ?? 15,
    annualCap: n(fd, "annualCap") ?? 0,
    capResetMonth: Math.min(12, Math.max(1, n(fd, "capResetMonth") ?? 1)),
    capResetDay: Math.min(31, Math.max(1, n(fd, "capResetDay") ?? 1)),
    fees,
  };
  await store.saveSettings(settings);
  revalidateAll();
}

// ── SOPs ─────────────────────────────────────────────────────────
export async function saveSop(fd: FormData) {
  const id = n(fd, "id");
  const sop: Omit<Sop, "id"> = {
    title: s(fd, "title"),
    category: s(fd, "category") || "Operations",
    content: s(fd, "content"),
    updatedBy: await actorName(),
    updatedAt: new Date().toLocaleDateString("en-US"),
  };
  if (id != null) await store.updateSop(id, sop);
  else await store.createSop(sop);
  revalidateAll();
}

export async function deleteSop(fd: FormData) {
  await requireAdmin();
  const id = n(fd, "id");
  if (id != null) await store.deleteSop(id);
  revalidateAll();
}

// ── P&L ──────────────────────────────────────────────────────────
export async function savePnl(fd: FormData) {
  const entry: Omit<PnlEntry, "id"> = {
    month: s(fd, "month") || new Date().toISOString().slice(0, 7),
    kind: (s(fd, "kind") === "Income" ? "Income" : "Expense") as PnlEntry["kind"],
    category: s(fd, "category"),
    description: s(fd, "description"),
    amount: Math.abs(n(fd, "amount") ?? 0),
    recurring: s(fd, "recurring") === "on" || s(fd, "recurring") === "true",
    endMonth: "",
    recurOf: null,
  };
  await store.createPnl(entry);
  revalidateAll();
}

// Stop a recurring entry: it keeps everything logged so far, adds nothing new.
export async function stopRecurringPnl(fd: FormData) {
  const id = n(fd, "id");
  if (id == null) return;
  const entries = await store.listPnl();
  const tpl = entries.find((e) => e.id === id);
  if (!tpl?.recurring) return;
  // End with the latest month already materialized (or the start month)
  const latest = entries
    .filter((e) => e.recurOf === id)
    .reduce((max, e) => (e.month > max ? e.month : max), tpl.month);
  await store.updatePnl(id, { endMonth: latest });
  revalidateAll();
}

// Materialize recurring entries up to the current month (never the future).
// Idempotent — safe to run on every Money page load.
export async function materializeRecurringPnl() {
  const entries = await store.listPnl();
  const nowYm = new Date().toISOString().slice(0, 7);
  const nextYm = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m, 1); // month is 0-based → this is already +1
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  for (const tpl of entries.filter((e) => e.recurring && e.recurOf == null)) {
    const stop = tpl.endMonth || nowYm;
    const have = new Set(
      entries.filter((e) => e.recurOf === tpl.id).map((e) => e.month)
    );
    let ym = nextYm(tpl.month);
    let guard = 0;
    while (ym <= stop && ym <= nowYm && guard++ < 120) {
      if (!have.has(ym)) {
        await store.createPnl({
          month: ym,
          kind: tpl.kind,
          category: tpl.category,
          description: tpl.description,
          amount: tpl.amount,
          recurring: false,
          endMonth: "",
          recurOf: tpl.id,
        });
      }
      ym = nextYm(ym);
    }
  }
}

export async function deletePnl(fd: FormData) {
  const id = n(fd, "id");
  if (id != null) await store.deletePnl(id);
  revalidateAll();
}

// ── Lead ⇄ client conversion ─────────────────────────────────────
export async function convertLeadToDeal(fd: FormData) {
  const id = n(fd, "id");
  if (id == null) return;
  const leads = await store.listLeads();
  const lead = leads.find((l) => l.id === id);
  if (!lead) return;

  const side: Side = lead.type.toLowerCase() === "seller" ? "Listing" : "Buyer";
  const deal = await store.createDeal({
    side,
    name: lead.name,
    address: "",
    agent: lead.agent,
    source: lead.source,
    referredBy: "",
    lender: "",
    closeGoal: "",
    checklist: { ...(lead.checklist ?? {}) },
    contractDate: "", optionDeadline: "", financingDeadline: "",
    appraisalDeadline: "", inspDate: "", closeDate: "", closedDate: "",
    price: null, commPct: null, referralPct: null, gci: null,
    status: "Active",
    // Qualification work carries over — keys match the deal checklist
    notes: [lead.notes, lead.budget && `Budget ${lead.budget}`, lead.area && `Area: ${lead.area}`, lead.phone, lead.email]
      .filter(Boolean).join(" · "),
    year: new Date().getFullYear(),
  });
  await store.updateLead(id, {
    followUpStatus: "Converted",
    notes: `${lead.notes ? lead.notes + " · " : ""}Converted to ${side} deal #${deal.id}`,
  });
  // Auto-apply the matching SOP template
  const [settings, team] = await Promise.all([store.getSettings(), store.listTeam()]);
  const tpl = settings.templates.find((t) => t.side === side);
  if (tpl) {
    const tasks = templateTasks(deal, tpl.id, settings.templates, team);
    if (tasks.length) await store.createTasks(tasks);
  }
  revalidateAll();
}

// Kick an ACTIVE client back to Leads (undo a conversion that fizzled).
// Revives their original lead if it exists, cleans up the deal's open
// auto-tasks, and archives the deal record.
export async function demoteDealToLead(fd: FormData) {
  const id = n(fd, "id");
  if (id == null) return;
  const [deals, leads, tasks] = await Promise.all([
    store.listDeals(),
    store.listLeads(),
    store.listTasks(),
  ]);
  const deal = deals.find((d) => d.id === id);
  if (!deal) return;

  // Revive the original lead if this deal came from one
  const original = leads.find((l) => l.notes.includes(`deal #${id}`));
  if (original) {
    await store.updateLead(original.id, {
      followUpStatus: "Nurture",
      archived: false,
      notes: `${original.notes} · Back to lead ${new Date().toLocaleDateString("en-US")} (deal paused)`,
    });
  } else {
    await store.createLead({
      date: new Date().toLocaleDateString("en-US"),
      name: deal.name || deal.address,
      phone: "",
      email: "",
      source: deal.source || "Other",
      type: deal.side === "Listing" ? "Seller" : "Buyer",
      timeline: "6-12 months",
      budget: "",
      area: "",
      agent: deal.agent,
      followUpStatus: "Nurture",
      lastContact: "",
      notes: `Was an active ${deal.side.toLowerCase()} (deal paused ${new Date().toLocaleDateString("en-US")}). ${deal.notes}`.trim(),
    });
  }

  // Remove the deal's open auto-generated tasks so they stop cluttering
  for (const t of tasks) {
    if (t.dealId === id && t.status.toLowerCase() !== "done") {
      await store.deleteTask(t.id);
    }
  }

  await store.updateDeal(id, { archived: true });
  revalidateAll();
}

export async function dealBackToLead(fd: FormData) {
  const id = n(fd, "id");
  if (id == null) return;
  const deals = await store.listDeals();
  const deal = deals.find((d) => d.id === id);
  if (!deal) return;
  await store.createLead({
    date: new Date().toLocaleDateString("en-US"),
    name: deal.name || deal.address,
    phone: "",
    email: "",
    source: "Past Client",
    type: deal.side === "Listing" ? "Seller" : "Buyer",
    timeline: "6-12 months",
    budget: "",
    area: "",
    agent: deal.agent,
    followUpStatus: "Nurture",
    lastContact: "",
    notes: `Past client — ${deal.side.toLowerCase()} closed ${deal.closedDate || deal.closeDate || ""} (${deal.address || deal.name}). Stay in touch.`,
  });
  revalidateAll();
}

// ── Import from Google Sheet ─────────────────────────────────────
export async function importFromSheet() {
  await requireAdmin();
  const { importSheet } = await import("@/lib/import");
  const result = await importSheet();
  revalidateAll();
  return result;
}
