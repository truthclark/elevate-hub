import Topbar from "@/components/topbar";
import { Section } from "@/components/ui";
import { Field, inputCls } from "@/components/modal";
import { ImportExport, TemplatesEditor, ChecklistsEditor, BrokerageEditor } from "@/components/settings-panels";
import { LogoUploader } from "@/components/image-upload";
import { getAppData } from "@/lib/derive";
import { saveTargets, saveBrokerage, saveBrandInfo, disconnectCalendar } from "@/app/actions";
import { store } from "@/lib/store";
import { DEFAULT_BROKERAGE } from "@/lib/types";
import { brandOf } from "@/lib/brand";
import { currentRole, auth, authConfigured } from "@/auth";
import { sheetConfigured } from "@/lib/import";
import { Database, ShieldAlert, CalendarDays, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { calendar?: string };
}) {
  const data = await getAppData();
  const role = await currentRole();
  const connections = await store.listCalendarConnections();
  const connectedEmails = new Set(connections.map((c) => c.email.toLowerCase()));
  const session = authConfigured ? await auth() : null;
  const myEmail = session?.user?.email?.toLowerCase() ?? "";
  const calStatus = searchParams?.calendar;
  const s = data.settings;
  const brand = brandOf(s);
  const t = s.targets[String(s.year)] ?? { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 };

  if (role !== "Admin") {
    const me = data.team.find((m) => m.email.toLowerCase() === myEmail);
    const connected = Boolean(myEmail) && connectedEmails.has(myEmail);
    return (
      <>
        <Topbar title="Settings" />
        {/* Everyone can manage their own calendar connection */}
        <Section title="My calendar — appointments in My Day" className="mb-6">
          {calStatus === "connected" && (
            <p className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={15} /> Google Calendar connected. Your appointments now show in My Day.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <CalendarDays size={16} className={connected ? "text-emerald-600" : "text-ink-faint"} />
            <span className="min-w-0 flex-1 text-sm">
              {me?.name ?? "You"} · {myEmail || "no email"}
            </span>
            {connected ? (
              <>
                <span className="chip bg-emerald-100 text-emerald-800">Google connected</span>
                <form action={disconnectCalendar}>
                  <input type="hidden" name="email" value={myEmail} />
                  <button className="text-xs font-semibold text-ink-faint hover:text-rose-600">
                    Disconnect
                  </button>
                </form>
              </>
            ) : (
              <a
                href="/api/gcal/connect"
                className="rounded-xl bg-elevate-500 px-3.5 py-2 text-xs font-bold text-ink transition hover:bg-elevate-400"
              >
                Connect Google Calendar
              </a>
            )}
          </div>
        </Section>
        <div className="card flex items-center gap-3 p-6 text-sm text-ink-muted">
          <ShieldAlert size={18} className="text-amber-500" />
          Everything else here is admin-only. Ask a team admin if something needs changing.
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Settings" subtitle="Goals, data, and your SOP task templates." />

      {/* Storage status */}
      <div className="card mb-6 flex items-start gap-3 p-4">
        <Database size={18} className="mt-0.5 shrink-0 text-elevate-600" />
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">Storage:</span>{" "}
          {data.demoMode ? (
            <>
              running in <span className="font-semibold">demo mode</span> — data lives in
              memory and resets on restart. Add a <code className="rounded bg-mist px-1">DATABASE_URL</code>{" "}
              (free Neon Postgres, see README) to make everything permanent.
            </>
          ) : (
            <>connected to Postgres — all changes are saved permanently.</>
          )}
        </p>
      </div>

      {/* Year + targets */}
      <Section title={`Goals — ${s.year}`} className="mb-6">
        <form action={saveTargets} className="flex flex-wrap items-end gap-3">
          <Field label="Active year">
            <input name="year" defaultValue={s.year} className={inputCls} style={{ width: 90 }} />
          </Field>
          <Field label="Annual closings">
            <input name="annual" defaultValue={t.annual} className={inputCls} style={{ width: 90 }} />
          </Field>
          {(["q1", "q2", "q3", "q4"] as const).map((q) => (
            <Field key={q} label={q.toUpperCase()}>
              <input name={q} defaultValue={t[q]} className={inputCls} style={{ width: 70 }} />
            </Field>
          ))}
          <button
            type="submit"
            className="rounded-xl bg-elevate-500 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400"
          >
            Save goals
          </button>
        </form>
        <p className="mt-3 text-xs text-ink-faint">
          New year? Change the year and set fresh targets — prior years stay saved
          and the dashboard switches to the active year.
        </p>
      </Section>

      {/* Branding */}
      <Section title="Branding" className="mb-6">
        <LogoUploader current={s.branding?.logo} />
        <form action={saveBrandInfo} className="mt-5 border-t border-mist pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="App name">
              <input name="appName" defaultValue={s.branding?.appName ?? ""} placeholder={brand.appName} className={inputCls} />
            </Field>
            <Field label="Team / company name">
              <input name="companyName" defaultValue={s.branding?.companyName ?? ""} placeholder={brand.companyName} className={inputCls} />
            </Field>
            <Field label="Brokerage">
              <input name="brokerageName" defaultValue={s.branding?.brokerageName ?? ""} placeholder={brand.brokerageName} className={inputCls} />
            </Field>
            <Field label="City / market">
              <input name="city" defaultValue={s.branding?.city ?? ""} placeholder={brand.city} className={inputCls} />
            </Field>
          </div>
          <Field label="Tagline">
            <input name="tagline" defaultValue={s.branding?.tagline ?? ""} placeholder={brand.tagline} className={inputCls} />
          </Field>
          <button
            type="submit"
            className="mt-2 rounded-xl bg-elevate-500 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400"
          >
            Save branding
          </button>
          <p className="mt-3 text-xs text-ink-faint">
            These power the sidebar, login page, client share pages, and email footers.
          </p>
        </form>
      </Section>

      {/* Brokerage split, cap reset, fees */}
      <Section title="Brokerage split & fees (drives GCI breakdown & P&L)" className="mb-6">
        <BrokerageEditor brokerage={s.brokerage ?? DEFAULT_BROKERAGE} action={saveBrokerage} />
        <p className="mt-3 text-xs text-ink-faint">
          Team net = net GCI (after referral fees) minus the split (until the cap is met
          within the cap year) minus per-transaction fees.
        </p>
      </Section>

      {/* Calendars */}
      <Section title="Calendars — appointments in My Day" className="mb-6">
        {calStatus === "connected" && (
          <p className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 size={15} /> Google Calendar connected. Your appointments now show in My Day.
          </p>
        )}
        {calStatus === "error" && (
          <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Connection didn&apos;t complete — try again. If it keeps failing, make sure the
            callback URL is added in Google Cloud console (see below).
          </p>
        )}
        <ul className="space-y-2">
          {data.team.filter((m) => m.active).map((m) => {
            const email = m.email.toLowerCase();
            const connected = Boolean(email) && connectedEmails.has(email);
            const isMe = Boolean(email) && email === myEmail;
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-mist/70 px-3.5 py-2.5">
                <CalendarDays size={15} className={connected ? "text-emerald-600" : "text-ink-faint"} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{m.name}</span>
                  <span className="block text-xs text-ink-faint">{m.email || "no email on file"}</span>
                </span>
                {connected ? (
                  <>
                    <span className="chip bg-emerald-100 text-emerald-800">Google connected</span>
                    {(isMe || role === "Admin") && (
                      <form action={disconnectCalendar}>
                        <input type="hidden" name="email" value={m.email} />
                        <button className="text-xs font-semibold text-ink-faint hover:text-rose-600">
                          Disconnect
                        </button>
                      </form>
                    )}
                  </>
                ) : isMe ? (
                  <a
                    href="/api/gcal/connect"
                    className="rounded-xl bg-elevate-500 px-3.5 py-2 text-xs font-bold text-ink transition hover:bg-elevate-400"
                  >
                    Connect Google Calendar
                  </a>
                ) : (
                  <span className="text-xs text-ink-faint">
                    {m.calendarUrl ? "using iCal feed" : "not connected — they connect from their own login"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-ink-faint">
          Each person connects from their own login (read-only access). One-time setup in
          Google Cloud console: add{" "}
          <code className="rounded bg-mist px-1">https://YOUR-APP.vercel.app/api/gcal/callback</code>{" "}
          to the OAuth client&apos;s redirect URIs and enable the Google Calendar API.
          The iCal feed URL on a team profile still works as a fallback (Outlook, Apple).
        </p>
      </Section>

      {/* Morning digest */}
      <Section title="Morning digest email" className="mb-6">
        <p className="text-sm text-ink-muted">
          Every weekday at 7am Central, each active team member gets an email with their
          overdue tasks, today&apos;s tasks, and any contract deadlines in the next 3 days.{" "}
          <a href="/api/digest?preview=1" target="_blank" className="font-semibold text-elevate-600 hover:underline">
            Preview today&apos;s digest
          </a>{" "}
          ·{" "}
          <a href="/api/digest" target="_blank" className="font-semibold text-elevate-600 hover:underline">
            Send it now
          </a>
        </p>
        {!process.env.RESEND_API_KEY && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Sending is off until you add a <code className="rounded bg-amber-100 px-1">RESEND_API_KEY</code>{" "}
            environment variable (free at resend.com). Preview works without it.
          </p>
        )}
      </Section>

      {/* Import / export */}
      <Section title="Data — import & backup" className="mb-6">
        <ImportExport sheetReady={sheetConfigured()} />
        <p className="mt-4 border-t border-mist pt-3 text-sm text-ink-muted">
          <span className="font-semibold text-ink">Nightly backup:</span> every night at 3am
          Central, the full backup file is emailed to all admins automatically.{" "}
          <a href="/api/backup" target="_blank" className="font-semibold text-elevate-600 hover:underline">
            Send one now
          </a>
          {!process.env.RESEND_API_KEY && (
            <span className="text-amber-700"> (needs the same RESEND_API_KEY as the digest)</span>
          )}
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          Looking for something you archived?{" "}
          <a href="/archive" className="font-semibold text-elevate-600 hover:underline">
            Open the archive
          </a>{" "}
          to restore deals or leads.
        </p>
      </Section>

      {/* Workflow checklists */}
      <Section title="Workflow checklists" className="mb-6">
        <p className="mb-4 text-sm text-ink-muted">
          These are the checkboxes on every client, listing, and referral record.
          Buyers get the Buyer Readiness Checklist, sellers get the Pre-Listing
          Checklist, and referrals get the Referral Preparation Checklist.
        </p>
        <ChecklistsEditor settings={s} />
      </Section>

      {/* Templates */}
      <Section title="SOP task templates">
        <p className="mb-4 text-sm text-ink-muted">
          When you add a deal (or one goes pending), pick a template and the whole
          SOP becomes tasks — assigned and dated automatically. Edit them to match
          how Elevate runs.
        </p>
        <TemplatesEditor settings={s} />
      </Section>
    </>
  );
}
