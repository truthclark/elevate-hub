"use client";

import { useMemo, useState } from "react";
import { Deal, TaskTemplate, Checklists } from "@/lib/types";
import { fmtMoney, fmtDate, parseDateSafe, cn } from "@/lib/utils";
import { StatusBadge, TypeBadge, Table, Td, EmptyState } from "./ui";
import { DealEditor, DEAL_STATUSES } from "./forms";
import { BackToLeadButton, DemoteToLeadButton } from "./convert-buttons";
import BulkBar from "./bulk-bar";
import { SearchInput, FilterSelect, SortControl, matches } from "./table-controls";
import { bulkDeals } from "@/app/actions";

const SORTS = [
  { value: "closeDate", label: "Close date" },
  { value: "name", label: "Name" },
  { value: "price", label: "Price" },
  { value: "gci", label: "GCI" },
  { value: "status", label: "Status" },
];

export default function ClientsTable({
  deals,
  agents,
  templates,
  closedView,
  gciBy,
  checklists,
}: {
  deals: Deal[];
  agents: string[];
  templates: TaskTemplate[];
  closedView?: boolean;
  gciBy: Record<number, number | null>;
  checklists?: Checklists;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [query, setQuery] = useState("");
  const [sideF, setSideF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [agentF, setAgentF] = useState("");
  const [sortKey, setSortKey] = useState("closeDate");
  const [asc, setAsc] = useState(true);

  const shown = useMemo(() => {
    let out = deals.filter(
      (d) =>
        matches(query, d.name, d.address, d.agent, d.source, d.notes, d.referredBy) &&
        (!sideF || d.side === sideF) &&
        (!statusF || d.status === statusF) &&
        (!agentF || d.agent === agentF)
    );
    const val = (d: Deal): string | number => {
      switch (sortKey) {
        case "name": return (d.name || d.address).toLowerCase();
        case "price": return d.price ?? -1;
        case "gci": return gciBy[d.id] ?? -1;
        case "status": return d.status.toLowerCase();
        default: return parseDateSafe(d.closeDate || d.closedDate)?.getTime() ?? Infinity;
      }
    };
    return out.sort((a, b) => {
      const va = val(a), vb = val(b);
      const c = va < vb ? -1 : va > vb ? 1 : 0;
      return asc ? c : -c;
    });
  }, [deals, query, sideF, statusF, agentF, sortKey, asc, gciBy]);

  const toggle = (id: number) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const allChecked = shown.length > 0 && shown.every((d) => selected.includes(d.id));

  const typeOf = (side: string) =>
    side === "Buyer" ? "Buyer" : side === "Listing" ? "Seller" : "Referral";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search clients…" className="w-56" />
        <FilterSelect value={sideF} onChange={setSideF} options={["Buyer", "Listing", "Referral"]} allLabel="All types" />
        <FilterSelect value={statusF} onChange={setStatusF} options={DEAL_STATUSES} allLabel="All statuses" />
        <FilterSelect value={agentF} onChange={setAgentF} options={agents} allLabel="All agents" />
        <SortControl value={sortKey} onChange={setSortKey} asc={asc} onToggleDir={() => setAsc(!asc)} options={SORTS} />
        <span className="ml-auto text-xs text-ink-faint">{shown.length} shown · click a row to edit</span>
      </div>

      {shown.length === 0 ? (
        <EmptyState message={deals.length === 0 ? (closedView ? "No closed clients yet." : "No active clients yet.") : "Nothing matches your search/filters."} />
      ) : (
        <>
          {/* Phone: tap cards instead of a squeezed table */}
          <div className="space-y-2 md:hidden">
            {shown.map((d) => (
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
                      {d.name || d.address}
                    </a>
                    {d.address && d.name && (
                      <p className="truncate text-xs text-ink-faint">{d.address}</p>
                    )}
                  </div>
                  <TypeBadge value={typeOf(d.side)} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <StatusBadge value={d.status} />
                  {d.price != null && <span className="font-semibold">{fmtMoney(d.price)}</span>}
                  {gciBy[d.id] != null && (
                    <span className="font-semibold text-emerald-700">{fmtMoney(gciBy[d.id])} GCI</span>
                  )}
                  <span className="text-ink-faint">
                    {fmtDate(closedView ? d.closedDate || d.closeDate : d.closeDate) || "no date"}
                  </span>
                </div>
              </button>
            ))}
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
          <Table
            headers={["", "Client", "Type", "Status", "Agent", "Price", "GCI", closedView ? "Closed" : "Close date", closedView ? "Source" : "Notes", ""]}
          >
            {shown.map((d) => (
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
                      aria-label={`Select ${d.name}`}
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
                    {d.name}
                  </a>
                  {d.address && <span className="block text-xs font-normal text-ink-faint">{d.address}</span>}
                </Td>
                <Td><TypeBadge value={typeOf(d.side)} /></Td>
                <Td><StatusBadge value={d.status} /></Td>
                <Td>{d.agent || "—"}</Td>
                <Td>{fmtMoney(d.price)}</Td>
                <Td className="text-emerald-700">{fmtMoney(gciBy[d.id] ?? null)}</Td>
                <Td>{fmtDate(closedView ? d.closedDate || d.closeDate : d.closeDate)}</Td>
                <Td className="max-w-[180px] truncate text-ink-muted">
                  {closedView ? d.source || "—" : (d.referredBy ? `Ref: ${d.referredBy}. ` : "") + (d.notes || "—")}
                </Td>
                <Td>
                  <span onClick={(e) => e.stopPropagation()}>
                    {closedView ? (
                      <BackToLeadButton id={d.id} name={d.name || d.address} />
                    ) : (
                      <DemoteToLeadButton id={d.id} name={d.name || d.address} />
                    )}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
          </div>
        </>
      )}

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
