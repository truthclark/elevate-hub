"use client";

// Conversational intake in the style Truth's team loves: full-bleed photo
// backdrop, floating white card, one question per screen, dot progress trail,
// brand-cyan actions, and the client's name woven in.

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
  key: string;
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
  coverSrc,
}: {
  funnel: ExperienceFunnel;
  companyName: string;
  brokerageName: string;
  city: string;
  logoUrl?: string | null;
  coverSrc?: string | null;
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

  const showDots = steps.length <= 18;

  return (
    <main className="fixed inset-0 z-50 overflow-y-auto">
      {/* Photo backdrop (elegant brand gradient when no cover is set) */}
      <div className="fixed inset-0">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background:
                "linear-gradient(150deg, #0e5573 0%, #1B1B24 55%, #111118 100%)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-[#111118]/35" />
      </div>

      {/* brand mark */}
      <div className="fixed left-1/2 top-5 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#111118]/45 px-4 py-2 backdrop-blur">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyName} className="h-6 w-6 rounded-md bg-white object-contain p-0.5" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-elevate-500 font-display text-[11px] font-bold text-[#111118]">
            {companyName.charAt(0)}
          </span>
        )}
        <span className="font-display text-[11px] font-semibold tracking-[0.16em] text-white/90">
          {companyName.toUpperCase()}
        </span>
      </div>

      {!started ? (
        /* ── Cover screen ── */
        <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5">
          <div className="animate-rise w-full rounded-3xl bg-[#111118]/55 p-8 text-center text-white backdrop-blur-sm sm:p-12">
            <span className="mx-auto mb-6 block h-px w-16 bg-[#D4A520]" />
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
              {funnel.headline}
            </h1>
            {funnel.subhead && (
              <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/75">
                {funnel.subhead}
              </p>
            )}
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              {steps.length} questions · about 3 minutes
            </p>
            <button
              onClick={() => setStarted(true)}
              className="group mt-8 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-elevate-500 px-8 py-4 font-display text-lg font-bold text-[#111118] transition hover:bg-elevate-400"
            >
              START <ArrowRight size={19} className="transition group-hover:translate-x-1" />
            </button>
          </div>
          <p className="relative mt-5 text-center text-[11px] text-white/60">
            {companyName} · Brokered by {brokerageName} · {city}
          </p>
        </div>
      ) : (
        /* ── One question per card ── */
        <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 py-24">
          <div key={idx} className="animate-rise overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="p-7 sm:p-10">
              <p className="mb-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-[#BA8B00]">
                {idx === 1 && firstName ? `Nice to meet you, ${firstName}` : funnel.name}
              </p>
              <h2 className="font-display text-xl font-bold leading-snug text-ink sm:text-[26px] sm:leading-tight">
                {step.label}
                {step.required && <span className="text-elevate-500"> *</span>}
              </h2>
              {step.hint && <p className="mt-1.5 text-sm text-ink-muted">{step.hint}</p>}

              <div className="mt-6">
                {step.type === "select" ? (
                  <div className={cls("grid gap-2", (step.options?.length ?? 0) > 5 && "sm:grid-cols-2")}>
                    {(step.options ?? []).map((o) => {
                      const selected = value === o;
                      return (
                        <button
                          key={o}
                          onClick={() => {
                            set(o);
                            setTimeout(() => (last ? undefined : setIdx(idx + 1)), 240);
                          }}
                          className={cls(
                            "flex items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left text-[15px] font-medium transition-all",
                            selected
                              ? "border-elevate-500 bg-elevate-50 text-ink"
                              : "border-mist bg-chalk/60 text-ink-soft hover:border-elevate-200 hover:bg-elevate-50/40"
                          )}
                        >
                          {o}
                          {selected && <Check size={16} className="shrink-0 text-elevate-600" />}
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
                    className="w-full rounded-xl border-2 border-mist bg-white px-4 py-3.5 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-elevate-400"
                  />
                ) : (
                  <input
                    ref={inputRef}
                    type={step.type === "email" ? "email" : step.type === "tel" ? "tel" : "text"}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Type your answer…"
                    className="w-full rounded-xl border-2 border-mist bg-white px-4 py-3.5 text-lg text-ink outline-none transition placeholder:text-ink-faint focus:border-elevate-400"
                  />
                )}
              </div>
            </div>

            {/* teal action bar, Jotform-style */}
            <div className="flex">
              {idx > 0 ? (
                <button
                  onClick={() => setIdx(idx - 1)}
                  className="flex flex-1 items-center justify-center gap-2 bg-elevate-500/85 py-4 font-display text-sm font-bold tracking-wide text-[#111118] transition hover:bg-elevate-400"
                >
                  <ArrowLeft size={15} /> PREVIOUS
                </button>
              ) : (
                <span className="flex-1 bg-elevate-500/85" />
              )}
              <button
                onClick={advance}
                disabled={!canContinue || submitting}
                className={cls(
                  "flex flex-1 items-center justify-center gap-2 py-4 font-display text-sm font-bold tracking-wide transition",
                  canContinue
                    ? "bg-elevate-500 text-[#111118] hover:bg-elevate-400"
                    : "cursor-not-allowed bg-elevate-500/50 text-[#111118]/40"
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> SENDING…
                  </>
                ) : last ? (
                  <>SUBMIT{firstName ? `, ${firstName.toUpperCase()}` : ""}</>
                ) : (
                  <>
                    NEXT <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* progress trail */}
          <div className="mt-6 flex flex-col items-center gap-2.5">
            {showDots ? (
              <div className="flex items-center gap-2">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={cls(
                      "h-2 w-2 rounded-full transition-all",
                      i < idx ? "bg-elevate-400" : i === idx ? "h-2.5 w-2.5 bg-white" : "bg-white/35"
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="h-1 w-56 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-elevate-400 transition-all duration-500"
                  style={{ width: `${Math.round(((idx + 1) / steps.length) * 100)}%` }}
                />
              </div>
            )}
            <span className="rounded-full bg-[#111118]/45 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur">
              {idx + 1} of {steps.length}
            </span>
          </div>
        </div>
      )}
    </main>
  );
}
