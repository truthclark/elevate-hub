"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PERIOD_OPTIONS } from "@/lib/report-range";
import { cn } from "@/lib/utils";
import { SlidersHorizontal } from "lucide-react";

export default function ReportFilters({ agents }: { agents: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const period = params.get("period") ?? "ytd";
  const agent = params.get("agent") ?? "";

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/reports?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="card mb-6 flex flex-wrap items-center gap-2 p-4">
      <SlidersHorizontal size={15} className="text-ink-faint" />
      <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">
        Show
      </span>
      {PERIOD_OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => set("period", o.value === "ytd" ? "" : o.value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
            period === o.value
              ? "bg-ink text-white"
              : "border border-mist bg-white text-ink-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
      <span className="mx-1 h-5 w-px bg-mist" />
      <select
        value={agent}
        onChange={(e) => set("agent", e.target.value)}
        className={cn(
          "rounded-xl border bg-white px-2.5 py-1.5 text-xs font-semibold outline-none transition",
          agent ? "border-elevate-400 text-elevate-800" : "border-mist text-ink-muted"
        )}
      >
        <option value="">All agents</option>
        {agents.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  );
}
