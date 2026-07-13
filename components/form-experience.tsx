"use client";

// Luxe conversational intake: one question per screen, dark editorial
// styling, tap cards for choices, and the client's name woven in.
// Used for kind="form" pages; funnels keep the classic landing layout.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { submitFunnel } from "@/app/actions";
import { FunnelField } from "@/lib/types";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";

export interface ExperienceFunnel {
  id: number;
  name: string;
  headline: string;
  subhead: string;
  ctaLabel: string;
  fields: FunnelField[];
}

interface Step {
  key: string; // form field name
  label: string;
  type: "text" | "long" | "select" | "email" | "tel";
  options?: string[];
  required?: boolean;
  hint?: string;
}

const cls = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export default function FormExperience({
  funnel,
  companyName,
  brokerageName,
  city,
  logoUrl,
}: {
  funnel: ExperienceFunnel;
  companyName: string;
  brokerageName: string;
  city: string;
  logoUrl?: string | null;
}) {
  const steps: Step[] = useMemo(
    () => [
      { key: "name", label: "First things first — what's your name?", type: "text", required: true, hint: "First and last is perfect." },
      { key: "email", label: "Where should we send things?", type: "email", required: true, hint: "Your email — no spam, ever." },
      { key: "phone", label: "Best number to reach you?", type: "tel", hint: "Optional — some people are texters, some aren't." },
      ...funnel.fields.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        options: f.options,
        required: f.required,
      })),
    ],
    [funnel.fields]
  );

  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, startSubmit] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  const step = steps[idx];
  const value = values[step?.key] ?? "";
  const firstName = (values["name"] ?? "").trim().split(" ")[0];
  const canContinue = !step?.required || value.trim().length > 0;
  const last = idx === steps.length - 1;
  const pct = started ? Math.round(((idx + 1) / steps.length) * 100) : 0;

  useEffect(() => {
    if (!started) return;
    const t = setTimeout(() => (inputRef.current ?? areaRef.current)?.focus(), 260);
    return () => clearTimeout(t);
  }, [idx, started]);

  const set = (v: string) => setValues((cur) => ({ ...cur, [step.key]: v }));

  const submit = () => {
    const fd = new FormData();
    fd.set("funnelId", String(funnel.id));
    fd.set("website", ""); // honeypot stays empty
    for (const st of steps) fd.set(st.key, values[st.key] ?? "");
    startSubmit(async () => {
      await submitFunnel(fd); // server action redirects to the thank-you view
    });
  };

  const advance = () => {
    if (!canContinue || submitting) return;
    if (last) submit();
    else setIdx(idx + 1);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !(step.type === "long" && e.shiftKey)) {
      e.preventDefault();
      advance();
    }
  };

  return (
    <main className="fixed inset-0 z-50 overflow-y-auto bg-[#111118] text-white">
      {/* ambient */}
      <div className="dot-grid pointer-events-none fixed inset-0 opacity-40" />
      <div
        className="pointer-events-none fixed -right-40 -top-40 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #05c3f9, transparent 70%)" }}
      />

      {/* progress hairline */}
      {started && (
        <div className="fixed inset-x-0 top-0 z-10 h-0.5 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-elevate-500 to-[#D4A520] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* brand mark */}
      <div className="fixed left-0 right-0 top-0 z-10 flex items-center justify-center gap-2.5 pt-6">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyName} className="h-7 w-7 rounded-lg bg-white object-contain p-0.5" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-elevate-500 font-display text-xs font-bold text-[#111118]">
            {companyName.charAt(0)}
          </span>
        )}
        <span className="font-display text-xs font-semibold tracking-[0.18em] text-white/70">
          {companyName.toUpperCase()}
        </span>
      </div>

      {!started ? (
        /* ── Intro screen ── */
        <div className="animate-rise mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <span className="mb-6 block h-px w-16 bg-[#D4A520]/70" />
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            {funnel.headline}
          </h1>
          {funnel.subhead && (
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">{funnel.subhead}</p>
          )}
          <button
            onClick={() => setStarted(true)}
            className="group mt-10 flex items-center gap-2.5 rounded-full bg-elevate-500 px-8 py-3.5 font-display font-bold text-[#111118] transition hover:bg-elevate-400"
          >
            Begin <ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
          </button>
          <p className="mt-4 text-xs text-white/40">
            {steps.length} questions · about 3 minutes
          </p>
          <p className="fixed bottom-6 left-0 right-0 text-center text-[11px] text-white/30">
            {companyName} · Brokered by {brokerageName} · {city}
          </p>
        </div>
      ) : (
        /* ── One question at a time ── */
        <div
          key={idx}
          className="animate-rise mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-24"
        >
          <p className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4A520]">
            {idx === 1 && firstName ? `Nice to meet you, ${firstName}` : `Question ${idx + 1} of ${steps.length}`}
          </p>
          <h2 className="font-display text-2xl font-bold leading-snug sm:text-[32px] sm:leading-tight">
            {step.label}
            {step.required && <span className="text-elevate-400"> *</span>}
          </h2>
          {step.hint && <p className="mt-2 text-sm text-white/50">{step.hint}</p>}

          <div className="mt-8">
            {step.type === "select" ? (
              <div className={cls("grid gap-2.5", (step.options?.length ?? 0) > 5 && "sm:grid-cols-2")}>
                {(step.options ?? []).map((o) => {
                  const selected = value === o;
                  return (
                    <button
                      key={o}
                      onClick={() => {
                        set(o);
                        setTimeout(() => (last ? undefined : setIdx(idx + 1)), 260);
                      }}
                      className={cls(
                        "flex items-center justify-between rounded-2xl border px-5 py-4 text-left text-[15px] font-medium transition-all",
                        selected
                          ? "border-[#D4A520] bg-elevate-500/10 text-white"
                          : "border-white/15 bg-white/5 text-white/80 hover:border-white/35 hover:bg-white/10"
                      )}
                    >
                      {o}
                      {selected && <Check size={16} className="shrink-0 text-[#D4A520]" />}
                    </button>
                  );
                })}
              </div>
            ) : step.type === "long" ? (
              <textarea
                ref={areaRef}
                value={value}
                onChange={(e) => set(e.target.value)}
                onKeyDown={onKey}
                rows={4}
                placeholder="Take your time — we read every word."
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-[15px] text-white outline-none transition placeholder:text-white/30 focus:border-elevate-400"
              />
            ) : (
              <input
                ref={inputRef}
                type={step.type === "email" ? "email" : step.type === "tel" ? "tel" : "text"}
                value={value}
                onChange={(e) => set(e.target.value)}
                onKeyDown={onKey}
                placeholder="Type your answer…"
                className="w-full border-b-2 border-white/20 bg-transparent px-1 py-3 font-display text-xl text-white outline-none transition placeholder:text-white/25 focus:border-elevate-400"
              />
            )}
          </div>

          <div className="mt-9 flex items-center gap-3">
            {idx > 0 && (
              <button
                onClick={() => setIdx(idx - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:border-white/35 hover:text-white"
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <button
              onClick={advance}
              disabled={!canContinue || submitting}
              className={cls(
                "group flex items-center gap-2.5 rounded-full px-7 py-3 font-display font-bold transition",
                canContinue
                  ? "bg-elevate-500 text-[#111118] hover:bg-elevate-400"
                  : "cursor-not-allowed bg-white/10 text-white/30"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Sending…
                </>
              ) : last ? (
                <>{firstName ? `${funnel.ctaLabel}, ${firstName}` : funnel.ctaLabel}</>
              ) : (
                <>
                  Continue <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
            {!last && step.type !== "select" && (
              <span className="hidden text-xs text-white/30 sm:block">press Enter ↵</span>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
