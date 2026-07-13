"use client";

// Plan My Day: overdue tasks dealt to you one at a time. Four taps clear a
// backlog — Today, Tomorrow, Next week, or Done. Finish gets confetti.

import { useMemo, useState, useTransition } from "react";
import { TaskItem } from "@/lib/types";
import { patchTask, toggleTask } from "@/app/actions";
import { fireConfetti } from "@/lib/confetti";
import { fmtDate, cn } from "@/lib/utils";
import { X, Sun, ArrowRight, CalendarDays, Check, Flag, Sparkles } from "lucide-react";

const p2 = (x: number) => String(x).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoOf(d);
};

const PRIORITY_STYLE: Record<string, string> = {
  high: "text-rose-500",
  medium: "text-amber-500",
  low: "text-ink-faint",
};

export default function Triage({
  tasks,
  onClose,
}: {
  tasks: TaskItem[];
  onClose: () => void;
}) {
  const queue = useMemo(() => tasks, [tasks]);
  const [idx, setIdx] = useState(0);
  const [, startAction] = useTransition();
  const total = queue.length;
  const task = queue[idx];
  const finished = idx >= total;

  const decide = (action: "today" | "tomorrow" | "week" | "done") => {
    if (!task) return;
    const fd = new FormData();
    fd.set("id", String(task.id));
    if (action === "done") {
      fd.set("done", "true");
      startAction(async () => {
        await toggleTask(fd);
      });
    } else {
      fd.set("dueDate", action === "today" ? plusDays(0) : action === "tomorrow" ? plusDays(1) : plusDays(7));
      startAction(async () => {
        await patchTask(fd);
      });
    }
    const next = idx + 1;
    setIdx(next);
    if (next >= total) fireConfetti(70);
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#111118]/92 backdrop-blur-sm">
      <button
        onClick={onClose}
        className="fixed right-5 top-5 z-10 rounded-full border border-white/20 p-2.5 text-white/70 transition hover:text-white"
        aria-label="Close"
      >
        <X size={18} />
      </button>

      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-16">
        {!finished ? (
          <>
            <div className="mb-6 text-center">
              <p className="flex items-center justify-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.2em] text-elevate-400">
                <Sun size={13} /> Plan my day
              </p>
              <p className="mt-1 text-xs text-white/50">
                {idx + 1} of {total} overdue — decide and move on
              </p>
              <div className="mx-auto mt-3 h-1 w-48 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-elevate-400 transition-all duration-300"
                  style={{ width: `${(idx / total) * 100}%` }}
                />
              </div>
            </div>

            <div key={task.id} className="animate-rise rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
              <p className="flex items-center gap-2 text-xs font-semibold text-rose-600">
                <Flag size={12} className={PRIORITY_STYLE[task.priority.toLowerCase()] ?? ""} />
                was due {fmtDate(task.dueDate)}
                {task.priority && ` · ${task.priority} priority`}
              </p>
              <h2 className="mt-2 font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
                {task.task}
              </h2>
              {(task.relatedClient || task.assignedTo) && (
                <p className="mt-1.5 text-sm text-ink-muted">
                  {[task.assignedTo, task.relatedClient].filter(Boolean).join(" · ")}
                </p>
              )}
              {task.notes && <p className="mt-2 text-sm text-ink-faint">{task.notes}</p>}

              <div className="mt-7 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => decide("today")}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-elevate-500 px-4 py-3.5 font-display text-sm font-bold text-ink transition hover:bg-elevate-400"
                >
                  <Sun size={15} /> Today
                </button>
                <button
                  onClick={() => decide("done")}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3.5 font-display text-sm font-bold text-white transition hover:bg-emerald-400"
                >
                  <Check size={15} /> Already done
                </button>
                <button
                  onClick={() => decide("tomorrow")}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-mist px-4 py-3.5 font-display text-sm font-bold text-ink-soft transition hover:border-elevate-300"
                >
                  <ArrowRight size={15} /> Tomorrow
                </button>
                <button
                  onClick={() => decide("week")}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-mist px-4 py-3.5 font-display text-sm font-bold text-ink-soft transition hover:border-elevate-300"
                >
                  <CalendarDays size={15} /> Next week
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="animate-rise rounded-3xl bg-white p-10 text-center shadow-2xl">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Sparkles size={24} />
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">Backlog cleared.</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {total} decision{total === 1 ? "" : "s"} in about a minute. That&apos;s how it&apos;s done.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-2xl bg-elevate-500 px-8 py-3 font-display font-bold text-ink transition hover:bg-elevate-400"
            >
              Back to my day
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
