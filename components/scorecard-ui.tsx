"use client";

import { useState } from "react";
import { Measurable } from "@/lib/types";
import { saveScore, saveMeasurables } from "@/app/actions";
import { weekLabel, monthLabel } from "@/lib/scorecard";
import { inputBase } from "./modal";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Save, Loader2, Pencil, X, Lock } from "lucide-react";

export interface ScoreRow {
  m: Measurable;
  values: Record<string, number | undefined>; // period key -> value (manual + auto merged)
}

function cellColor(m: Measurable, v: number | undefined): string {
  if (v == null) return "text-ink-faint";
  const hit = m.direction === "<=" ? v <= m.target : v >= m.target;
  return hit ? "bg-emerald-50 text-emerald-700 font-semibold" : "bg-rose-50 text-rose-600 font-semibold";
}

function ScoreCell({
  m,
  period,
  value,
  editable,
}: {
  m: Measurable;
  period: string;
  value: number | undefined;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<number | undefined>(value);

  if (!editable) {
    return (
      <td className={cn("px-1 py-1.5 text-center text-sm", cellColor(m, value))}>
        {value ?? "·"}
      </td>
    );
  }

  return (
    <td className={cn("px-1 py-1 text-center text-sm", !editing && cellColor(m, local))}>
      {editing ? (
        <input
          autoFocus
          type="number"
          defaultValue={local ?? ""}
          disabled={busy}
          onBlur={async (e) => {
            const raw = e.target.value.trim();
            const v = raw === "" ? undefined : Number(raw);
            setBusy(true);
            const fd = new FormData();
            fd.set("mid", m.id);
            fd.set("week", period);
            fd.set("value", raw);
            await saveScore(fd);
            setLocal(v != null && !isNaN(v) ? v : undefined);
            setBusy(false);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-12 rounded border border-elevate-400 px-1 py-0.5 text-center text-sm outline-none"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full rounded px-1 py-0.5 hover:ring-1 hover:ring-elevate-300"
          title="Click to enter"
        >
          {busy ? <Loader2 size={12} className="mx-auto animate-spin" /> : local ?? "·"}
        </button>
      )}
    </td>
  );
}

// Read-only grid (score cells still click-to-edit on manual rows).
export function ScorecardGrid({
  rows,
  cols,
  mode,
}: {
  rows: ScoreRow[];
  cols: string[];
  mode: "week" | "month";
}) {
  const current = cols[cols.length - 1];
  const label = mode === "week" ? weekLabel : monthLabel;

  return (
    <div className="thin-scroll overflow-x-auto">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-mist text-left text-[11px] uppercase tracking-wider text-ink-faint">
            <th className="px-3 py-2.5 font-semibold">Measurable</th>
            <th className="px-3 py-2.5 font-semibold">Owner</th>
            <th className="px-2 py-2.5 text-center font-semibold">
              Goal / {mode === "week" ? "wk" : "mo"}
            </th>
            {cols.map((c) => (
              <th
                key={c}
                className={cn(
                  "px-1 py-2.5 text-center font-semibold",
                  c === current && "rounded-t-lg bg-elevate-50 text-elevate-800"
                )}
              >
                {label(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-mist/70">
          {rows.map(({ m, values }) => (
            <tr key={m.id} className="hover:bg-chalk/40">
              <td className="px-3 py-1.5 font-semibold">
                {m.name}
                {m.auto && (
                  <span className="ml-2 rounded bg-elevate-100 px-1 py-px text-[10px] font-semibold text-elevate-800">
                    auto
                  </span>
                )}
              </td>
              <td className="px-3 py-1.5 text-ink-muted">{m.owner || "Team"}</td>
              <td className="px-2 py-1.5 text-center text-ink-muted">
                {m.direction === "<=" ? "≤" : "≥"} {m.target}
              </td>
              {cols.map((c) => (
                <ScoreCell
                  key={`${m.id}-${c}`}
                  m={m}
                  period={c}
                  value={values[c]}
                  editable={!m.auto}
                />
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length + 3} className="px-3 py-6 text-center text-sm text-ink-faint">
                No {mode === "week" ? "weekly" : "monthly"} measurables yet — add one with Edit measurables.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Single editor for the whole scorecard (weekly + monthly rows together).
export function MeasurablesEditor({
  measurables,
  agents,
}: {
  measurables: Measurable[];
  agents: string[];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Measurable[]>(measurables);
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => { setDraft(measurables); setOpen(true); }}
        className="flex items-center gap-1.5 text-xs font-semibold text-elevate-700 hover:underline"
      >
        <Pencil size={12} /> Edit measurables
      </button>
    );
  }

  return (
    <div className="mt-2 w-full space-y-3 rounded-2xl border border-mist bg-white p-4">
      {draft.map((m, i) => (
        <div key={m.id} className="flex flex-wrap items-center gap-2">
          <input
            value={m.name}
            onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            className={cn(inputBase, "min-w-48 flex-1")}
            placeholder="Measurable"
          />
          <select
            value={m.owner}
            onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, owner: e.target.value } : x)))}
            className={inputBase}
          >
            <option value="">Owner: whole team</option>
            {agents.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={m.direction}
            onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, direction: e.target.value as Measurable["direction"] } : x)))}
            className={inputBase}
          >
            <option value=">=">Goal: at least</option>
            <option value="<=">Goal: at most</option>
          </select>
          <input
            type="number"
            value={m.target}
            onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, target: Number(e.target.value) || 0 } : x)))}
            className={cn(inputBase, "w-20")}
            title="Target per period"
          />
          <select
            value={m.period ?? "week"}
            onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, period: e.target.value as "week" | "month" } : x)))}
            className={inputBase}
            title="Goal cadence"
          >
            <option value="week">per week</option>
            <option value="month">per month</option>
          </select>
          {m.auto && <span className="chip bg-elevate-100 text-elevate-800">auto</span>}
          {m.locked ? (
            <span className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-semibold text-ink-faint" title="Core prospecting row — always on the scorecard">
              <Lock size={11} /> core
            </span>
          ) : (
            <button
              onClick={() => setDraft(draft.filter((_, j) => j !== i))}
              className="rounded-lg p-1.5 text-ink-faint hover:bg-mist hover:text-rose-500"
              aria-label="Remove measurable"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          onClick={() =>
            setDraft([
              ...draft,
              { id: `m${Date.now()}`, name: "", owner: "", target: 0, direction: ">=", auto: "", period: "week" },
            ])
          }
          className="flex items-center gap-1.5 rounded-xl border border-mist px-4 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
        >
          <Plus size={14} /> Add measurable
        </button>
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await saveMeasurables(draft.filter((m) => m.name.trim() || m.locked));
            setSaving(false);
            setOpen(false);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-elevate-500 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save scorecard
        </button>
        <button
          onClick={() => setOpen(false)}
          className="flex items-center gap-1 text-sm text-ink-faint hover:text-ink"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}
