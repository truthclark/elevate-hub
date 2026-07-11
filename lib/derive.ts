import { store, isDemoMode } from "./store";
import { Alert, AppData, Brokerage, Deal, TaskItem, Targets } from "./types";
import { daysUntil, parseDateSafe } from "./utils";

export async function getAppData(): Promise<AppData> {
  const [deals, leads, tasks, team, settings] = await Promise.all([
    store.listDeals(),
    store.listLeads(),
    store.listTasks(),
    store.listTeam(),
    store.getSettings(),
  ]);
  // Archived records are hidden everywhere except the /archive page
  return {
    deals: deals.filter((d) => !d.archived),
    leads: leads.filter((l) => !l.archived),
    tasks,
    team,
    settings,
    demoMode: isDemoMode,
  };
}

// ── Money helpers ────────────────────────────────────────────────
export function dealGci(d: Deal): number | null {
  if (d.gci != null) return d.gci;
  if (d.price != null && d.commPct != null) {
    const gross = d.price * (d.commPct / 100);
    const net = d.referralPct != null ? gross * (1 - d.referralPct / 100) : gross;
    return Math.round(net * 100) / 100;
  }
  return null;
}

export const isClosed = (d: Deal) =>
  Boolean(d.closedDate) || d.status.toLowerCase() === "closed";
export const isPending = (d: Deal) =>
  !isClosed(d) &&
  ["pending", "option", "under contract"].some((s) =>
    d.status.toLowerCase().includes(s)
  );
export const isActive = (d: Deal) =>
  !isClosed(d) && !["lost", "on hold"].includes(d.status.toLowerCase());

// ── Pipeline stats ───────────────────────────────────────────────
export function pipelineStats(deals: Deal[], targets: Targets) {
  const scoped = deals.filter((d) => d.side !== "Referral");
  const closed = scoped.filter(isClosed);
  const pending = scoped.filter(isPending);
  const sum = (list: Deal[], f: (d: Deal) => number | null) =>
    list.reduce((s, d) => s + (f(d) ?? 0), 0);

  const q = (d: Deal) => {
    const dt = parseDateSafe(d.closedDate || d.closeDate);
    return dt ? Math.floor(dt.getMonth() / 3) : null;
  };
  const quarters = [0, 1, 2, 3].map((i) => ({
    period: `Q${i + 1}`,
    target: [targets.q1, targets.q2, targets.q3, targets.q4][i],
    closed: closed.filter((d) => q(d) === i).length,
    pending: pending.filter((d) => q(d) === i).length,
  }));

  return {
    unitsClosed: closed.length,
    unitsPending: pending.length,
    annualTarget: targets.annual,
    quarters,
    volume: {
      closed: sum(closed, (d) => d.price),
      pending: sum(pending, (d) => d.price),
    },
    gci: {
      closed: sum(closed, dealGci),
      pending: sum(pending, dealGci),
    },
    pipelineVolume: sum(scoped.filter(isActive), (d) => d.price),
    pipelineGci: sum(scoped.filter(isActive), dealGci),
  };
}

// ── GCI waterfall: gross → referral out → net → split → team net ──
export interface GciRow {
  id: number;
  name: string;
  closedDate: string;
  gross: number;
  referralOut: number;
  netGci: number;
  brokerSplit: number;
  fees: number; // per-transaction brokerage fees (CBR, post-cap transaction fee, …)
  teamNet: number;
}

// Start of the cap year containing `d` (e.g. reset May 1: Apr 2026 → May 1 2025)
export function capYearStart(d: Date, brokerage: Brokerage): Date {
  const m = (brokerage.capResetMonth ?? 1) - 1;
  const day = brokerage.capResetDay ?? 1;
  const thisYearReset = new Date(d.getFullYear(), m, day);
  return d >= thisYearReset
    ? thisYearReset
    : new Date(d.getFullYear() - 1, m, day);
}

// Pass ALL deals (not year-filtered): the cap year can span calendar years,
// so earlier closings decide whether later ones are pre- or post-cap.
// `year` filters the returned rows/totals to that calendar year.
export function gciWaterfall(deals: Deal[], brokerage: Brokerage, year?: number) {
  // Referral-side deals count too: the referral fee received is team income
  // (split, cap, and fees all apply — per Settings-level policy).
  const closed = deals
    .filter((d) => isClosed(d) && !d.archived)
    .sort((a, b) => {
      const da = parseDateSafe(a.closedDate || a.closeDate)?.getTime() ?? 0;
      const db = parseDateSafe(b.closedDate || b.closeDate)?.getTime() ?? 0;
      return da - db;
    });

  const fees = brokerage.fees ?? [];
  const paidByCapYear: Record<string, number> = {};
  let brokerPaid = 0; // running total within the current cap year
  let currentCapKey = "";

  const allRows: GciRow[] = closed.map((d) => {
    const when = parseDateSafe(d.closedDate || d.closeDate) ?? new Date();
    const capKey = capYearStart(when, brokerage).toISOString().slice(0, 10);
    if (capKey !== currentCapKey) {
      currentCapKey = capKey;
      brokerPaid = paidByCapYear[capKey] ?? 0;
    }
    // Referral-side deal: the fee received IS the gross (nothing goes out).
    const isRef = d.side === "Referral";
    const gross = isRef
      ? (d.gci ?? 0)
      : d.price != null && d.commPct != null
        ? d.price * (d.commPct / 100)
        : (d.gci ?? 0) / (d.referralPct != null ? 1 - d.referralPct / 100 : 1);
    const referralOut = isRef ? 0 : d.referralPct != null ? gross * (d.referralPct / 100) : 0;
    const netGci = gross - referralOut;
    const cappedBefore = brokerPaid >= brokerage.annualCap - 0.01;
    const remainingCap = Math.max(0, brokerage.annualCap - brokerPaid);
    const brokerSplit = Math.min(netGci * (brokerage.splitPct / 100), remainingCap);
    brokerPaid += brokerSplit;
    paidByCapYear[capKey] = brokerPaid;
    const feeTotal =
      fees.reduce((s, f) => {
        const applies =
          f.timing === "always" ||
          (cappedBefore ? f.timing === "afterCap" : f.timing === "beforeCap");
        if (!applies) return s;
        // pct fees are a % of this deal's net GCI (e.g. 5% equity contribution)
        return s + (f.kind === "pct" ? netGci * (f.amount / 100) : f.amount);
      }, 0) +
      // One-off adjustments on the deal itself (buyer credits, one-time fees)
      (d.adjustments ?? []).reduce((s, a) => s + (a.amount || 0), 0);
    const r = (n: number) => Math.round(n * 100) / 100;
    return {
      id: d.id,
      name: d.address || d.name,
      closedDate: d.closedDate || d.closeDate,
      gross: r(gross),
      referralOut: r(referralOut),
      netGci: r(netGci),
      brokerSplit: r(brokerSplit),
      fees: r(feeTotal),
      teamNet: r(netGci - brokerSplit - feeTotal),
    };
  });

  const rows =
    year != null
      ? allRows.filter((row) => parseDateSafe(row.closedDate)?.getFullYear() === year)
      : allRows;

  const sum = (f: (r: GciRow) => number) =>
    Math.round(rows.reduce((s, r) => s + f(r), 0) * 100) / 100;

  // Cap status for the cap year that matters for this report: the one
  // containing today (or the end of a past reporting year).
  const now = new Date();
  const refDate =
    year != null && year < now.getFullYear() ? new Date(year, 11, 31) : now;
  const refKey = capYearStart(refDate, brokerage).toISOString().slice(0, 10);
  const refPaid = paidByCapYear[refKey] ?? 0;

  return {
    rows,
    totals: {
      gross: sum((r) => r.gross),
      referralOut: sum((r) => r.referralOut),
      netGci: sum((r) => r.netGci),
      brokerSplit: sum((r) => r.brokerSplit),
      fees: sum((r) => r.fees),
      teamNet: sum((r) => r.teamNet),
    },
    capReached: refPaid >= brokerage.annualCap - 0.01,
    brokerPaid: Math.round(refPaid * 100) / 100,
    capResetLabel: `${new Date(2000, (brokerage.capResetMonth ?? 1) - 1, brokerage.capResetDay ?? 1).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
  };
}

// Team net GCI for deals closed in a given month (for the P&L)
export function monthlyTeamNet(deals: Deal[], brokerage: Brokerage, ym: string): number {
  const { rows } = gciWaterfall(deals, brokerage);
  return Math.round(
    rows
      .filter((r) => {
        const d = parseDateSafe(r.closedDate);
        if (!d) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === ym;
      })
      .reduce((s, r) => s + r.teamNet, 0) * 100
  ) / 100;
}

// ── TC deadline timeline ─────────────────────────────────────────
export interface Milestone {
  label: string;
  date: string;
  days: number | null; // negative = past
  done: boolean;
}

export function dealTimeline(d: Deal): Milestone[] {
  const items: [string, string][] = [
    ["Contract", d.contractDate],
    ["Option ends", d.optionDeadline],
    ["Inspection", d.inspDate],
    ["Financing", d.financingDeadline],
    ["Appraisal", d.appraisalDeadline],
    ["Closing", d.closeDate],
  ];
  return items
    .filter(([, date]) => date)
    .map(([label, date]) => {
      const days = daysUntil(date);
      return { label, date, days, done: days != null && days < 0 };
    });
}

// ── Alerts (in-app notifications) ───────────────────────────────
export function buildAlerts(deals: Deal[], tasks: TaskItem[]): Alert[] {
  const alerts: Alert[] = [];

  for (const t of tasks) {
    if (t.status.toLowerCase() === "done") continue;
    const days = daysUntil(t.dueDate);
    if (days != null && days < 0)
      alerts.push({
        severity: "red",
        label: `Overdue: ${t.task}`,
        detail: `${t.assignedTo || "Unassigned"} · due ${t.dueDate}`,
        href: "/tasks",
      });
    else if (days === 0)
      alerts.push({
        severity: "amber",
        label: `Due today: ${t.task}`,
        detail: t.assignedTo || "Unassigned",
        href: "/tasks",
      });
  }

  for (const d of deals) {
    if (isClosed(d) || d.side === "Referral") continue;
    const label = d.address || d.name;
    const checks: [string, string, number][] = [
      ["Option ends", d.optionDeadline, 3],
      ["Financing deadline", d.financingDeadline, 5],
      ["Appraisal deadline", d.appraisalDeadline, 5],
      ["Closing", d.closeDate, 7],
    ];
    for (const [what, date, window] of checks) {
      const days = daysUntil(date);
      if (days != null && days >= 0 && days <= window)
        alerts.push({
          severity: days <= 1 ? "red" : "amber",
          label: `${what} in ${days}d — ${label}`,
          detail: `${d.side} · ${d.status}`,
          href: "/deals?view=contract",
        });
    }
    const close = daysUntil(d.closeDate);
    if (
      close != null &&
      close >= 0 &&
      close <= 10 &&
      !(d.checklist.tcSetup ?? "").toLowerCase().startsWith("y")
    )
      alerts.push({
        severity: "red",
        label: `TC not set up — ${label}`,
        detail: `Closes in ${close}d`,
        href: "/deals?view=contract",
      });
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "red" ? -1 : 1));
}

// ── Task buckets ─────────────────────────────────────────────────
export function taskBuckets(tasks: TaskItem[]) {
  const open = tasks.filter((t) => t.status.toLowerCase() !== "done");
  const withDays = open.map((t) => ({ ...t, days: daysUntil(t.dueDate) }));
  return {
    overdue: withDays.filter((t) => t.days != null && t.days < 0),
    dueToday: withDays.filter((t) => t.days === 0),
    upcoming: withDays.filter((t) => t.days == null || t.days > 0),
    open,
  };
}

// ── Template application ─────────────────────────────────────────
export function templateTasks(
  d: Deal,
  templateId: string,
  templates: AppData["settings"]["templates"],
  team: AppData["team"]
): Omit<TaskItem, "id">[] {
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl) return [];
  const anchorDate = (anchor: string): Date => {
    if (anchor === "contract" && d.contractDate) {
      return parseDateSafe(d.contractDate) ?? new Date();
    }
    if (anchor === "close" && d.closeDate) {
      return parseDateSafe(d.closeDate) ?? new Date();
    }
    return new Date();
  };
  // Assignment rule: the deal's own agent wins if they hold the role;
  // otherwise the first active member who holds it.
  const byRole = (role: string) => {
    const holders = team.filter(
      (m) => m.active && m.role.toLowerCase().includes(role.toLowerCase())
    );
    const dealAgent = holders.find(
      (m) => m.name.toLowerCase() === d.agent.toLowerCase()
    );
    return (dealAgent ?? holders[0])?.name ?? "";
  };
  return tpl.items.map((it) => {
    const base = anchorDate(it.anchor);
    const due = new Date(base.getTime() + it.offsetDays * 86_400_000);
    return {
      task: it.title,
      dueDate: due.toLocaleDateString("en-US"),
      assignedTo: it.assignRole ? byRole(it.assignRole) : d.agent,
      priority: "Medium",
      relatedClient: d.address || d.name,
      status: "Open",
      notes: `Auto: ${tpl.name}`,
      dealId: d.id,
      // provenance — lets due dates re-flow if the deal's dates change
      anchor: it.anchor,
      offsetDays: it.offsetDays,
    };
  });
}

// When a deal's contract/close date changes, template-generated tasks that
// are still open re-anchor to the new date. Returns the tasks to update.
export function reflowTasks(
  deal: Deal,
  tasks: TaskItem[]
): { id: number; dueDate: string }[] {
  const updates: { id: number; dueDate: string }[] = [];
  for (const t of tasks) {
    if (t.dealId !== deal.id) continue;
    if (t.status.toLowerCase() === "done") continue;
    if (!t.anchor || t.anchor === "created" || t.offsetDays == null) continue;
    const baseStr = t.anchor === "contract" ? deal.contractDate : deal.closeDate;
    const base = parseDateSafe(baseStr);
    if (!base) continue;
    const due = new Date(base.getTime() + t.offsetDays * 86_400_000).toLocaleDateString("en-US");
    if (due !== t.dueDate) updates.push({ id: t.id, dueDate: due });
  }
  return updates;
}
