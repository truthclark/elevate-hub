"use client";

import { useMemo, useState } from "react";
import { Deal, TaskTemplate, Checklists, ChecklistItem, DEFAULT_CHECKLISTS } from "@/lib/types";
import { fmtMoney, fmtDate, parseDateSafe, cn } from "@/lib/utils";
import { StatusBadge, Table, Td, EmptyState, Progress } from "./ui";
import { DealEditor, DEAL_STATUSES } from "./forms";
import BulkBar from "./bulk-bar";
import { SearchInput, FilterSelect, SortControl, matches } from "./table-controls";
import { bulkDeals } from "@/app/actions";

const CHECK = (v?: string) => (v ?? "").toLowerCase().startsWith("y");
const SORTS = [
  { value: "closeDate", label: "Close date" },
  { value: "address", label: "Address" },
  { value: "price", label: "Price" },
  { value: "gci", label: "GCI" },
  { value: "readiness", label: "Readiness" },
];

function readinessPct(d: Deal, items: ChecklistItem[]) {
  if (items.length === 0) return 0;
  return (items.filter((it) => CHECK(d.checklist[it.key])).length / items.length) * 100;
}

export default function ListingsTable({
  deals,
  agents,
  templates,
  gciBy,
  checklists,
}: {
  deals: Deal[];
  agents: string[];
  templates: TaskTemplate[];
  gciBy: Record<number, number | null>;
  checklists?: Checklists;
}) {
  const items = (checklists ?? DEFAULT_CHECKLISTS).Listing;
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [query, setQuery] = useState("");
  const [statusF, setStatusF] = useState("");
  const [agentF, setAgentF] = useState("");
  const [sortKey, setSortKey] = useState("closeDate");
  const [asc, setAsc] = useState(true);

  const shown = useMemo(() => {
    const out = deals.filter(
      (d) =>
        matches(query, d.address, d.name, d.agent, d.source, d.notes) &&
        (!statusF || d.status === statusF) &&
        (!agentF || d.agent === agentF)
    );
    const val = (d: Deal): string | number => {
      switch (sortKey) {
        case "address": return (d.address || d.name).toLowerCase();
        case "price": return d.price ?? -1;
        case "gci": return gciBy[d.id] ?? -1;
        case "readiness": return readinessPct(d, items);
        default: return parseDateSafe(d.closeDate)?.getTime() ?? Infinity;
      }
    };
    return out.sort((a, b) => {
      const va = val(a), vb = val(b);
      const c = va < vb ? -1 : va > vb ? 1 : 0;
      return asc ? c : -c;
    });
  }, [deals, query, statusF, agentF, sortKey, asc, gciBy, items]);

  const toggle = (id: number) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const allChecked = shown.length > 0 && shown.every((d) => selected.includes(d.id));

  if (deals.length === 0) return <EmptyState message="No active listings." />;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search listings…" className="w-56" />
        <FilterSelect value={statusF} onChange={setStatusF} options={DEAL_STATUSES} allLabel="All statuses" />
        <FilterSelect value={agentF} onChange={setAgentF} options={agents} allLabel="All agents" />
        <SortControl value={sortKey} onChange={setSortKey} asc={asc} onToggleDir={() => setAsc(!asc)} options={SORTS} />
        <span className="ml-auto text-xs text-ink-faint">{shown.length} shown · click a row to edit</span>
      </div>
      {/* Phone: tap cards with the readiness bar */}
      <div className="space-y-2 md:hidden">
        {shown.map((d) => {
          const pct = readinessPct(d, items);
          return (
            <button key={d.id} onClick={() => setEditing(d)} className="card w-full p-4 text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <a
                    href={`/deals/${d.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block truncate font-semibold text-ink hover:text-elevate-700"
                  >
                    {d.address || d.name}
                  </a>
                  {d.address && d.name && (
                    <p className="truncate text-xs text-ink-faint">{d.name}</p>
                  )}
                </div>
                <StatusBadge value={d.status || (CHECK(d.checklist.mls) ? "On Market" : "Pre-List")} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                {d.price != null && <span className="font-semibold">{fmtMoney(d.price)}</span>}
                {gciBy[d.id] != null && (
                  <span className="font-semibold text-emerald-700">{fmtMoney(gciBy[d.id])} GCI</span>
                )}
                <span className="text-ink-faint">{fmtDate(d.closeDate) || "no close date"}</span>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist">
                  <div className="h-full rounded-full bg-elevate-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-ink-muted">{pct}% ready</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden md:block">
      <div className="mb-2 flex items-center gap-2 text-xs text-ink-faint">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={() =>
            setSelected(allChecked ? [] : Array.from(new Set([...selected, ...shown.map((d) => d.id)])))
          }
          className="h-3.5 w-3.5 accent-[#05c3f9]"
          aria-label="Select all shown"
        />
        Select all shown
      </div>
      <Table headers={["", "Address", "Status", "Agent", "Price", "Comm", "GCI", "Close date", "Marketing readiness"]}>
        {shown.map((d) => {
          const pct = readinessPct(d, items);
          return (
            <tr
              key={d.id}
              onClick={() => setEditing(d)}
              className={cn("cursor-pointer hover:bg-chalk/60", selected.includes(d.id) && "bg-elevate-50/50")}
            >
              <Td className="w-8">
                <span onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.includes(d.id)}
                    onChange={() => toggle(d.id)}
                    className="h-4 w-4 accent-[#05c3f9]"
                    aria-label={`Select ${d.address || d.name}`}
                  />
                </span>
              </Td>
              <Td className="font-semibold">
                <a
                  href={`/deals/${d.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-elevate-700 hover:underline"
                  title="Open deal record"
                >
                  {d.address || d.name}
                </a>
                {d.address && d.name && (
                  <span className="block text-xs font-normal text-ink-faint">{d.name}</span>
                )}
              </Td>
              <Td><StatusBadge value={d.status || (CHECK(d.checklist.mls) ? "On Market" : "Pre-List")} /></Td>
              <Td>{d.agent || "—"}</Td>
              <Td>{fmtMoney(d.price)}</Td>
              <Td>{d.commPct != null ? `${d.commPct}%` : "—"}</Td>
              <Td className="text-emerald-700">{fmtMoney(gciBy[d.id] ?? null)}</Td>
              <Td>{fmtDate(d.closeDate)}</Td>
              <Td>
                <div className="w-36">
                  <Progress pct={pct} color={pct === 100 ? "#34d399" : "#05c3f9"} />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {items.map((it) => (
                      <span
                        key={it.key}
                        className={cn(
                          "rounded px-1 py-px text-[10px] font-semibold",
                          CHECK(d.checklist[it.key]) ? "bg-emerald-100 text-emerald-700" : "bg-mist text-ink-faint"
                        )}
                      >
                        {it.label}
                      </span>
                    ))}
                  </div>
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>
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
    </>
  );
}
