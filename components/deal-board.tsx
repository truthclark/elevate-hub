"use client";

// Kanban board: deals as cards, stages as columns, drag to move.
// Dropping into Closed gets the confetti it deserves.

import { useMemo, useState, useTransition } from "react";
import { Deal, TeamMember } from "@/lib/types";
import { patchDealStatus } from "@/app/actions";
import { fireConfetti } from "@/lib/confetti";
import { fmtMoney, fmtDate, daysUntil, initialsOf, cn } from "@/lib/utils";
import { Avatar, TypeBadge } from "./ui";
import { CalendarClock, GripVertical } from "lucide-react";

const STAGES = ["Active", "Showing", "Under Contract", "Option", "Pending", "Closed"] as const;

const STAGE_TINT: Record<string, string> = {
  Active: "border-t-elevate-400",
  Showing: "border-t-sky-400",
  "Under Contract": "border-t-amber-400",
  Option: "border-t-orange-400",
  Pending: "border-t-violet-400",
  Closed: "border-t-emerald-400",
};

export default function DealBoard({
  deals,
  team,
}: {
  deals: Deal[];
  team: TeamMember[];
}) {
  // Optimistic status overrides so drags feel instant
  const [moved, setMoved] = useState<Record<number, string>>({});
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [, startAction] = useTransition();

  const statusOf = (d: Deal) => moved[d.id] ?? d.status;
  const byStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of STAGES) map[s] = [];
    for (const d of deals) {
      const s = STAGES.find((x) => statusOf(d).toLowerCase() === x.toLowerCase());
      if (s) map[s].push(d);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, moved]);

  const other = deals.filter(
    (d) => !STAGES.some((x) => statusOf(d).toLowerCase() === x.toLowerCase())
  );

  const memberColor = (name: string) =>
    team.find((m) => m.name.toLowerCase() === name.toLowerCase());

  const drop = (stage: string) => {
    setOverCol(null);
    if (dragId == null) return;
    const deal = deals.find((d) => d.id === dragId);
    setDragId(null);
    if (!deal || statusOf(deal) === stage) return;
    setMoved((cur) => ({ ...cur, [deal.id]: stage }));
    if (stage === "Closed") fireConfetti();
    const fd = new FormData();
    fd.set("id", String(deal.id));
    fd.set("status", stage);
    startAction(async () => {
      await patchDealStatus(fd);
    });
  };

  return (
    <div>
      {/* Board fits the window; columns scroll inside themselves, so the
          horizontal scrollbar is always visible without scrolling down. */}
      <div className="thin-scroll -mx-1 flex max-h-[calc(100dvh-230px)] min-h-72 snap-x gap-3 overflow-x-auto px-1 pb-2">
        {STAGES.map((stage) => {
          const cards = byStage[stage];
          const vol = cards.reduce((s, d) => s + (d.price ?? 0), 0);
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(stage);
              }}
              onDragLeave={() => setOverCol((c) => (c === stage ? null : c))}
              onDrop={() => drop(stage)}
              className={cn(
                "flex max-h-full w-64 shrink-0 snap-start flex-col rounded-2xl border border-t-4 bg-chalk/70 transition-colors sm:w-72",
                STAGE_TINT[stage],
                overCol === stage && dragId != null
                  ? "border-elevate-300 bg-elevate-50/60"
                  : "border-mist/70"
              )}
            >
              <div className="flex shrink-0 items-baseline justify-between px-3.5 pb-1 pt-3">
                <p className="font-display text-[13px] font-bold">{stage}</p>
                <p className="text-[11px] font-semibold text-ink-faint">
                  {cards.length}
                  {vol > 0 && ` · ${fmtMoney(vol, true)}`}
                </p>
              </div>
              <div className="thin-scroll flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto p-2">
                {cards.map((d) => {
                  const m = memberColor(d.agent);
                  const days = daysUntil(d.closeDate);
                  return (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={() => setDragId(d.id)}
                      onDragEnd={() => setDragId(null)}
                      className={cn(
                        "group cursor-grab rounded-xl border border-mist/70 bg-white p-3 shadow-card transition hover:shadow-card-hover active:cursor-grabbing",
                        dragId === d.id && "opacity-40 ring-2 ring-elevate-300"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical size={13} className="mt-0.5 shrink-0 text-ink-faint/40 group-hover:text-ink-faint" />
                        <div className="min-w-0 flex-1">
                          <a
                            href={`/deals/${d.id}`}
                            className="block truncate text-[13.5px] font-semibold leading-snug hover:text-elevate-700"
                          >
                            {d.name || d.address}
                          </a>
                          {d.address && d.name && (
                            <p className="truncate text-[11px] text-ink-faint">{d.address}</p>
                          )}
                        </div>
                        <TypeBadge value={d.side} />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 pl-5">
                        <span className="text-[12.5px] font-bold">
                          {d.price != null ? fmtMoney(d.price, true) : "—"}
                        </span>
                        <span className="flex items-center gap-2">
                          {d.closeDate && stage !== "Closed" && (
                            <span
                              className={cn(
                                "flex items-center gap-1 text-[10.5px] font-semibold",
                                days != null && days <= 7 ? "text-rose-600" : "text-ink-faint"
                              )}
                            >
                              <CalendarClock size={10} />
                              {days != null && days >= 0 ? `${days}d` : fmtDate(d.closeDate)}
                            </span>
                          )}
                          {m && (
                            <Avatar initials={initialsOf(m.name)} color={m.color} size={20} photo={m.photo} />
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <p className="rounded-xl border border-dashed border-mist py-6 text-center text-[11px] text-ink-faint">
                    Drop a deal here
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-ink-faint">
        Drag a card to move it through the pipeline · click a name to open the record
        {other.length > 0 && ` · ${other.length} deal${other.length === 1 ? "" : "s"} with other statuses (On Hold, Lost, Referred) live in the table views`}
      </p>
    </div>
  );
}
