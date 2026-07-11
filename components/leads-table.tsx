"use client";

import { useState } from "react";
import { Lead } from "@/lib/types";
import { fmtDate, cn } from "@/lib/utils";
import { StatusBadge, TypeBadge, Table, Td, EmptyState } from "./ui";
import { LeadEditor } from "./forms";
import { ConvertLeadButton } from "./convert-buttons";
import BulkBar from "./bulk-bar";
import { SearchInput, FilterSelect, SortControl, matches } from "./table-controls";
import { parseDateSafe } from "@/lib/utils";
import { useMemo } from "react";
import { bulkLeads } from "@/app/actions";

const FOLLOW_UPS = ["New — needs first call", "Hot — consult booked", "Warm — CMA sent", "Nurture", "Cold", "Converted", "Lost"];
const SORTS = [
  { value: "date", label: "Date added" },
  { value: "name", label: "Name" },
  { value: "lastContact", label: "Last contact" },
  { value: "followUpStatus", label: "Follow-up" },
];

export default function LeadsTable({ leads, agents }: { leads: Lead[]; agents: string[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [query, setQuery] = useState("");
  const [typeF, setTypeF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [agentF, setAgentF] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [asc, setAsc] = useState(false);

  const shown = useMemo(() => {
    const out = leads.filter(
      (l) =>
        matches(query, l.name, l.phone, l.email, l.area, l.source, l.notes) &&
        (!typeF || l.type === typeF) &&
        (!statusF || l.followUpStatus === statusF) &&
        (!agentF || l.agent === agentF)
    );
    const val = (l: Lead): string | number => {
      switch (sortKey) {
        case "name": return l.name.toLowerCase();
        case "lastContact": return parseDateSafe(l.lastContact)?.getTime() ?? 0;
        case "followUpStatus": return l.followUpStatus.toLowerCase();
        default: return parseDateSafe(l.date)?.getTime() ?? 0;
      }
    };
    return out.sort((a, b) => {
      const va = val(a), vb = val(b);
      const c = va < vb ? -1 : va > vb ? 1 : 0;
      return asc ? c : -c;
    });
  }, [leads, query, typeF, statusF, agentF, sortKey, asc]);

  const toggle = (id: number) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const allChecked = shown.length > 0 && shown.every((l) => selected.includes(l.id));

  if (leads.length === 0)
    return <EmptyState message="No leads yet — add your first with the button above." />;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search leads…" className="w-48" />
        <FilterSelect value={typeF} onChange={setTypeF} options={["Buyer", "Seller", "Investor", "VA"]} allLabel="All types" />
        <FilterSelect value={statusF} onChange={setStatusF} options={FOLLOW_UPS} allLabel="All follow-ups" />
        <FilterSelect value={agentF} onChange={setAgentF} options={agents} allLabel="All agents" />
        <SortControl value={sortKey} onChange={setSortKey} asc={asc} onToggleDir={() => setAsc(!asc)} options={SORTS} />
      </div>
      {/* Phone: tap cards instead of a squeezed table */}
      <div className="space-y-2 md:hidden">
        {shown.map((l) => (
          <button
            key={l.id}
            onClick={() => setEditing(l)}
            className="card w-full p-4 text-left"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{l.name}</p>
                {l.phone && (
                  <a
                    href={`tel:${l.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-medium text-elevate-600"
                  >
                    {l.phone}
                  </a>
                )}
              </div>
              <TypeBadge value={l.type} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
              <StatusBadge value={l.followUpStatus} />
              {l.budget && <span>{l.budget}</span>}
              {l.area && <span>{l.area}</span>}
              <span className="text-ink-faint">
                {l.lastContact ? `Last: ${fmtDate(l.lastContact)}` : "Never contacted"}
              </span>
            </div>
            {l.followUpStatus.toLowerCase() !== "converted" && (
              <span className="mt-2.5 block" onClick={(e) => e.stopPropagation()}>
                <ConvertLeadButton id={l.id} name={l.name} />
              </span>
            )}
          </button>
        ))}
        {shown.length === 0 && <EmptyState message="Nothing matches your filters." />}
      </div>

      <div className="hidden md:block">
      <div className="mb-2 flex items-center gap-2 text-xs text-ink-faint">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={() =>
            setSelected(allChecked ? [] : Array.from(new Set([...selected, ...shown.map((l) => l.id)])))
          }
          className="h-3.5 w-3.5 accent-[#05c3f9]"
          aria-label="Select all shown"
        />
        Select all shown · {shown.length} of {leads.length} · click a row to edit
      </div>
      <Table headers={["", "Name", "Type", "Source", "Timeline", "Budget", "Area", "Agent", "Follow-up", "Last contact", ""]}>
        {shown.map((l) => (
          <tr
            key={l.id}
            onClick={() => setEditing(l)}
            className={cn("cursor-pointer hover:bg-chalk/60", selected.includes(l.id) && "bg-elevate-50/50")}
          >
            <Td className="w-8">
              <span onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.includes(l.id)}
                  onChange={() => toggle(l.id)}
                  className="h-4 w-4 accent-[#05c3f9]"
                  aria-label={`Select ${l.name}`}
                />
              </span>
            </Td>
            <Td>
              <p className="font-semibold">{l.name}</p>
              <p className="text-xs text-ink-faint">{l.phone}</p>
            </Td>
            <Td><TypeBadge value={l.type} /></Td>
            <Td>{l.source || "—"}</Td>
            <Td>{l.timeline || "—"}</Td>
            <Td>{l.budget || "—"}</Td>
            <Td>{l.area || "—"}</Td>
            <Td>{l.agent || "—"}</Td>
            <Td><StatusBadge value={l.followUpStatus} /></Td>
            <Td>{l.lastContact ? fmtDate(l.lastContact) : "Never"}</Td>
            <Td>
              <span onClick={(e) => e.stopPropagation()}>
                {l.followUpStatus.toLowerCase() !== "converted" && (
                  <ConvertLeadButton id={l.id} name={l.name} />
                )}
              </span>
            </Td>
          </tr>
        ))}
      </Table>
      </div>

      <LeadEditor lead={editing} agents={agents} onClose={() => setEditing(null)} />
      <BulkBar
        ids={selected}
        onClear={() => setSelected([])}
        statusOptions={FOLLOW_UPS}
        statusLabel="Set follow-up"
        agents={agents}
        action={bulkLeads}
      />
    </>
  );
}
