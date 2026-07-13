import { Avatar } from "@/components/ui";
import { Field, inputCls } from "@/components/modal";
import { MemberModal, AddButton, EditIcon } from "@/components/forms";
import { LogoUploader } from "@/components/image-upload";
import FinishOnboarding from "@/components/finish-onboarding";
import CountUp from "@/components/count-up";
import { getAppData } from "@/lib/derive";
import { saveTargets } from "@/app/actions";
import { CHECKLIST_TITLES, DEFAULT_MEASURABLES } from "@/lib/types";
import { brandOf } from "@/lib/brand";
import { initialsOf, cn } from "@/lib/utils";
import { currentRole } from "@/auth";
import { CheckCircle2, Palette, Target, UsersRound, Sparkles } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

// The first five minutes of the Hub — this page is the buying moment.
export default async function WelcomePage() {
  const data = await getAppData();
  const role = await currentRole();
  const s = data.settings;
  const brand = brandOf(s);
  const t = s.targets[String(s.year)] ?? { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 };
  const isAdmin = role === "Admin";

  const steps = [
    { done: Boolean(s.branding?.logo), label: "Brand it" },
    { done: (t.annual ?? 0) > 0, label: "Set the goal" },
    { done: data.team.filter((m) => m.active).length >= 2, label: "Add the team" },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const allDone = doneCount === steps.length;

  const StepBadge = ({ n, done }: { n: number; done: boolean }) => (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-display text-sm font-bold transition",
        done
          ? "border-emerald-500 bg-emerald-500 text-white"
          : "border-elevate-300 bg-white text-elevate-700"
      )}
    >
      {done ? <CheckCircle2 size={17} /> : n}
    </span>
  );

  return (
    <>
      {/* Cinematic hero */}
      <div className="card relative mb-6 overflow-hidden bg-ink p-8 text-white sm:p-10">
        <div className="dot-grid absolute inset-0" />
        <div
          className="absolute -right-24 -top-28 h-80 w-80 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #05c3f9, transparent 70%)" }}
        />
        <div className="relative z-10">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-[#D4A520]">
            Welcome to {brand.appName}
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
            Three steps and this whole thing lights up.
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              {steps.map((st, i) => (
                <span key={st.label} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 font-display text-xs font-bold",
                      st.done
                        ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                        : "border-white/25 text-white/50"
                    )}
                  >
                    {st.done ? <CheckCircle2 size={15} /> : i + 1}
                  </span>
                  {i < steps.length - 1 && <span className="h-px w-6 bg-white/20" />}
                </span>
              ))}
            </div>
            <p className="text-sm text-white/60">
              {allDone ? "All set — go launch." : `${doneCount} of ${steps.length} done`}
            </p>
            {(t.annual ?? 0) > 0 && (
              <p className="ml-auto text-right">
                <span className="font-display text-3xl font-bold text-elevate-400">
                  <CountUp text={String(t.annual)} />
                </span>
                <span className="block text-xs text-white/50">closings — the {s.year} mission</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Step 1: brand */}
      <div className="card mb-4 p-6">
        <div className="flex items-start gap-4">
          <StepBadge n={1} done={steps[0].done} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-display text-base font-bold">
              <Palette size={16} className="text-elevate-600" /> Make it yours
            </p>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Your logo shows in the sidebar, the browser tab, your funnels, and the
              client-facing pages buyers and sellers screenshot for their friends.
            </p>
            {isAdmin ? (
              <LogoUploader current={s.branding?.logo} />
            ) : (
              <p className="text-sm text-ink-faint">Ask an admin to upload the logo.</p>
            )}
          </div>
        </div>
      </div>

      {/* Step 2: goal */}
      <div className="card mb-4 p-6">
        <div className="flex items-start gap-4">
          <StepBadge n={2} done={steps[1].done} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-display text-base font-bold">
              <Target size={16} className="text-elevate-600" /> Set the {s.year} goal
            </p>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              How many closings this year? The dashboard hero, quarterly pace, and every
              report measures against this one number.
            </p>
            {isAdmin ? (
              <form action={saveTargets} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="year" value={s.year} />
                <Field label="Annual closings">
                  <input name="annual" defaultValue={t.annual || ""} placeholder="e.g. 51" className={inputCls} style={{ width: 110 }} />
                </Field>
                {(["q1", "q2", "q3", "q4"] as const).map((q) => (
                  <Field key={q} label={q.toUpperCase()}>
                    <input name={q} defaultValue={t[q] || ""} className={inputCls} style={{ width: 70 }} />
                  </Field>
                ))}
                <button
                  type="submit"
                  className="rounded-xl bg-elevate-500 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400"
                >
                  Save goal
                </button>
              </form>
            ) : (
              <p className="text-sm text-ink-faint">Ask an admin to set the goals.</p>
            )}
          </div>
        </div>
      </div>

      {/* Step 3: team */}
      <div className="card mb-4 p-6">
        <div className="flex items-start gap-4">
          <StepBadge n={3} done={steps[2].done} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-display text-base font-bold">
                <UsersRound size={16} className="text-elevate-600" /> Add your people
              </p>
              {isAdmin && <MemberModal trigger={<AddButton label="Add member" />} />}
            </div>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Anyone Active with a Google email can sign in. Admins run settings, Agents
              work deals, Ops keeps the trains running.
            </p>
            <div className="flex flex-wrap gap-3">
              {data.team.map((m) => (
                <span
                  key={m.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border border-mist px-3 py-2",
                    !m.active && "opacity-50"
                  )}
                >
                  <Avatar initials={initialsOf(m.name)} color={m.color} size={26} photo={m.photo} />
                  <span className="text-sm font-semibold">{m.name}</span>
                  <span className="text-xs text-ink-faint">{m.role}</span>
                  {isAdmin && <MemberModal member={m} trigger={<EditIcon />} />}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Already loaded + launch */}
      <div className="card p-6">
        <p className="flex items-center gap-2 font-display text-base font-bold">
          <Sparkles size={16} className="text-[#BA8B00]" /> Already loaded for you
        </p>
        <ul className="mt-3 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
          <li>• {CHECKLIST_TITLES.Buyer}, {CHECKLIST_TITLES.Listing}, and {CHECKLIST_TITLES.Referral} (edit in Settings)</li>
          <li>• SOP task templates that auto-build task lists on every new deal</li>
          <li>• A starter SOP library and {DEFAULT_MEASURABLES.length} scorecard measurables</li>
          <li>
            • Bring existing data in from{" "}
            <Link href="/settings" className="font-semibold text-elevate-600 hover:underline">
              Settings → Import
            </Link>
          </li>
        </ul>
        <div className="mt-6">
          <FinishOnboarding allDone={allDone} />
        </div>
      </div>
    </>
  );
}
