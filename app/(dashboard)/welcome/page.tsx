import Topbar from "@/components/topbar";
import { Section, Avatar } from "@/components/ui";
import { Field, inputCls } from "@/components/modal";
import { MemberModal, AddButton, EditIcon } from "@/components/forms";
import { LogoUploader } from "@/components/image-upload";
import { getAppData } from "@/lib/derive";
import { saveTargets, finishOnboarding } from "@/app/actions";
import { CHECKLIST_TITLES, DEFAULT_MEASURABLES } from "@/lib/types";
import { initialsOf } from "@/lib/utils";
import { currentRole } from "@/auth";
import { Rocket, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const data = await getAppData();
  const role = await currentRole();
  const s = data.settings;
  const t = s.targets[String(s.year)] ?? { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 };
  const isAdmin = role === "Admin";

  const steps = [
    { done: Boolean(s.branding?.logo), label: "Logo uploaded" },
    { done: (t.annual ?? 0) > 0, label: "Annual goal set" },
    { done: data.team.filter((m) => m.active).length >= 2, label: "Team added" },
  ];
  const doneCount = steps.filter((x) => x.done).length;

  return (
    <>
      <Topbar
        title="Welcome to Elevate Hub"
        subtitle="Three quick steps and the whole hub comes alive."
      />

      {/* Progress */}
      <div className="card mb-6 flex flex-wrap items-center gap-4 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-elevate-100 text-elevate-700">
          <Rocket size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{doneCount} of {steps.length} setup steps done</p>
          <div className="mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-elevate-500 transition-all"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {steps.map((st) => (
            <span
              key={st.label}
              className={`chip ${st.done ? "bg-emerald-100 text-emerald-800" : "bg-mist text-ink-muted"}`}
            >
              {st.done && <CheckCircle2 size={12} className="mr-1 inline" />}
              {st.label}
            </span>
          ))}
        </div>
      </div>

      {/* Step 1: brand */}
      <Section title="Step 1 — Make it yours" className="mb-6">
        <p className="mb-4 text-sm text-ink-muted">
          Upload your logo. It shows in the sidebar, the browser tab, and on the
          client-facing timeline pages your buyers and sellers will see.
        </p>
        {isAdmin ? <LogoUploader current={s.branding?.logo} /> : <p className="text-sm text-ink-faint">Ask an admin to upload the logo.</p>}
      </Section>

      {/* Step 2: goals */}
      <Section title={`Step 2 — Set the ${s.year} goal`} className="mb-6">
        <p className="mb-4 text-sm text-ink-muted">
          How many closings this year? The dashboard, quarterly pace chart, and reports
          all measure against this number.
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
      </Section>

      {/* Step 3: team */}
      <Section
        title="Step 3 — Add your people"
        className="mb-6"
        action={isAdmin ? <MemberModal trigger={<AddButton label="Add member" />} /> : undefined}
      >
        <p className="mb-4 text-sm text-ink-muted">
          Anyone listed here as Active with a Google email can sign in. Give each person
          the right roles: Admin runs settings, Agents work deals, Ops keeps the trains running.
        </p>
        <div className="flex flex-wrap gap-3">
          {data.team.map((m) => (
            <span key={m.id} className={`flex items-center gap-2 rounded-xl border border-mist px-3 py-2 ${!m.active ? "opacity-50" : ""}`}>
              <Avatar initials={initialsOf(m.name)} color={m.color} size={26} photo={m.photo} />
              <span className="text-sm font-semibold">{m.name}</span>
              <span className="text-xs text-ink-faint">{m.role}</span>
              {isAdmin && <MemberModal member={m} trigger={<EditIcon />} />}
            </span>
          ))}
        </div>
      </Section>

      {/* Ready to go */}
      <Section title="Already loaded for you">
        <ul className="grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
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
        <form action={finishOnboarding} className="mt-6">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-ink-soft"
          >
            <Rocket size={15} /> Finish setup — take me to the dashboard
          </button>
        </form>
      </Section>
    </>
  );
}
