"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalEvent {
  date: string; // M/D/YYYY or YYYY-MM-DD
  label: string;
  kind: "task" | "task-done" | "closing" | "deadline" | "appt";
  href?: string; // appointments have no internal page to open
  time?: string; // "9:00 AM" for appointments
  minutes?: number; // for day-view ordering
  who?: string;
}

const KIND_STYLE: Record<CalEvent["kind"], string> = {
  task: "bg-elevate-100 text-elevate-800",
  "task-done": "bg-mist text-ink-faint line-through",
  closing: "bg-emerald-100 text-emerald-800",
  deadline: "bg-amber-100 text-amber-800",
  appt: "bg-violet-100 text-violet-800",
};

const KIND_LABEL: Record<CalEvent["kind"], string> = {
  task: "Task",
  "task-done": "Done",
  closing: "Closing",
  deadline: "Contract deadline",
  appt: "Appointment",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const sortDay = (list: CalEvent[]) =>
  [...list].sort((a, b) => {
    // timed appointments first in time order, then everything else
    const ma = a.time ? (a.minutes ?? 0) : 9999;
    const mb = b.time ? (b.minutes ?? 0) : 9999;
    return ma - mb;
  });

function EventChip({ e, big }: { e: CalEvent; big?: boolean }) {
  const cls = cn(
    big
      ? "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium"
      : "block truncate rounded px-1.5 py-0.5 text-[10.5px] font-semibold leading-tight",
    KIND_STYLE[e.kind],
    e.href && "transition hover:opacity-75"
  );
  const body = big ? (
    <>
      {e.time ? (
        <span className="flex w-16 shrink-0 items-center gap-1 text-xs font-bold">
          <Clock size={11} /> {e.time.replace(" ", "")}
        </span>
      ) : (
        <span className="w-16 shrink-0 text-xs font-semibold opacity-60">All day</span>
      )}
      <span className="min-w-0 flex-1 truncate">{e.label}</span>
      <span className="shrink-0 rounded bg-white/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
        {KIND_LABEL[e.kind]}
      </span>
    </>
  ) : (
    <>{e.time ? `${e.time.replace(" ", "").toLowerCase()} ` : ""}{e.label}</>
  );
  return e.href ? (
    <Link href={e.href} className={cls} title={e.label}>{body}</Link>
  ) : (
    <div className={cls} title={e.label}>{body}</div>
  );
}

export default function Calendar({ events }: { events: CalEvent[] }) {
  const today = new Date();
  const [view, setView] = useState<"month" | "day">("month");
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [sel, setSel] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  // Phones open on today's agenda — month cells are too small to be useful
  useEffect(() => {
    if (window.innerWidth < 640) setView("day");
  }, []);

  const first = new Date(ym.y, ym.m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const onDate = (y: number, m: number, day: number) =>
    events.filter((e) => {
      const d = new Date(e.date);
      return !isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;
    });
  const eventsFor = (day: number) => sortDay(onDate(ym.y, ym.m, day));

  const isToday = (day: number) =>
    today.getFullYear() === ym.y && today.getMonth() === ym.m && today.getDate() === day;
  const isPast = (day: number) => new Date(ym.y, ym.m, day + 1) < today && !isToday(day);

  const move = (delta: number) => {
    if (view === "month") {
      const d = new Date(ym.y, ym.m + delta, 1);
      setYm({ y: d.getFullYear(), m: d.getMonth() });
    } else {
      const d = new Date(sel);
      d.setDate(d.getDate() + delta);
      setSel(d);
      setYm({ y: d.getFullYear(), m: d.getMonth() });
    }
  };

  const openDay = (day: number) => {
    setSel(new Date(ym.y, ym.m, day));
    setView("day");
  };

  const dayEvents = sortDay(onDate(sel.getFullYear(), sel.getMonth(), sel.getDate()));
  const selIsToday =
    sel.getFullYear() === today.getFullYear() &&
    sel.getMonth() === today.getMonth() &&
    sel.getDate() === today.getDate();

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mist px-5 py-4">
        <h2 className="font-display text-lg font-bold">
          {view === "month" ? (
            <>{MONTHS[ym.m]} <span className="text-ink-faint">{ym.y}</span></>
          ) : (
            <>
              {sel.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              {selIsToday && <span className="ml-2 text-sm font-semibold text-elevate-600">today</span>}
            </>
          )}
        </h2>
        <div className="flex items-center gap-1.5">
          {/* view toggle */}
          {(["month", "day"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition",
                view === v ? "bg-ink text-white" : "border border-mist text-ink-muted hover:text-ink"
              )}
            >
              {v}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-mist" />
          <button
            onClick={() => {
              setYm({ y: today.getFullYear(), m: today.getMonth() });
              setSel(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
            }}
            className="rounded-lg border border-mist px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink"
          >
            Today
          </button>
          <button onClick={() => move(-1)} className="rounded-lg border border-mist p-1.5 text-ink-muted hover:text-ink" aria-label="Previous">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => move(1)} className="rounded-lg border border-mist p-1.5 text-ink-muted hover:text-ink" aria-label="Next">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {view === "month" ? (
        <>
          <div className="grid grid-cols-7 border-b border-mist bg-chalk/60 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {DOW.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "min-h-[92px] border-b border-r border-mist/60 p-1.5 sm:min-h-[108px]",
                  i % 7 === 0 && "border-l-0",
                  day == null && "bg-chalk/40"
                )}
              >
                {day != null && (
                  <>
                    <button
                      onClick={() => openDay(day)}
                      title="Open this day"
                      className={cn(
                        "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition hover:ring-2 hover:ring-elevate-300",
                        isToday(day) ? "bg-elevate-500 text-ink" : isPast(day) ? "text-ink-faint" : "text-ink"
                      )}
                    >
                      {day}
                    </button>
                    <div className="space-y-1">
                      {eventsFor(day).slice(0, 3).map((e, j) => (
                        <EventChip key={j} e={e} />
                      ))}
                      {eventsFor(day).length > 3 && (
                        <button
                          onClick={() => openDay(day)}
                          className="block px-1.5 text-[10px] font-semibold text-elevate-600 hover:underline"
                        >
                          +{eventsFor(day).length - 3} more
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ── Day view ── */
        <div className="p-5">
          {dayEvents.length > 0 ? (
            <div className="space-y-2">
              {dayEvents.map((e, i) => (
                <EventChip key={i} e={e} big />
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-chalk/70 px-4 py-10 text-center text-sm text-ink-faint">
              Nothing on the calendar this day.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 px-5 py-3 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-violet-300" /> Appointment</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-elevate-300" /> Task</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-emerald-300" /> Closing</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-amber-300" /> Contract deadline</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-mist" /> Done</span>
        <span className="ml-auto flex items-center gap-1 text-ink-faint">
          <CalendarDays size={11} /> Click a date to open its day
        </span>
      </div>
    </div>
  );
}
