"use client";

import { useMemo, useState } from "react";
import { Deal, TaskTemplate, Checklists } from "@/lib/types";
import { fmtMoney, fmtDate, parseDateSafe, cn } from "@/lib/utils";
import { StatusBadge, TypeBadge } from "./ui";
import { DealEditor, DEAL_STATUSES } from "./forms";
import BulkBar from "./bulk-bar";
import ShareButton from "./share-button";
import { SearchInput, FilterSelect, matches } from "./table-controls";
import { bulkDeals } from "@/app/actions";
import { ArrowUpDown, ChevronDown, CalendarClock } from "lucide-react";

interface Milestone {
  label: string;
  date: string;
  days: number | null;
  done: boolean;
}

export interface TxnRow {
  deal: Deal;
  gci: number | null;
  timeline: Milestone[];
  closed: boolean;
}

type SortKey = "name" | "closeDate" | "price" | "gci" | "status";

export default function TxnTable({
  rows,
  agents,
  templates,
  initialView,
  checklists,
}: {
  rows: TxnRow[];
  agents: string[];
  templates: TaskTemplate[];
  initialView?: string; // "pending" | "closed" (from dashboard deep links)
  checklists?: Checklists;
}) {
  const [side, setSide] = useState<string>("All");
  const [showClosed, setShowClosed] = useState(initialView === "closed");
  const [query, setQuery] = useState("");
  const [statusF, setStatusF] = useState(initialView === "pending" ? "__inContract" : "");
  const [agentF, setAgentF] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("closeDate");
  const [asc, setAsc] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<Deal | null>(null);

  const toggleSel = (id: number) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const IN_CONTRACT = ["pending", "option", "under contract"];
  const filtered = useMemo(() => {
    let out = rows.filter((r) => (showClosed ? r.closed : !r.closed));
    if (side !== "All") out = out.filter((r) => r.deal.side === side);
    out = out.filter((r) =>
      matches(query, r.deal.name, r.deal.address, r.deal.agent, r.deal.notes)
    );
    if (statusF === "__inContract")
      out = out.filter((r) => IN_CONTRACT.some((s) => r.deal.status.toLowerCase().includes(s)));
    else if (statusF) out = out.filter((r) => r.deal.status === statusF);
    if (agentF) out = out.filter((r) => r.deal.agent === agentF);
    const val = (r: TxnRow): string | number => {
      switch (sortKey) {
        case "name": return (r.deal.address || r.deal.name).toLowerCase();
        case "closeDate": return parseDateSafe(r.deal.closeDate || r.deal.closedDate)?.getTime() ?? Infinity;
        case "price": return r.deal.price ?? -1;
        case "gci": return r.gci ?? -1;
        case "status": return r.deal.status.toLowerCase();
      }
    };
    return out.sort((a, b) => {
      const va = val(a), vb = val(b);
      const c = va < vb ? -1 : va > vb ? 1 : 0;
      return asc ? c : -c;
    });
  }, [rows, side, showClosed, sortKey, asc, query, statusF, agentF]);

  const sortBtn = (key: SortKey, label: string) => (
    <button
      onClick={() => {
        if (sortKey === key) setAsc(!asc);
        else { setSortKey(key); setAsc(true); }
      }}
      className={cn(
        "flex items-center gap-1 font-semibold uppercase tracking-wider",
        sortKey === key ? "text-elevate-700" : "text-ink-faint hover:text-ink"
      )}
    >
      {label} <ArrowUpDown size={11} />
    </button>
  );

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["All", "Buyer", "Listing", "Referral"].map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
              side === s
                ? "bg-ink text-white"
                : "border border-mist bg-white text-ink-muted hover:text-ink"
            )}
          >
            {s === "All" ? "All sides" : `${s}s`}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-mist" />
        <button
          onClick={() => setShowClosed(!showClosed)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
            showClosed
              ? "bg-emerald-500 text-white"
              : "border border-mist bg-white text-ink-muted hover:text-ink"
          )}
        >
          {showClosed ? "Showing closed" : "Show closed"}
        </button>
        <span className="ml-auto text-xs text-ink-faint">
          {filtered.length} transactions · click a row to edit
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search transactions…" className="w-56" />
        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          className={cn(
            "rounded-xl border bg-white px-2.5 py-2 text-sm outline-none transition",
            statusF ? "border-elevate-400 font-semibold text-elevate-800" : "border-mist text-ink-muted"
          )}
        >
          <option value="">All statuses</option>
          <option value="__inContract">In contract (Option / UC / Pending)</option>
          {DEAL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <FilterSelect value={agentF} onChange={setAgentF} options={agents} allLabel="All agents" />
      </div>

      {/* Phone: tap cards with the countdown line */}
      <div className="space-y-2 md:hidden">
        {filtered.map((r) => {
          const d = r.deal;
          const next = r.timeline.find((m) => m.days != null && m.days >= 0);
          return (
            <button
              key={d.id}
              onClick={() => setEditing(d)}
              className="card w-full p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <a
                    href={`/deals/${d.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block truncate font-semibold text-ink hover:text-elevate-700"
                  >
                    {d.address || d.name}
                  </a>
                  <p className="text-xs text-ink-faint">
                    {fmtDate(d.closeDate || d.closedDate) || "no close date"}
                    {d.agent && ` · ${d.agent}`}
                  </p>
                </div>
                <TypeBadge value={d.side} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <StatusBadge value={d.status} />
                {d.price != null && <span className="font-semibold">{fmtMoney(d.price)}</span>}
                {r.gci != null && (
                  <span className="font-semibold text-emerald-700">{fmtMoney(r.gci)} GCI</span>
                )}
              </div>
              {next && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-elevate-700">
                  <CalendarClock size={12} /> {next.label} in {next.days}d
                </p>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-faint">No transactions match this filter.</p>
        )}
      </div>

      <div className="thin-scroll hidden overflow-x-auto md:block">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-mist text-left text-[11px]">
              <th className="w-8 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.length === filtered.length}
                  onChange={() =>
                    setSelected(selected.length === filtered.length ? [] : filtered.map((r) => r.deal.id))
                  }
                  className="h-3.5 w-3.5 accent-[#05c3f9]"
                  aria-label="Select all"
                />
              </th>
              <th className="px-3 py-2.5">{sortBtn("name", "Property / Client")}</th>
              <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-ink-faint">Side</th>
              <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-ink-faint">Agent</th>
              <th className="px-3 py-2.5">{sortBtn("closeDate", "Closing")}</th>
              <th className="px-3 py-2.5">{sortBtn("price", "Price")}</th>
              <th className="px-3 py-2.5">{sortBtn("gci", "GCI")}</th>
              <th className="px-3 py-2.5">{sortBtn("status", "Status")}</th>
              <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-ink-faint">Timeline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist/70">
            {filtered.map((r) => {
              const d = r.deal;
              const next = r.timeline.find((m) => m.days != null && m.days >= 0);
              return (
                <>
                  <tr
                    key={d.id}
                    onClick={() => setEditing(d)}
                    className={cn("cursor-pointer hover:bg-chalk/60", selected.includes(d.id) && "bg-elevate-50/50")}
                  >
                    <td className="w-8 px-3 py-3">
                      <span onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.includes(d.id)}
                          onChange={() => toggleSel(d.id)}
                          className="h-4 w-4 accent-[#05c3f9]"
                          aria-label={`Select ${d.address || d.name}`}
                        />
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <a
                        href={`/deals/${d.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-elevate-700 hover:underline"
                        title="Open deal record"
                      >
                        {d.address || d.name}
                      </a>
                    </td>
                    <td className="px-3 py-3"><TypeBadge value={d.side} /></td>
                    <td className="px-3 py-3">{d.agent || "—"}</td>
                    <td className="px-3 py-3 font-medium">{fmtDate(d.closeDate || d.closedDate)}</td>
                    <td className="px-3 py-3">{fmtMoney(d.price)}</td>
                    <td className="px-3 py-3 text-emerald-700">{fmtMoney(r.gci)}</td>
                    <td className="px-3 py-3"><StatusBadge value={d.status} /></td>
                    <td className="px-3 py-3">
                      {r.timeline.length > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(expanded === d.id ? null : d.id);
                          }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-elevate-700 hover:underline"
                        >
                          {next ? (
                            <><CalendarClock size={13} /> {next.label} in {next.days}d</>
                          ) : (
                            "View dates"
                          )}
                          <ChevronDown size={13} className={cn("transition", expanded === d.id && "rotate-180")} />
                        </button>
                      ) : (
                        <span className="text-xs text-ink-faint">No dates yet</span>
                      )}
                    </td>
                  </tr>
                  {expanded === d.id && r.timeline.length > 0 && (
                    <tr key={`${d.id}-tl`} className="bg-chalk/50">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="mb-3 flex items-center gap-3">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                            Share with client
                          </span>
                          <ShareButton dealId={d.id} token={d.shareToken} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {r.timeline.map((m) => (
                            <span
                              key={m.label}
                              className={cn(
                                "chip",
                                m.done
                                  ? "bg-mist text-ink-faint line-through"
                                  : m.days != null && m.days <= 3
                                    ? "bg-rose-100 text-rose-700"
                                    : m.days != null && m.days <= 7
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-elevate-100 text-elevate-800"
                              )}
                            >
                              {m.label}: {fmtDate(m.date)}
                              {!m.done && m.days != null && ` (${m.days}d)`}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-faint">
            No transactions match this filter.
          </p>
        )}
      </div>

      <DealEditor deal={editing} agents={agents} templates={templates} checklists={checklists} onClose={() => setEditing(null)} />
      <BulkBar
        ids={selected}
        onClear={() => setSelected([])}
        statusOptions={DEAL_STATUSES}
        statusLabel="Set status"
        agents={agents}
        action={bulkDeals}
      />
    </div>
  );
}
