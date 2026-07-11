"use client";

import { Search, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-mist bg-white py-2 pl-8 pr-3 text-sm outline-none transition focus:border-elevate-400"
      />
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-xl border bg-white px-2.5 py-2 text-sm outline-none transition",
        value ? "border-elevate-400 font-semibold text-elevate-800" : "border-mist text-ink-muted"
      )}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function SortControl({
  value,
  onChange,
  asc,
  onToggleDir,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  asc: boolean;
  onToggleDir: () => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-mist bg-white px-2.5 py-2 text-sm text-ink-muted outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>Sort: {o.label}</option>
        ))}
      </select>
      <button
        onClick={onToggleDir}
        className="rounded-xl border border-mist bg-white p-2 text-ink-muted transition hover:text-ink"
        title={asc ? "Ascending" : "Descending"}
        aria-label="Toggle sort direction"
      >
        <ArrowUpDown size={14} className={cn("transition", !asc && "rotate-180")} />
      </button>
    </div>
  );
}

// Shared matcher: case-insensitive substring across fields
export function matches(query: string, ...fields: (string | null | undefined)[]) {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}
