"use client";

import { useMemo, useState } from "react";
import { LinkItem } from "@/lib/types";
import { saveLinks } from "@/app/actions";
import { inputBase } from "./modal";
import { cn } from "@/lib/utils";
import {
  ExternalLink, Plus, Trash2, Save, Loader2, Pencil, X, GripVertical, Globe,
} from "lucide-react";

function domainOf(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

function Favicon({ url }: { url: string }) {
  const domain = domainOf(url);
  if (!domain) return <Globe size={20} className="text-ink-faint" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      width={20}
      height={20}
      className="rounded"
      loading="lazy"
    />
  );
}

export default function LinksBoard({ links }: { links: LinkItem[] }) {
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<LinkItem[]>(links);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const items = editMode ? draft : links;
  const groups = useMemo(() => {
    const out: [string, LinkItem[]][] = [];
    for (const l of items) {
      const g = l.group || "Links";
      const existing = out.find(([name]) => name === g);
      if (existing) existing[1].push(l);
      else out.push([g, [l]]);
    }
    return out;
  }, [items]);

  const onDragOver = (overId: string) => {
    if (!dragId || dragId === overId) return;
    const from = draft.findIndex((l) => l.id === dragId);
    const to = draft.findIndex((l) => l.id === overId);
    if (from < 0 || to < 0) return;
    const next = [...draft];
    const [moved] = next.splice(from, 1);
    // moving into the target's group keeps groups coherent
    next.splice(to, 0, { ...moved, group: draft[to].group });
    setDraft(next);
  };

  if (!editMode) {
    return (
      <div>
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => { setDraft(links.map((l) => ({ ...l }))); setEditMode(true); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-elevate-700 hover:underline"
          >
            <Pencil size={12} /> Edit links
          </button>
        </div>
        {groups.map(([group, ls]) => (
          <div key={group} className="mb-6">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-faint">{group}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {ls.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card card-hover group flex items-center gap-3 p-3.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chalk">
                    <Favicon url={l.url} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{l.label}</span>
                    <span className="block truncate text-[11px] text-ink-faint">{domainOf(l.url)}</span>
                  </span>
                  <ExternalLink size={13} className="shrink-0 text-ink-faint/0 transition group-hover:text-elevate-600" />
                </a>
              ))}
            </div>
          </div>
        ))}
        {links.length === 0 && (
          <p className="rounded-xl bg-chalk/60 px-4 py-8 text-center text-sm text-ink-faint">
            No links yet. Hit Edit links to add your tools.
          </p>
        )}
      </div>
    );
  }

  // ── edit mode ──
  return (
    <div className="space-y-2">
      <p className="mb-3 text-xs text-ink-faint">
        Drag to reorder (dragging into another section moves it there). Group names create the sections.
      </p>
      {draft.map((l) => (
        <div
          key={l.id}
          draggable
          onDragStart={() => setDragId(l.id)}
          onDragOver={(e) => { e.preventDefault(); onDragOver(l.id); }}
          onDragEnd={() => setDragId(null)}
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-xl border border-mist bg-white p-2",
            dragId === l.id && "opacity-50 ring-2 ring-elevate-300"
          )}
        >
          <GripVertical size={14} className="shrink-0 cursor-grab text-ink-faint/60" />
          <input
            value={l.label}
            onChange={(e) => setDraft(draft.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))}
            placeholder="Name"
            className={cn(inputBase, "w-44")}
          />
          <input
            value={l.url}
            onChange={(e) => setDraft(draft.map((x) => (x.id === l.id ? { ...x, url: e.target.value } : x)))}
            placeholder="https://…"
            className={cn(inputBase, "min-w-0 flex-1")}
          />
          <input
            value={l.group}
            onChange={(e) => setDraft(draft.map((x) => (x.id === l.id ? { ...x, group: e.target.value } : x)))}
            placeholder="Section"
            className={cn(inputBase, "w-36")}
            list="link-groups"
          />
          <button
            onClick={() => setDraft(draft.filter((x) => x.id !== l.id))}
            className="rounded-lg p-1.5 text-ink-faint hover:bg-mist hover:text-rose-500"
            aria-label="Remove link"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <datalist id="link-groups">
        {Array.from(new Set(draft.map((l) => l.group).filter(Boolean))).map((group) => (
          <option key={group} value={group} />
        ))}
      </datalist>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={() =>
            setDraft([...draft, { id: `l${Date.now()}`, label: "", url: "", group: draft[draft.length - 1]?.group || "Links" }])
          }
          className="flex items-center gap-1.5 rounded-xl border border-mist px-4 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
        >
          <Plus size={14} /> Add link
        </button>
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            const cleaned = draft.filter((l) => l.label.trim() && l.url.trim())
              .map((l) => ({ ...l, url: l.url.startsWith("http") ? l.url : `https://${l.url}` }));
            await saveLinks(cleaned);
            setSaving(false);
            setEditMode(false);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-elevate-500 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save links
        </button>
        <button onClick={() => setEditMode(false)} className="flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}
