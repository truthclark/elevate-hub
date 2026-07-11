"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Archive, X, Check } from "lucide-react";

// Floating action bar shown when rows are selected.
// op "status"/"agent" need a value; "archive" confirms first.
export default function BulkBar({
  ids,
  onClear,
  statusOptions,
  statusLabel,
  agents,
  action,
}: {
  ids: number[];
  onClear: () => void;
  statusOptions: string[];
  statusLabel: string;
  agents: string[];
  action: (fd: FormData) => Promise<void>;
}) {
  const [status, setStatus] = useState("");
  const [agent, setAgent] = useState("");
  const [busy, setBusy] = useState(false);

  if (ids.length === 0) return null;

  const run = async (op: string, value: string) => {
    if (op === "archive" && !confirm(`Archive ${ids.length} selected? You can restore them from the Archive page.`)) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("ids", ids.join(","));
    fd.set("op", op);
    fd.set("value", value);
    await action(fd);
    setBusy(false);
    onClear();
  };

  const sel =
    "rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-sm text-white outline-none [&>option]:text-ink";

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-white shadow-card-hover">
      <span className="text-sm font-bold">{ids.length} selected</span>
      <span className="mx-1 h-5 w-px bg-white/20" />

      <select value={status} onChange={(e) => setStatus(e.target.value)} className={sel} disabled={busy}>
        <option value="">{statusLabel}…</option>
        {statusOptions.map((s) => <option key={s}>{s}</option>)}
      </select>
      <button
        onClick={() => status && run("status", status)}
        disabled={!status || busy}
        className="rounded-lg bg-elevate-500 p-1.5 text-ink disabled:opacity-40"
        aria-label="Apply status"
      >
        <Check size={15} />
      </button>

      <select value={agent} onChange={(e) => setAgent(e.target.value)} className={sel} disabled={busy}>
        <option value="">Assign to…</option>
        {agents.map((a) => <option key={a}>{a}</option>)}
      </select>
      <button
        onClick={() => agent && run("agent", agent)}
        disabled={!agent || busy}
        className="rounded-lg bg-elevate-500 p-1.5 text-ink disabled:opacity-40"
        aria-label="Apply agent"
      >
        <Check size={15} />
      </button>

      <span className="mx-1 h-5 w-px bg-white/20" />
      <button
        onClick={() => run("archive", "")}
        disabled={busy}
        className={cn("flex items-center gap-1.5 rounded-lg bg-rose-500/90 px-3 py-1.5 text-sm font-semibold", busy && "opacity-40")}
      >
        <Archive size={14} /> Archive
      </button>
      <button onClick={onClear} className="rounded-lg p-1.5 text-white/60 hover:text-white" aria-label="Clear selection">
        <X size={16} />
      </button>
    </div>
  );
}
