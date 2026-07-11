"use client";

import { useState } from "react";
import { Settings, TaskTemplate, TemplateItem, Checklists, ChecklistItem, Side, Brokerage, FeeItem, CHECKLIST_TITLES, DEFAULT_CHECKLISTS } from "@/lib/types";
import { saveTemplates, saveChecklists, importFromSheet } from "@/app/actions";
import { inputBase } from "./modal";
import { Download, UploadCloud, Plus, Trash2, Save, Loader2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// Move an array element up/down (returns a new array)
function moveItem<T>(arr: T[], from: number, dir: -1 | 1): T[] {
  const to = from + dir;
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function MoveButtons({
  index,
  count,
  onMove,
}: {
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <span className="flex shrink-0 flex-col">
      <button
        onClick={() => onMove(-1)}
        disabled={index === 0}
        className="rounded p-0.5 text-ink-faint hover:bg-mist hover:text-ink disabled:opacity-25"
        aria-label="Move up"
      >
        <ChevronUp size={13} />
      </button>
      <button
        onClick={() => onMove(1)}
        disabled={index === count - 1}
        className="rounded p-0.5 text-ink-faint hover:bg-mist hover:text-ink disabled:opacity-25"
        aria-label="Move down"
      >
        <ChevronDown size={13} />
      </button>
    </span>
  );
}

// ── Import / Export ──────────────────────────────────────────────
export function ImportExport({ sheetReady }: { sheetReady: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <a
          href="/api/export"
          className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-soft"
        >
          <Download size={15} /> Download backup (.xlsx)
        </a>
        <button
          disabled={!sheetReady || busy}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const result = await importFromSheet();
              setMsg(result.message);
            } catch (e) {
              setMsg(`Import failed: ${(e as Error).message}`);
            } finally {
              setBusy(false);
            }
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
            sheetReady
              ? "border-elevate-300 text-elevate-700 hover:bg-elevate-50"
              : "cursor-not-allowed border-mist text-ink-faint"
          )}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
          Import from Google Sheet
        </button>
      </div>
      {msg && <p className="text-sm font-medium text-elevate-700">{msg}</p>}
      {!sheetReady && (
        <p className="text-xs text-ink-faint">
          To enable import, add the Google service-account credentials from the
          README. Export works anytime.
        </p>
      )}
    </div>
  );
}

// ── Task template editor ─────────────────────────────────────────
const BLANK_ITEM: TemplateItem = { title: "", offsetDays: 0, anchor: "created", assignRole: "" };

export function TemplatesEditor({ settings }: { settings: Settings }) {
  const [templates, setTemplates] = useState<TaskTemplate[]>(settings.templates);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (ti: number, patch: Partial<TaskTemplate>) =>
    setTemplates(templates.map((t, i) => (i === ti ? { ...t, ...patch } : t)));
  const updateItem = (ti: number, ii: number, patch: Partial<TemplateItem>) =>
    update(ti, {
      items: templates[ti].items.map((it, i) => (i === ii ? { ...it, ...patch } : it)),
    });

  return (
    <div className="space-y-4">
      {templates.map((tpl, ti) => (
        <div key={tpl.id} className="rounded-xl border border-mist p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={tpl.name}
              onChange={(e) => update(ti, { name: e.target.value })}
              className={cn(inputBase, "max-w-xs flex-1 font-semibold")}
            />
            <select
              value={tpl.side}
              onChange={(e) => update(ti, { side: e.target.value as TaskTemplate["side"] })}
              className={inputBase}
            >
              <option value="Buyer">For new Buyers</option>
              <option value="Listing">For new Listings</option>
              <option value="Pending">For Pending contracts</option>
            </select>
            <button
              onClick={() => setTemplates(templates.filter((_, i) => i !== ti))}
              className="ml-auto rounded-lg p-2 text-rose-500 hover:bg-rose-50"
              aria-label="Delete template"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="space-y-2">
            {tpl.items.map((it, ii) => (
              <div key={ii} className="flex flex-wrap items-center gap-2">
                <MoveButtons
                  index={ii}
                  count={tpl.items.length}
                  onMove={(dir) => update(ti, { items: moveItem(tpl.items, ii, dir) })}
                />
                <input
                  value={it.title}
                  onChange={(e) => updateItem(ti, ii, { title: e.target.value })}
                  placeholder="Task title"
                  className={cn(inputBase, "min-w-48 flex-1")}
                />
                <input
                  type="number"
                  value={it.offsetDays}
                  onChange={(e) => updateItem(ti, ii, { offsetDays: parseInt(e.target.value) || 0 })}
                  className={cn(inputBase, "w-20")}
                  title="Days offset (negative = before anchor)"
                />
                <select
                  value={it.anchor}
                  onChange={(e) => updateItem(ti, ii, { anchor: e.target.value as TemplateItem["anchor"] })}
                  className={inputBase}
                >
                  <option value="created">days after created</option>
                  <option value="contract">days after contract</option>
                  <option value="close">days vs closing</option>
                </select>
                <select
                  value={it.assignRole}
                  onChange={(e) => updateItem(ti, ii, { assignRole: e.target.value as TemplateItem["assignRole"] })}
                  className={inputBase}
                >
                  <option value="">Assign: deal agent</option>
                  <option value="Admin">Assign: Admin</option>
                  <option value="Agent">Assign: Agent</option>
                  <option value="Ops">Assign: Ops</option>
                </select>
                <button
                  onClick={() => update(ti, { items: tpl.items.filter((_, i) => i !== ii) })}
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-mist hover:text-rose-500"
                  aria-label="Remove item"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={() => update(ti, { items: [...tpl.items, { ...BLANK_ITEM }] })}
              className="flex items-center gap-1 text-xs font-semibold text-elevate-700 hover:underline"
            >
              <Plus size={13} /> Add task
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() =>
            setTemplates([
              ...templates,
              { id: `tpl-${Date.now()}`, name: "New template", side: "Buyer", items: [{ ...BLANK_ITEM }] },
            ])
          }
          className="flex items-center gap-1.5 rounded-xl border border-mist px-4 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
        >
          <Plus size={14} /> New template
        </button>
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await saveTemplates({ ...settings, templates });
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-elevate-500 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? "Saved ✓" : "Save templates"}
        </button>
      </div>
    </div>
  );
}

// ── Workflow checklists editor ───────────────────────────────────
const SIDES: Side[] = ["Buyer", "Listing", "Referral"];

function slugify(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join("");
  return base || `item${Date.now()}`;
}

export function ChecklistsEditor({ settings }: { settings: Settings }) {
  const [lists, setLists] = useState<Checklists>(
    settings.checklists ?? DEFAULT_CHECKLISTS
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [drag, setDrag] = useState<{ side: Side; index: number } | null>(null);

  const onDragOverRow = (side: Side, index: number) => {
    if (!drag || drag.side !== side || drag.index === index) return;
    const items = [...lists[side]];
    const [moved] = items.splice(drag.index, 1);
    items.splice(index, 0, moved);
    setLists({ ...lists, [side]: items });
    setDrag({ side, index });
  };

  const updateItem = (side: Side, i: number, label: string) =>
    setLists({
      ...lists,
      [side]: lists[side].map((it, idx) => (idx === i ? { ...it, label } : it)),
    });

  const removeItem = (side: Side, i: number) =>
    setLists({ ...lists, [side]: lists[side].filter((_, idx) => idx !== i) });

  const addItem = (side: Side) =>
    setLists({ ...lists, [side]: [...lists[side], { key: "", label: "" }] });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {SIDES.map((side) => (
          <div key={side} className="rounded-xl border border-mist p-4">
            <p className="mb-1 text-sm font-semibold">{CHECKLIST_TITLES[side]}</p>
            <p className="mb-3 text-xs text-ink-faint">
              Shows on every {side === "Listing" ? "listing" : side.toLowerCase()} record.
            </p>
            <div className="space-y-2">
              {lists[side].map((it, i) => (
                <div
                  key={it.key || `new-${i}`}
                  draggable
                  onDragStart={() => setDrag({ side, index: i })}
                  onDragOver={(e) => { e.preventDefault(); onDragOverRow(side, i); }}
                  onDragEnd={() => setDrag(null)}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg",
                    drag?.side === side && drag.index === i && "opacity-50 ring-2 ring-elevate-300"
                  )}
                >
                  <GripVertical
                    size={14}
                    className="shrink-0 cursor-grab text-ink-faint/40 transition group-hover:text-ink-faint"
                  />
                  <input
                    value={it.label}
                    onChange={(e) => updateItem(side, i, e.target.value)}
                    placeholder="Checklist step"
                    className={cn(inputBase, "min-w-0 flex-1")}
                  />
                  <button
                    onClick={() => removeItem(side, i)}
                    className="shrink-0 rounded-lg p-1.5 text-ink-faint hover:bg-mist hover:text-rose-500"
                    aria-label="Remove step"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addItem(side)}
                className="flex items-center gap-1 text-xs font-semibold text-elevate-700 hover:underline"
              >
                <Plus size={13} /> Add step
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            // Keep existing keys (protects data already saved on deals);
            // generate keys for new items from their label
            const cleaned = {} as Checklists;
            for (const side of SIDES) {
              const used = new Set<string>();
              cleaned[side] = lists[side]
                .filter((it) => it.label.trim())
                .map((it): ChecklistItem => {
                  let key = it.key || slugify(it.label);
                  while (used.has(key)) key = `${key}2`;
                  used.add(key);
                  return { key, label: it.label.trim() };
                });
            }
            await saveChecklists(cleaned);
            setLists(cleaned);
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-elevate-500 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? "Saved ✓" : "Save checklists"}
        </button>
        <p className="text-xs text-ink-faint">
          Renaming a step keeps its history. Removing one hides it but old records keep their data.
        </p>
      </div>
    </div>
  );
}

// ── Brokerage split, cap reset date, and per-transaction fees ─────
const MONTH_NAMES_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function BrokerageEditor({
  brokerage,
  action,
}: {
  brokerage: Brokerage;
  action: (fd: FormData) => Promise<void>;
}) {
  // Amounts stay as free text while typing; the server parses on save.
  type FeeDraft = Omit<FeeItem, "amount"> & { amount: string };
  const [fees, setFees] = useState<FeeDraft[]>(
    (brokerage.fees ?? []).map((f) => ({ ...f, amount: String(f.amount) }))
  );

  return (
    <form action={action}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-muted">Split to brokerage (%)</span>
          <input name="splitPct" defaultValue={brokerage.splitPct} className={inputBase} style={{ width: 100 }} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-muted">Cap ($ per cap year)</span>
          <input name="annualCap" defaultValue={brokerage.annualCap} className={inputBase} style={{ width: 130 }} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-muted">Cap resets on</span>
          <span className="flex gap-2">
            <select name="capResetMonth" defaultValue={brokerage.capResetMonth ?? 1} className={inputBase}>
              {MONTH_NAMES_SHORT.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select name="capResetDay" defaultValue={brokerage.capResetDay ?? 1} className={inputBase} style={{ width: 70 }}>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </span>
        </label>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          Per-transaction fees
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Flat $ or a % of the deal&apos;s net GCI, charged on every closed deal, only while
          capping, or only after the cap is met (e.g. CBR fee on every deal, 5% equity
          contribution before cap, transaction fee after cap).
        </p>
        <div className="mt-3 space-y-2">
          {fees.map((f, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                name="feeLabel"
                value={f.label}
                onChange={(e) => setFees(fees.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                placeholder="Fee name (e.g. CBR fee)"
                className={cn(inputBase, "w-48")}
              />
              <input
                name="feeAmount"
                value={f.amount}
                onChange={(e) => setFees(fees.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
                placeholder={f.kind === "pct" ? "%" : "$"}
                inputMode="decimal"
                className={cn(inputBase, "w-24")}
              />
              <select
                name="feeKind"
                value={f.kind ?? "flat"}
                onChange={(e) => setFees(fees.map((x, j) => (j === i ? { ...x, kind: e.target.value as FeeItem["kind"] } : x)))}
                className={inputBase}
                title="Flat dollars, or a percent of that deal's net GCI"
              >
                <option value="flat">$ flat</option>
                <option value="pct">% of net GCI</option>
              </select>
              <select
                name="feeTiming"
                value={f.timing}
                onChange={(e) => setFees(fees.map((x, j) => (j === i ? { ...x, timing: e.target.value as FeeItem["timing"] } : x)))}
                className={inputBase}
              >
                <option value="always">Every closed deal</option>
                <option value="beforeCap">Only before cap</option>
                <option value="afterCap">Only after cap</option>
              </select>
              <button
                type="button"
                onClick={() => setFees(fees.filter((_, j) => j !== i))}
                className="rounded p-1.5 text-ink-faint hover:bg-rose-50 hover:text-rose-600"
                aria-label="Remove fee"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFees([...fees, { label: "", amount: "", timing: "always", kind: "flat" }])}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-elevate-600 hover:underline"
        >
          <Plus size={13} /> Add fee
        </button>
      </div>

      <button
        type="submit"
        className="mt-5 flex items-center gap-2 rounded-xl bg-elevate-500 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400"
      >
        <Save size={14} /> Save split & fees
      </button>
    </form>
  );
}
