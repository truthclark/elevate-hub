"use client";

import { useMemo, useState, useTransition } from "react";
import { Deal, Lead, TaskItem, TaskTemplate, Checklists, ChecklistItem, Side, DEFAULT_CHECKLISTS, LEAD_CHECKLIST } from "@/lib/types";
import { toggleCheck } from "@/app/actions";
import { DealEditor, LeadEditor } from "./forms";
import { StatusBadge } from "./ui";
import { cn } from "@/lib/utils";
import { Check, Minus, AlertCircle } from "lucide-react";

const CHECK = (v?: string) => (v ?? "").toLowerCase().startsWith("y");

interface Row {
  kind: "deal" | "lead";
  id: number;
  name: string;
  sub: string; // address or phone
  status: string;
  checklist: Record<string, string>;
  openTasks: number;
  overdueTasks: number;
  deal?: Deal;
  lead?: Lead;
}

function Cell({
  row,
  item,
  applicable,
}: {
  row: Row;
  item: ChecklistItem;
  applicable: boolean;
}) {
  const [local, setLocal] = useState<boolean | null>(null);
  const [, start] = useTransition();
  if (!applicable) {
    return (
      <td className="border-l border-mist/40 px-1 py-1 text-center">
        <Minus size={11} className="mx-auto text-ink-faint/30" />
      </td>
    );
  }
  const on = local ?? CHECK(row.checklist[item.key]);
  return (
    <td className="border-l border-mist/40 px-1 py-1 text-center">
      <button
        onClick={() => {
          const next = !on;
          setLocal(next); // optimistic
          const fd = new FormData();
          fd.set("kind", row.kind);
          fd.set("id", String(row.id));
          fd.set("key", item.key);
          fd.set("on", String(next));
          start(async () => { await toggleCheck(fd); });
        }}
        title={`${item.label} — click to ${on ? "uncheck" : "check"}`}
        className={cn(
          "mx-auto flex h-6 w-6 items-center justify-center rounded-md transition",
          on ? "bg-emerald-500 text-white" : "bg-mist/70 text-transparent hover:bg-elevate-100 hover:text-elevate-400"
        )}
      >
        <Check size={13} strokeWidth={3} />
      </button>
    </td>
  );
}

function Grid({
  title,
  rows,
  items,
  onOpen,
}: {
  title: string;
  rows: Row[];
  items: ChecklistItem[];
  onOpen: (r: Row) => void;
}) {
  if (rows.length === 0) return null;
  const leadKeys = new Set(LEAD_CHECKLIST.map((i) => i.key));
  return (
    <>
      <tr>
        <td colSpan={items.length + 3} className="bg-chalk/80 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
          {title} ({rows.length})
        </td>
      </tr>
      {rows.map((r) => {
        const doneCount = items.filter((it) => CHECK(r.checklist[it.key])).length;
        return (
          <tr key={`${r.kind}${r.id}`} className="border-b border-mist/50 hover:bg-chalk/40">
            <td className="sticky left-0 z-10 max-w-52 bg-white px-3 py-1.5">
              <button onClick={() => onOpen(r)} className="block w-full text-left hover:text-elevate-700">
                <span className="block truncate text-sm font-semibold">{r.name || r.sub}</span>
                <span className="block truncate text-[11px] text-ink-faint">{r.name ? r.sub : ""}</span>
              </button>
            </td>
            <td className="px-2 py-1.5"><StatusBadge value={r.status} /></td>
            {items.map((it) => (
              <Cell
                key={it.key}
                row={r}
                item={it}
                applicable={r.kind === "deal" || leadKeys.has(it.key)}
              />
            ))}
            <td className="border-l border-mist/40 px-2 py-1.5 text-center">
              {r.overdueTasks > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">
                  <AlertCircle size={10} /> {r.overdueTasks}
                </span>
              ) : r.openTasks > 0 ? (
                <span className="rounded-md bg-mist px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">{r.openTasks}</span>
              ) : (
                <span className="text-[11px] text-emerald-600">✓</span>
              )}
              <span className="ml-1 text-[10px] text-ink-faint">{doneCount}/{items.length}</span>
            </td>
          </tr>
        );
      })}
    </>
  );
}

export default function PipelineGrid({
  deals,
  leads,
  tasks,
  agents,
  templates,
  checklists,
}: {
  deals: Deal[];
  leads: Lead[];
  tasks: TaskItem[];
  agents: string[];
  templates: TaskTemplate[];
  checklists?: Checklists;
}) {
  const [tab, setTab] = useState<Side>("Buyer");
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const lists = checklists ?? DEFAULT_CHECKLISTS;

  const taskCounts = useMemo(() => {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const map = new Map<string, { open: number; overdue: number }>();
    for (const t of tasks) {
      if (t.status.toLowerCase() === "done") continue;
      const key = t.dealId != null ? `d${t.dealId}` : `n${t.relatedClient.toLowerCase()}`;
      const cur = map.get(key) ?? { open: 0, overdue: 0 };
      cur.open++;
      const due = t.dueDate ? new Date(t.dueDate) : null;
      if (due && !isNaN(due.getTime()) && due < t0) cur.overdue++;
      map.set(key, cur);
    }
    return map;
  }, [tasks]);

  const countsFor = (dealId: number | null, name: string) => {
    const byId = dealId != null ? taskCounts.get(`d${dealId}`) : undefined;
    const byName = name ? taskCounts.get(`n${name.toLowerCase()}`) : undefined;
    return {
      open: (byId?.open ?? 0) + (byName?.open ?? 0),
      overdue: (byId?.overdue ?? 0) + (byName?.overdue ?? 0),
    };
  };

  const dealRow = (d: Deal): Row => {
    const c = countsFor(d.id, d.name || d.address);
    return {
      kind: "deal", id: d.id, name: d.name, sub: d.address || d.agent, status: d.status,
      checklist: d.checklist, openTasks: c.open, overdueTasks: c.overdue, deal: d,
    };
  };
  const leadRow = (l: Lead): Row => {
    const c = countsFor(null, l.name);
    return {
      kind: "lead", id: l.id, name: l.name, sub: l.phone || l.source, status: l.followUpStatus,
      checklist: l.checklist ?? {}, openTasks: c.open, overdueTasks: c.overdue, lead: l,
    };
  };

  const isClosed = (d: Deal) => Boolean(d.closedDate) || d.status.toLowerCase() === "closed";
  const isPending = (d: Deal) =>
    !isClosed(d) && ["pending", "option", "under contract"].some((s) => d.status.toLowerCase().includes(s));
  const skipLead = (l: Lead) =>
    ["cold", "lost", "converted"].some((s) => l.followUpStatus.toLowerCase().includes(s));

  const leadType = tab === "Buyer" ? "buyer" : tab === "Listing" ? "seller" : "";
  const qualifying = leads
    .filter((l) => !l.archived && !skipLead(l) && l.type.toLowerCase() === leadType)
    .map(leadRow);
  const sideDeals = deals.filter((d) => !d.archived && d.side === tab && !isClosed(d));
  const working = sideDeals.filter((d) => !isPending(d)).map(dealRow);
  const pending = sideDeals.filter(isPending).map(dealRow);
  const items = lists[tab];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["Buyer", "Listing", "Referral"] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
              tab === s ? "bg-ink text-white" : "border border-mist bg-white text-ink-muted hover:text-ink"
            )}
          >
            {s === "Buyer" ? "Buyers" : s === "Listing" ? "Sellers" : "Referrals"}
          </button>
        ))}
        <span className="ml-auto text-xs text-ink-faint">
          Click any cell to check it off · click a name to open the full record
        </span>
      </div>

      <div className="thin-scroll overflow-x-auto rounded-xl border border-mist">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-mist bg-white text-left text-[10px] uppercase tracking-wider text-ink-faint">
              <th className="sticky left-0 z-10 bg-white px-3 py-2.5 font-semibold">Name</th>
              <th className="px-2 py-2.5 font-semibold">Status</th>
              {items.map((it) => (
                <th key={it.key} className="border-l border-mist/40 px-1.5 py-2.5 text-center font-semibold">
                  <span className="block max-w-16 truncate" title={it.label}>{it.label}</span>
                </th>
              ))}
              <th className="border-l border-mist/40 px-2 py-2.5 text-center font-semibold">Tasks</th>
            </tr>
          </thead>
          <tbody>
            <Grid title="Under contract" rows={pending} items={items}
              onOpen={(r) => r.deal && setEditingDeal(r.deal)} />
            <Grid title="Working" rows={working} items={items}
              onOpen={(r) => r.deal && setEditingDeal(r.deal)} />
            <Grid title="Qualifying (leads)" rows={qualifying} items={items}
              onOpen={(r) => r.lead && setEditingLead(r.lead)} />
            {qualifying.length + working.length + pending.length === 0 && (
              <tr><td colSpan={items.length + 3} className="px-4 py-10 text-center text-sm text-ink-faint">
                Nothing in this pipeline right now.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DealEditor deal={editingDeal} agents={agents} templates={templates} checklists={checklists} onClose={() => setEditingDeal(null)} />
      <LeadEditor lead={editingLead} agents={agents} onClose={() => setEditingLead(null)} />
    </>
  );
}
