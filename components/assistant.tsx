"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Send, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  text: string;
  actions?: string[];
}

const SUGGESTIONS = [
  "Add a lead: Maria Gonzalez, 210-555-0134, buyer, Stone Oak, $400K",
  "What's closing this month?",
  "Mark the Dredden survey task done",
  "Move Sagerider closing to 7/20",
];

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const history = [...msgs, { role: "user" as const, text: clean }];
    setMsgs(history);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, text }) => ({ role, text })),
        }),
      });
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: data.reply ?? "Hmm, no reply.", actions: data.actions ?? [] },
      ]);
      if ((data.actions ?? []).length > 0) router.refresh();
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: "Connection hiccup — try that again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="AI assistant"
        className={cn(
          "fixed bottom-5 right-5 z-40 flex h-13 items-center gap-2 rounded-full px-4 py-3.5 font-display text-sm font-bold shadow-card-hover transition-all",
          open
            ? "bg-ink text-white"
            : "bg-elevate-500 text-ink hover:bg-elevate-400 hover:shadow-glow"
        )}
      >
        {open ? <X size={18} /> : <Sparkles size={18} />}
        {!open && <span className="hidden sm:inline">Assistant</span>}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-[540px] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-mist bg-white shadow-card-hover">
          <div className="flex items-center gap-2.5 border-b border-mist bg-gradient-to-r from-elevate-50 to-white px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-elevate-500 text-ink">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="font-display text-sm font-bold leading-tight">Hub Assistant</p>
              <p className="text-[11px] text-ink-faint">Adds & edits records · never deletes</p>
            </div>
          </div>

          <div ref={scrollRef} className="thin-scroll flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-ink-muted">
                  Tell me what to add or change — or paste a text convo and I&apos;ll turn it into a lead.
                </p>
                {SUGGESTIONS.map((sg) => (
                  <button
                    key={sg}
                    onClick={() => send(sg)}
                    className="block w-full rounded-xl border border-mist px-3 py-2 text-left text-xs text-ink-muted transition hover:border-elevate-300 hover:text-ink"
                  >
                    {sg}
                  </button>
                ))}
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-ink text-white"
                      : "rounded-bl-sm bg-chalk text-ink"
                  )}
                >
                  {m.text}
                  {m.actions && m.actions.length > 0 && (
                    <span className="mt-2 flex flex-col gap-1">
                      {m.actions.map((a, j) => (
                        <span key={j} className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={12} /> {a}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2 text-xs text-ink-faint">
                <Loader2 size={13} className="animate-spin" /> Working…
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 border-t border-mist p-3"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={Math.min(4, Math.max(1, input.split("\n").length))}
              placeholder="Add a lead, update a deal, ask anything…"
              className="flex-1 resize-none rounded-xl border border-mist px-3 py-2 text-sm outline-none transition focus:border-elevate-400"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-elevate-500 text-ink transition hover:bg-elevate-400 disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
