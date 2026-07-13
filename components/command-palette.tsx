"use client";

// Global search (Cmd-K / Ctrl-K): jump to any deal, lead, task, SOP, or page.
// The index is built server-side in the dashboard layout and passed as props.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveLead, saveTask } from "@/app/actions";
import { Search, FileSignature, Sparkles, CheckSquare, BookOpen, ArrowRight, CornerDownLeft, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchItem {
  type: "Deal" | "Lead" | "Task" | "SOP" | "Page";
  label: string;
  sub?: string;
  href: string;
}

// ── Verbs: type to create, not just find ─────────────────────────
// "lead Sarah Chen 210-555-1234"  → creates the lead
// "task call lender tomorrow 9am" → creates the task
interface Verb {
  label: string;
  detail: string;
  run: () => FormData;
  kind: "lead" | "task";
}

function parseVerb(q: string): Verb | null {
  const leadM = q.match(/^(?:new\s+)?lead\s+(.+)/i);
  if (leadM) {
    let rest = leadM[1].trim();
    const phone = rest.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0] ?? "";
    if (phone) rest = rest.replace(phone, " ");
    const email = rest.match(/\S+@\S+\.\S+/)?.[0] ?? "";
    if (email) rest = rest.replace(email, " ");
    const name = rest.replace(/\s{2,}/g, " ").trim();
    if (!name) return null;
    return {
      kind: "lead",
      label: `Create lead: ${name}`,
      detail: [phone, email].filter(Boolean).join(" · ") || "no contact info yet",
      run: () => {
        const fd = new FormData();
        fd.set("name", name);
        fd.set("phone", phone);
        fd.set("email", email);
        fd.set("source", "Quick add");
        fd.set("type", "Buyer");
        fd.set("followUpStatus", "New — needs first call");
        return fd;
      },
    };
  }
  const taskM = q.match(/^(?:new\s+)?task\s+(.+)/i);
  if (taskM) {
    let title = taskM[1].trim();
    const p2 = (x: number) => String(x).padStart(2, "0");
    const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    let due = iso(new Date());
    let dueTime = "";
    const tom = title.match(/\s\b(tomorrow|tmr)\b/i);
    if (tom) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      due = iso(d);
      title = title.replace(tom[0], " ");
    }
    const tm = title.match(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if (tm) {
      let h = parseInt(tm[1]);
      const mins = tm[2] ? parseInt(tm[2]) : 0;
      if (tm[3].toLowerCase() === "pm" && h < 12) h += 12;
      if (tm[3].toLowerCase() === "am" && h === 12) h = 0;
      dueTime = `${p2(h)}:${p2(mins)}`;
      title = title.replace(tm[0], " ");
    }
    title = title.replace(/\s{2,}/g, " ").trim();
    if (!title) return null;
    return {
      kind: "task",
      label: `Create task: ${title}`,
      detail: `due ${due}${dueTime ? ` at ${dueTime}` : ""}`,
      run: () => {
        const fd = new FormData();
        fd.set("task", title);
        fd.set("dueDate", due);
        if (dueTime) fd.set("dueTime", dueTime);
        fd.set("priority", "Medium");
        return fd;
      },
    };
  }
  return null;
}

const ICONS = {
  Deal: FileSignature,
  Lead: Sparkles,
  Task: CheckSquare,
  SOP: BookOpen,
  Page: ArrowRight,
} as const;

// Small button for the topbar — opens the palette (also Cmd-K / Ctrl-K)
export function SearchTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-palette"))}
      title="Search everything (Cmd-K)"
      className="flex items-center gap-2 rounded-lg border border-mist bg-white px-3 py-2 text-xs text-ink-faint transition hover:text-ink"
    >
      <Search size={14} />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden rounded border border-mist bg-chalk px-1 text-[10px] font-semibold sm:inline">⌘K</kbd>
    </button>
  );
}

export default function CommandPalette({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [running, startRun] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const verb = useMemo(() => parseVerb(q.trim()), [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items.filter((i) => i.type === "Page").slice(0, 8);
    const scored = items
      .map((i) => {
        const hay = `${i.label} ${i.sub ?? ""}`.toLowerCase();
        let score = -1;
        if (i.label.toLowerCase().startsWith(query)) score = 0;
        else if (i.label.toLowerCase().includes(query)) score = 1;
        else if (hay.includes(query)) score = 2;
        return { i, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score);
    return scored.slice(0, 10).map((x) => x.i);
  }, [q, items]);

  useEffect(() => setSel(0), [results.length, q]);

  const go = (item: SearchItem) => {
    setOpen(false);
    router.push(item.href);
  };

  const runVerb = () => {
    if (!verb || running) return;
    const fd = verb.run();
    startRun(async () => {
      if (verb.kind === "lead") await saveLead(fd);
      else await saveTask(fd);
      setOpen(false);
      router.push(verb.kind === "lead" ? "/leads" : "/tasks");
      router.refresh();
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="absolute left-1/2 top-24 w-[92%] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-mist px-4 py-3.5">
          <Search size={18} className="shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter") {
                if (verb) runVerb();
                else if (results[sel]) go(results[sel]);
              }
            }}
            placeholder={`Search — or type "lead …" / "task …" to create`}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
          />
          <kbd className="rounded-md border border-mist bg-chalk px-1.5 py-0.5 text-[10px] font-semibold text-ink-faint">esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {verb && (
            <li>
              <button
                onClick={runVerb}
                disabled={running}
                className="flex w-full items-center gap-3 rounded-xl bg-elevate-50 px-3 py-2.5 text-left text-sm"
              >
                {running ? (
                  <Loader2 size={15} className="animate-spin text-elevate-600" />
                ) : (
                  <Zap size={15} className="text-elevate-600" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{verb.label}</span>
                  <span className="block truncate text-xs text-ink-faint">{verb.detail}</span>
                </span>
                <CornerDownLeft size={13} className="shrink-0 text-ink-faint" />
              </button>
            </li>
          )}
          {!verb && results.map((item, idx) => {
            const Icon = ICONS[item.type];
            return (
              <li key={`${item.type}-${item.href}-${item.label}`}>
                <button
                  onClick={() => go(item)}
                  onMouseEnter={() => setSel(idx)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                    idx === sel ? "bg-elevate-50 text-ink" : "text-ink-muted"
                  )}
                >
                  <Icon size={15} className={idx === sel ? "text-elevate-600" : "text-ink-faint"} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{item.label}</span>
                    {item.sub && <span className="block truncate text-xs text-ink-faint">{item.sub}</span>}
                  </span>
                  <span className="shrink-0 rounded-md bg-mist px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    {item.type}
                  </span>
                  {idx === sel && <CornerDownLeft size={13} className="shrink-0 text-ink-faint" />}
                </button>
              </li>
            );
          })}
          {!verb && results.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-ink-faint">
              No matches for “{q}”. Tip: type “lead Sarah 210-555-1234” or “task call lender tomorrow 9am”.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
