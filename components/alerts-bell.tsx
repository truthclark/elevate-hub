"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X, CheckCheck } from "lucide-react";
import { Alert } from "@/lib/types";
import { cn } from "@/lib/utils";

// Dismissed alerts are remembered per browser (localStorage) by a stable
// signature. An alert reappears only if its content changes (e.g. "in 3d"
// becomes "in 2d"), which is exactly when it deserves attention again.

const LS_KEY = "hub-dismissed-alerts";
const sig = (a: Alert) => `${a.label}|${a.detail}`;

function loadDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function AlertsBell({ alerts }: { alerts: Alert[] }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[] | null>(null); // null until hydrated

  useEffect(() => {
    const cur = loadDismissed();
    // prune signatures that no longer exist so storage doesn't grow forever
    const live = cur.filter((s) => alerts.some((a) => sig(a) === s));
    if (live.length !== cur.length) localStorage.setItem(LS_KEY, JSON.stringify(live));
    setDismissed(live);
  }, [alerts]);

  const save = (next: string[]) => {
    setDismissed(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — dismissals just won't persist
    }
  };

  const visible = dismissed == null ? alerts : alerts.filter((a) => !dismissed.includes(sig(a)));
  const reds = visible.filter((a) => a.severity === "red").length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl border border-mist bg-white p-2 text-ink-muted transition hover:text-ink"
        aria-label="Alerts"
      >
        <Bell size={17} />
        {visible.length > 0 && (
          <span
            className={cn(
              "absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
              reds > 0 ? "bg-rose-500" : "bg-amber-500"
            )}
            style={{ height: 18 }}
          >
            {visible.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-mist bg-white p-2 shadow-card-hover">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="font-display text-xs font-bold uppercase tracking-wide text-ink-faint">
                Needs attention
              </p>
              {visible.length > 0 && (
                <button
                  onClick={() => save(alerts.map(sig))}
                  className="flex items-center gap-1 text-[11px] font-semibold text-ink-faint transition hover:text-ink"
                  title="Mark all read"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>
            {visible.length === 0 && (
              <p className="px-3 pb-3 text-sm text-ink-muted">All clear. Nothing urgent.</p>
            )}
            <div className="max-h-96 overflow-y-auto thin-scroll">
              {visible.map((a) => (
                <div
                  key={sig(a)}
                  className="group flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition hover:bg-chalk"
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      a.severity === "red" ? "bg-rose-500" : "bg-amber-400"
                    )}
                  />
                  <Link href={a.href} onClick={() => setOpen(false)} className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-snug">{a.label}</span>
                    <span className="block text-xs text-ink-faint">{a.detail}</span>
                  </Link>
                  <button
                    onClick={() => save([...(dismissed ?? []), sig(a)])}
                    className="mt-0.5 shrink-0 rounded p-1 text-ink-faint opacity-0 transition hover:bg-mist hover:text-ink group-hover:opacity-100"
                    aria-label="Dismiss alert"
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
