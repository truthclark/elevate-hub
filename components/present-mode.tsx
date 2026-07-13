"use client";

// L10 presentation mode: the weekly meeting on one big screen.
// Arrow keys / click to advance, Esc to leave.

import { useEffect, useState } from "react";
import { fmtMoney, cn } from "@/lib/utils";
import { MonitorPlay, ChevronLeft, ChevronRight, X, Target } from "lucide-react";

export interface PresentRow {
  name: string;
  owner: string;
  target: number;
  direction: ">=" | "<=";
  vals: (number | null)[];
}

export interface PresentData {
  companyName: string;
  weekLabels: string[]; // last 4, oldest first
  weekly: PresentRow[];
  monthLabels: string[]; // last 3
  monthly: PresentRow[];
  onTrack: number;
  weeklyCount: number;
  unitsClosed: number;
  annualTarget: number;
  pipelineVolume: number;
  pipelineGci: number;
}

const hit = (r: PresentRow, v: number | null) =>
  v == null ? null : r.direction === "<=" ? v <= r.target : v >= r.target;

function BigTable({ rows, cols }: { rows: PresentRow[]; cols: string[] }) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-sm uppercase tracking-wider text-white/40">
          <th className="pb-3 pr-4 font-semibold">Measurable</th>
          <th className="pb-3 pr-4 font-semibold">Goal</th>
          {cols.map((c) => (
            <th key={c} className="pb-3 text-center font-semibold">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/10">
        {rows.map((r) => (
          <tr key={r.name}>
            <td className="py-3.5 pr-4">
              <p className="font-display text-lg font-semibold leading-tight">{r.name}</p>
              <p className="text-xs text-white/40">{r.owner || "Team"}</p>
            </td>
            <td className="py-3.5 pr-4 text-lg text-white/60">
              {r.direction === "<=" ? "≤" : "≥"} {r.target}
            </td>
            {r.vals.map((v, i) => {
              const h = hit(r, v);
              return (
                <td key={i} className="py-3.5 text-center">
                  <span
                    className={cn(
                      "inline-block min-w-12 rounded-xl px-3 py-1.5 font-display text-xl font-bold",
                      h == null
                        ? "text-white/25"
                        : h
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                    )}
                  >
                    {v ?? "·"}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PresentMode({ data }: { data: PresentData }) {
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const TOTAL = 4;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight" || e.key === " ") setSlide((s) => Math.min(s + 1, TOTAL - 1));
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => {
          setSlide(0);
          setOpen(true);
        }}
        className="flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-ink-soft"
      >
        <MonitorPlay size={15} /> Present
      </button>
    );
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const unitPct = data.annualTarget
    ? Math.round((data.unitsClosed / data.annualTarget) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#111118] text-white">
      <div className="dot-grid pointer-events-none fixed inset-0 opacity-40" />
      <button
        onClick={() => setOpen(false)}
        className="fixed right-6 top-6 z-10 rounded-full border border-white/20 p-2.5 text-white/70 transition hover:text-white"
        aria-label="Exit"
      >
        <X size={18} />
      </button>

      <div
        key={slide}
        className="animate-rise relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-8 py-20"
      >
        {slide === 0 && (
          <div className="text-center">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-[#D4A520]">
              {data.companyName}
            </p>
            <h1 className="mt-6 font-display text-5xl font-bold sm:text-6xl">
              Scorecard Review
            </h1>
            <p className="mt-4 text-lg text-white/50">{today}</p>
            <div className="mx-auto mt-12 flex max-w-md items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-8 py-6">
              <Target size={28} className="text-elevate-400" />
              <p className="text-left">
                <span className="font-display text-4xl font-bold">
                  {data.onTrack}
                  <span className="text-white/40"> / {data.weeklyCount}</span>
                </span>
                <span className="block text-sm text-white/50">measurables on track this week</span>
              </p>
            </div>
          </div>
        )}

        {slide === 1 && (
          <div>
            <p className="mb-6 font-display text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A520]">
              Weekly measurables — last 4 weeks
            </p>
            <BigTable rows={data.weekly} cols={data.weekLabels} />
          </div>
        )}

        {slide === 2 && (
          <div>
            <p className="mb-6 font-display text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A520]">
              Monthly goals — last 3 months
            </p>
            {data.monthly.length > 0 ? (
              <BigTable rows={data.monthly} cols={data.monthLabels} />
            ) : (
              <p className="text-white/50">No monthly goals set yet.</p>
            )}
          </div>
        )}

        {slide === 3 && (
          <div className="text-center">
            <p className="mb-10 font-display text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A520]">
              The year at a glance
            </p>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <p className="font-display text-5xl font-bold text-elevate-400">
                  {data.unitsClosed}
                  <span className="text-2xl text-white/40">/{data.annualTarget}</span>
                </p>
                <p className="mt-2 text-sm text-white/50">closings · {unitPct}% of goal</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <p className="font-display text-5xl font-bold text-elevate-400">
                  {fmtMoney(data.pipelineVolume, true)}
                </p>
                <p className="mt-2 text-sm text-white/50">pipeline volume</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <p className="font-display text-5xl font-bold text-elevate-400">
                  {fmtMoney(data.pipelineGci, true)}
                </p>
                <p className="mt-2 text-sm text-white/50">projected GCI</p>
              </div>
            </div>
            <p className="mt-12 text-sm text-white/40">
              A number that&apos;s red two weeks straight becomes an issue. Solve it, don&apos;t stare at it.
            </p>
          </div>
        )}
      </div>

      {/* controls */}
      <div className="fixed bottom-6 left-0 right-0 flex items-center justify-center gap-4">
        <button
          onClick={() => setSlide((s) => Math.max(s - 1, 0))}
          disabled={slide === 0}
          className="rounded-full border border-white/20 p-2.5 text-white/70 transition hover:text-white disabled:opacity-25"
          aria-label="Previous"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="flex items-center gap-2">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 rounded-full transition-all", i === slide ? "w-6 bg-elevate-400" : "w-1.5 bg-white/25")}
            />
          ))}
        </span>
        <button
          onClick={() => setSlide((s) => Math.min(s + 1, TOTAL - 1))}
          disabled={slide === TOTAL - 1}
          className="rounded-full border border-white/20 p-2.5 text-white/70 transition hover:text-white disabled:opacity-25"
          aria-label="Next"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
