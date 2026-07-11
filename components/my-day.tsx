"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { TaskItem, TeamMember } from "@/lib/types";
import { saveTask, toggleTask, patchTask, reorderTasks } from "@/app/actions";
import { fireConfetti } from "@/lib/confetti";
import { fmtDate, parseDateSafe, initialsOf, cn } from "@/lib/utils";
import { Avatar } from "./ui";
import { TaskModal, EditIcon } from "./forms";
import type { CalEvent } from "@/lib/ics";
import {
  Check, Plus, Loader2, Sun, AlertCircle, ChevronLeft, ChevronRight,
  Flag, GripVertical, Clock, CalendarDays, Undo2, ArrowDownToLine, Repeat,
} from "lucide-react";

// ── date helpers ─────────────────────────────────────────────────
const p2 = (x: number) => String(x).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const taskIso = (t: TaskItem) => { const d = parseDateSafe(t.dueDate); return d ? isoOf(d) : ""; };

const PRIORITY_STYLE: Record<string, string> = {
  high: "text-rose-500",
  medium: "text-amber-500",
  low: "text-ink-faint",
};
const NEXT_PRIORITY: Record<string, string> = { High: "Medium", Medium: "Low", Low: "High" };

// Smart quick-add: "call Marcus tomorrow !high" → date + priority parsed out
const DOW = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function parseQuickAdd(raw: string, baseIso: string): { title: string; dueIso: string; priority: string } {
  let title = raw.trim();
  let dueIso = baseIso;
  let priority = "Medium";
  const pri = title.match(/\s*!(high|med(?:ium)?|low)\b/i);
  if (pri) {
    priority = pri[1].toLowerCase().startsWith("h") ? "High" : pri[1].toLowerCase().startsWith("l") ? "Low" : "Medium";
    title = title.replace(pri[0], " ");
  }
  const today = dayStart(new Date());
  const tom = title.match(/\s+\b(tomorrow|tmr)\b/i);
  const tod = title.match(/\s+\btoday\b/i);
  if (tom) { dueIso = isoOf(addDays(today, 1)); title = title.replace(tom[0], " "); }
  else if (tod) { dueIso = isoOf(today); title = title.replace(tod[0], " "); }
  else {
    for (let i = 0; i < 7; i++) {
      const re = new RegExp(`\\s+\\b(${DOW[i]}|${DOW[i].slice(0, 3)})\\b\\s*$`, "i");
      const m = title.match(re);
      if (m) {
        let diff = (i - today.getDay() + 7) % 7;
        if (diff === 0) diff = 7;
        dueIso = isoOf(addDays(today, diff));
        title = title.replace(m[0], " ");
        break;
      }
    }
  }
  return { title: title.replace(/\s{2,}/g, " ").trim(), dueIso, priority };
}

function sortDay(list: TaskItem[]): TaskItem[] {
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...list].sort((a, b) => {
    const sa = a.sortOrder || 9999, sb = b.sortOrder || 9999;
    if (sa !== sb) return sa - sb;
    // timed tasks first, in time order; then by priority
    const ta = a.dueTime || "99:99", tb = b.dueTime || "99:99";
    if (ta !== tb) return ta < tb ? -1 : 1;
    return (rank[a.priority.toLowerCase()] ?? 1) - (rank[b.priority.toLowerCase()] ?? 1);
  });
}

// "14:30" → "2:30pm"
function fmtTime(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h)) return "";
  const ampm = h >= 12 ? "pm" : "am";
  const hr = h % 12 || 12;
  return `${hr}:${String(m ?? 0).padStart(2, "0")}${ampm}`;
}

// ── component ────────────────────────────────────────────────────
export default function MyDay({
  tasks,
  team,
  defaultPerson,
  events = [],
}: {
  tasks: TaskItem[];
  team: TeamMember[];
  defaultPerson?: string;
  events?: CalEvent[];
}) {
  const members = team.filter((m) => m.active);
  const [person, setPerson] = useState(
    defaultPerson && members.some((m) => m.name === defaultPerson) ? defaultPerson : ""
  );
  const [view, setView] = useState<"day" | "week">("day");
  const [offset, setOffset] = useState(0); // days (day view) or weeks (week view)
  const [adding, startAdd] = useTransition();
  const [, startAction] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dayOrder, setDayOrder] = useState<number[] | null>(null);
  const [undo, setUndo] = useState<{ id: number; title: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>();

  const todayIso = isoOf(new Date());
  const selDate = addDays(dayStart(new Date()), view === "day" ? offset : 0);
  const selIso = isoOf(selDate);

  // reset drag order when the underlying data or day changes
  useEffect(() => { setDayOrder(null); }, [tasks, selIso, person]);

  const mine = useMemo(
    () => tasks.filter((t) => !person || t.assignedTo.toLowerCase() === person.toLowerCase()),
    [tasks, person]
  );
  const open = useMemo(() => mine.filter((t) => t.status.toLowerCase() !== "done"), [mine]);

  // Day view lists
  const overdue = useMemo(
    () => (selIso === todayIso ? open.filter((t) => { const i = taskIso(t); return i && i < todayIso; })
      .sort((a, b) => (taskIso(a) < taskIso(b) ? -1 : 1)) : []),
    [open, selIso, todayIso]
  );
  const dueSel = useMemo(() => sortDay(open.filter((t) => taskIso(t) === selIso)), [open, selIso]);
  const doneSel = mine.filter((t) => t.status.toLowerCase() === "done" && taskIso(t) === selIso);

  const baseList = [...overdue, ...dueSel];
  const list = dayOrder
    ? (dayOrder.map((id) => baseList.find((t) => t.id === id)).filter(Boolean) as TaskItem[])
    : baseList;

  const total = baseList.length + doneSel.length;
  const pct = total > 0 ? Math.round((doneSel.length / total) * 100) : 0;

  const dayEvents = events.filter(
    (e) => e.date === selIso && (!person || e.who.toLowerCase() === person.toLowerCase())
  );

  // Week view
  const monday = addDays(dayStart(new Date()), -((new Date().getDay() + 6) % 7) + (view === "week" ? offset * 7 : 0));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const complete = (t: TaskItem) => {
    // Last open task of the day — celebrate the cleared board
    if (baseList.length === 1 && selIso === todayIso) fireConfetti(55);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ id: t.id, title: t.task });
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
    const fd = new FormData();
    fd.set("id", String(t.id)); fd.set("done", "true");
    startAction(async () => { await toggleTask(fd); });
  };

  const patch = (id: number, key: string, value: string) => {
    const fd = new FormData();
    fd.set("id", String(id)); fd.set(key, value);
    startAction(async () => { await patchTask(fd); });
  };

  const quickAdd = (raw: string) => {
    const parsed = parseQuickAdd(raw, selIso);
    if (!parsed.title) return;
    const fd = new FormData();
    fd.set("task", parsed.title);
    fd.set("dueDate", parsed.dueIso);
    fd.set("assignedTo", person);
    fd.set("priority", parsed.priority);
    startAdd(async () => {
      await saveTask(fd);
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  const onRowDragOver = (overId: number) => {
    if (dragId == null || dragId === overId) return;
    const ids = (dayOrder ?? baseList.map((t) => t.id)).slice();
    const from = ids.indexOf(dragId), to = ids.indexOf(overId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    setDayOrder(ids);
  };

  const commitOrder = () => {
    setDragId(null);
    if (dayOrder) startAction(async () => { await reorderTasks(dayOrder); });
  };

  const teamNames = members.map((m) => m.name);
  const dateLabel = selDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="card mb-6 overflow-visible">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist bg-gradient-to-r from-elevate-50/80 to-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-elevate-100 text-elevate-700">
            <Sun size={18} />
          </span>
          <div>
            <h2 className="font-display text-base font-bold">
              {view === "day" ? (selIso === todayIso ? "My Day" : dateLabel) : "This Week"}
            </h2>
            <p className="text-xs text-ink-faint">
              {view === "day"
                ? `${dateLabel}${overdue.length ? ` · ${overdue.length} overdue` : ""}`
                : `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* person picker */}
          <button onClick={() => setPerson("")}
            className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition",
              person === "" ? "bg-ink text-white" : "border border-mist bg-white text-ink-muted hover:text-ink")}>
            Everyone
          </button>
          {members.map((m) => (
            <button key={m.id} onClick={() => setPerson(m.name)}
              className={cn("flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-semibold transition",
                person === m.name ? "bg-ink text-white" : "border border-mist bg-white text-ink-muted hover:text-ink")}>
              <Avatar initials={initialsOf(m.name)} color={m.color} size={22} photo={m.photo} />
              {m.name.split(" ")[0]}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-mist" />
          {/* view + navigation */}
          <button onClick={() => { setView(view === "day" ? "week" : "day"); setOffset(0); }}
            className="flex items-center gap-1.5 rounded-full border border-mist bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink">
            <CalendarDays size={12} /> {view === "day" ? "Week view" : "Day view"}
          </button>
          <button onClick={() => setOffset(offset - 1)} aria-label="Previous"
            className="rounded-full border border-mist bg-white p-1.5 text-ink-muted hover:text-ink"><ChevronLeft size={14} /></button>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)}
              className="rounded-full bg-elevate-500 px-3 py-1.5 text-xs font-bold text-ink">Today</button>
          )}
          <button onClick={() => setOffset(offset + 1)} aria-label="Next"
            className="rounded-full border border-mist bg-white p-1.5 text-ink-muted hover:text-ink"><ChevronRight size={14} /></button>
        </div>
      </div>

      {view === "day" ? (
        <div className="p-5">
          {/* progress */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-ink-muted">{doneSel.length} of {total} done</span>
          </div>

          {/* appointments */}
          {dayEvents.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {dayEvents.map((e, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-lg bg-elevate-50 px-2.5 py-1.5 text-xs font-semibold text-elevate-800">
                  <Clock size={11} />
                  {e.time || "All day"} · {e.title}
                  {!person && <span className="font-normal text-elevate-600">({e.who.split(" ")[0]})</span>}
                </span>
              ))}
            </div>
          )}

          {/* quick add */}
          <form action={(fd) => quickAdd(String(fd.get("task") ?? ""))} className="mb-4 flex items-center gap-2">
            <input ref={inputRef} name="task" autoComplete="off"
              placeholder={`Add a task… try "call Marcus tomorrow !high"`}
              className="min-w-0 flex-1 rounded-xl border border-mist bg-chalk/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-elevate-400 focus:bg-white" />
            <button type="submit" disabled={adding}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-elevate-500 px-3.5 py-2.5 text-sm font-semibold text-ink transition hover:bg-elevate-400">
              {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add
            </button>
          </form>

          {/* task list */}
          {list.length > 0 ? (
            <ul className="space-y-2">
              {list.map((t) => {
                const isOverdue = overdue.includes(t);
                return (
                  <li key={t.id} draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragOver={(e) => { e.preventDefault(); onRowDragOver(t.id); }}
                    onDragEnd={commitOrder}
                    className={cn(
                      "group flex items-center gap-2 rounded-xl border border-mist/70 px-2.5 py-2.5 transition hover:shadow-card",
                      dragId === t.id && "opacity-50 ring-2 ring-elevate-300"
                    )}>
                    <GripVertical size={14} className="shrink-0 cursor-grab text-ink-faint/50 group-hover:text-ink-faint" />
                    <button onClick={() => complete(t)} aria-label="Complete task"
                      className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition",
                        isOverdue ? "border-rose-400 hover:bg-rose-100" : "border-ink-faint/40 hover:border-emerald-500 hover:bg-emerald-50")}>
                      <Check size={13} strokeWidth={3} className="text-transparent" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t.dueTime && (
                          <span className="mr-1.5 font-semibold text-elevate-700">{fmtTime(t.dueTime)}</span>
                        )}
                        {t.task}
                        {t.recur && <Repeat size={11} className="ml-1.5 inline text-elevate-600" />}
                      </p>
                      <p className="truncate text-xs text-ink-faint">
                        {!person && (t.assignedTo || "Unassigned")}
                        {!person && t.relatedClient && " · "}
                        {t.relatedClient}
                        {isOverdue && <span className="font-semibold text-rose-600"> · was due {fmtDate(t.dueDate)}</span>}
                      </p>
                    </div>
                    {/* priority flag */}
                    <button onClick={() => patch(t.id, "priority", NEXT_PRIORITY[t.priority] ?? "High")}
                      title={`Priority: ${t.priority} (click to change)`}
                      className="shrink-0 rounded p-1 hover:bg-mist">
                      <Flag size={13} className={PRIORITY_STYLE[t.priority.toLowerCase()] ?? "text-ink-faint"} />
                    </button>
                    {/* snooze / pull in */}
                    <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                      {isOverdue ? (
                        <button onClick={() => patch(t.id, "dueDate", todayIso)}
                          className="flex items-center gap-1 rounded-lg bg-elevate-100 px-2 py-1 text-[11px] font-bold text-elevate-800 hover:bg-elevate-200"
                          title="Move to today">
                          <ArrowDownToLine size={11} /> Today
                        </button>
                      ) : (
                        <>
                          <button onClick={() => patch(t.id, "dueDate", isoOf(addDays(selDate, 1)))}
                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-muted hover:bg-mist" title="Snooze to tomorrow">
                            Tmrw
                          </button>
                          <button onClick={() => patch(t.id, "dueDate", isoOf(addDays(selDate, 7)))}
                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-muted hover:bg-mist" title="Snooze a week">
                            +1w
                          </button>
                        </>
                      )}
                    </span>
                    <TaskModal task={t} team={teamNames} trigger={<EditIcon />} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl bg-emerald-50 px-4 py-6 text-center text-sm font-medium text-emerald-700">
              {selIso === todayIso ? "All clear today. Go make some calls." : "Nothing planned this day yet."}
            </p>
          )}

          {/* done list */}
          {doneSel.length > 0 && (
            <ul className="mt-3 space-y-1">
              {doneSel.map((t) => (
                <li key={t.id} className="flex items-center gap-2 px-2.5 text-sm text-ink-faint">
                  <Check size={13} className="text-emerald-500" />
                  <span className="line-through">{t.task}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        /* ── Week view ── */
        <div className="thin-scroll overflow-x-auto p-4">
          <div className="grid min-w-[840px] grid-cols-7 gap-2">
            {weekDays.map((d) => {
              const iso = isoOf(d);
              const dayTasks = sortDay(open.filter((t) => taskIso(t) === iso));
              const dayEv = events.filter((e) => e.date === iso && (!person || e.who.toLowerCase() === person.toLowerCase()));
              const isToday = iso === todayIso;
              return (
                <div key={iso}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragId != null) { patch(dragId, "dueDate", iso); setDragId(null); } }}
                  className={cn("flex min-h-44 flex-col rounded-xl border p-2",
                    isToday ? "border-elevate-300 bg-elevate-50/40" : "border-mist bg-chalk/40")}>
                  <button
                    onClick={() => {
                      // Open this day in day view
                      const diff = Math.round((dayStart(d).getTime() - dayStart(new Date()).getTime()) / 86_400_000);
                      setView("day");
                      setOffset(diff);
                    }}
                    title="Open this day"
                    className={cn(
                      "mb-2 rounded px-1 text-left text-[11px] font-bold uppercase tracking-wider transition hover:bg-white/70 hover:text-ink",
                      isToday ? "text-elevate-700" : "text-ink-faint"
                    )}
                  >
                    {d.toLocaleDateString("en-US", { weekday: "short" })}{" "}
                    <span className="font-display text-sm">{d.getDate()}</span>
                    {isToday && " · today"}
                  </button>
                  {dayEv.map((e, i) => (
                    <p key={`e${i}`} className="mb-1 truncate rounded-md bg-elevate-100/80 px-1.5 py-1 text-[10px] font-semibold text-elevate-800">
                      {e.time && `${e.time} `}{e.title}
                    </p>
                  ))}
                  <div className="flex flex-1 flex-col gap-1">
                    {dayTasks.map((t) => (
                      <div key={t.id} draggable
                        onDragStart={() => setDragId(t.id)}
                        className={cn("cursor-grab rounded-md border border-mist/70 bg-white px-1.5 py-1", dragId === t.id && "opacity-50")}>
                        <p className="truncate text-[11px] font-semibold leading-tight">{t.task}</p>
                        <p className="truncate text-[10px] text-ink-faint">
                          <Flag size={8} className={cn("mr-0.5 inline", PRIORITY_STYLE[t.priority.toLowerCase()])} />
                          {t.assignedTo?.split(" ")[0] || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">
            Drag a task onto another day to reschedule it · click a day&apos;s name to open it.
          </p>
        </div>
      )}

      {/* undo toast */}
      {undo && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-2xl">
          <Check size={14} className="text-emerald-400" />
          <span className="max-w-56 truncate">{undo.title}</span>
          <button
            onClick={() => {
              const fd = new FormData();
              fd.set("id", String(undo.id)); fd.set("done", "false");
              startAction(async () => { await toggleTask(fd); });
              setUndo(null);
            }}
            className="flex items-center gap-1 font-bold text-elevate-400 hover:underline">
            <Undo2 size={13} /> Undo
          </button>
        </div>
      )}
    </div>
  );
}
