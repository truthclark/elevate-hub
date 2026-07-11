import { Deal, Lead, Measurable, Activity, CONTACT_KINDS, APPT_KINDS } from "./types";
import { parseDateSafe } from "./utils";

// Local copies of the closed/pending checks (lib/derive pulls in the server
// store, and this module is also imported by client components)
const isClosed = (d: Deal) =>
  Boolean(d.closedDate) || d.status.toLowerCase() === "closed";
const isPending = (d: Deal) =>
  !isClosed(d) &&
  ["pending", "option", "under contract"].some((s) =>
    d.status.toLowerCase().includes(s)
  );

// Week starts Monday. Keys are the Monday's date as YYYY-MM-DD.
export function weekStartOf(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  x.setDate(x.getDate() - ((day + 6) % 7));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

// Last n week-start keys, oldest first, ending with the current week.
export function lastWeeks(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    out.push(weekStartOf(d));
  }
  return out;
}

export function weekLabel(weekStart: string): string {
  const d = parseDateSafe(weekStart);
  if (!d) return weekStart;
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

// Month keys are YYYY-MM. Last n months, oldest first, ending current month.
export function lastMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

const monthOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Activity kinds behind each auto measurable
const AUTO_ACTIVITY_KINDS: Partial<Record<Measurable["auto"], string[]>> = {
  contactsLogged: CONTACT_KINDS,
  apptsHeld: APPT_KINDS,
  apptsSet: ["Appointment Set"],
  agreementsSigned: ["Agreement Signed"],
  offersWritten: ["Offer Written"],
};

// Auto-computed values per period bucket (week or month) from hub data.
export function autoValues(
  kind: Measurable["auto"],
  keys: string[],
  deals: Deal[],
  leads: Lead[],
  activities: Activity[] = [],
  period: "week" | "month" = "week"
): Record<string, number> {
  const bucketOf = period === "month" ? monthOf : weekStartOf;
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = 0;
  const actKinds = AUTO_ACTIVITY_KINDS[kind];
  if (actKinds) {
    for (const a of activities) {
      if (!actKinds.includes(a.kind)) continue;
      const d = parseDateSafe(a.date);
      if (!d) continue;
      const k = bucketOf(d);
      if (k in out) out[k]++;
    }
  } else if (kind === "leadsAdded") {
    for (const l of leads) {
      const d = parseDateSafe(l.date);
      if (!d) continue;
      const k = bucketOf(d);
      if (k in out) out[k]++;
    }
  } else if (kind === "dealsClosed") {
    for (const dl of deals) {
      if (!isClosed(dl)) continue;
      const d = parseDateSafe(dl.closedDate || dl.closeDate);
      if (!d) continue;
      const k = bucketOf(d);
      if (k in out) out[k]++;
    }
  } else if (kind === "dealsPending") {
    // Snapshot metric: how many are in contract right now — same value shown
    // for the current period only (history requires manual entries).
    out[bucketOf(new Date())] = deals.filter(isPending).length;
  }
  return out;
}

// Core prospecting rows: make sure they always exist, even for scorecards
// saved before these auto kinds existed. Existing rows with the same auto
// kind are kept (and marked locked); missing ones are appended.
export function ensureProspectingRows(
  measurables: Measurable[],
  defaults: Measurable[]
): Measurable[] {
  const out = measurables.map((m) => ({ ...m }));
  for (const def of defaults.filter((d) => d.locked)) {
    const existing = out.find((m) => m.auto === def.auto);
    if (existing) existing.locked = true;
    else out.push({ ...def });
  }
  return out;
}
