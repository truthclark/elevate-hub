import Topbar from "@/components/topbar";
import {
  StatCard,
  Section,
  StatusBadge,
  TypeBadge,
  Table,
  Td,
  Progress,
  EmptyState,
} from "@/components/ui";
import { QuarterChart, SourcePie } from "@/components/charts";
import {
  getAppData,
  pipelineStats,
  taskBuckets,
  dealGci,
  isClosed,
  isPending,
  isActive,
} from "@/lib/derive";
import { fmtMoney, fmtDate, daysUntil, parseDateSafe } from "@/lib/utils";
import { fetchCalendarEvents } from "@/lib/ics";
import { fetchGoogleCalendarEvents } from "@/lib/gcal";
import { auth, authConfigured } from "@/auth";
import {
  Users,
  FileSignature,
  DollarSign,
  TrendingUp,
  CalendarClock,
  CheckSquare,
  Sparkles,
  Clock,
  AlertCircle,
  Home,
} from "lucide-react";
import Link from "next/link";
import { markOnboarded } from "@/app/actions";
import { X, Rocket } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getAppData();
  const year = data.settings.year;
  const targets = data.settings.targets[String(year)] ?? { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 };
  const deals = data.deals.filter((d) => d.year === year);
  const stats = pipelineStats(deals, targets);
  const { overdue, dueToday, open } = taskBuckets(data.tasks);

  // Today's focus: greeting + next appointment (from connected calendars)
  const tz = process.env.CALENDAR_TZ || "America/Chicago";
  const hour = Number(
    new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false })
  );
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  let firstName = "";
  if (authConfigured) {
    const session = await auth();
    firstName = session?.user?.name?.split(" ")[0] ?? "";
  }
  const todayIso = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const google = await fetchGoogleCalendarEvents(data.team, todayIso, todayIso).catch(
    () => ({ events: [], connectedEmails: new Set<string>() })
  );
  const icsTeam = data.team.filter(
    (m) => !m.email || !google.connectedEmails.has(m.email.toLowerCase())
  );
  const icsEvents = await fetchCalendarEvents(icsTeam, todayIso, todayIso).catch(() => []);
  const nowMinutes =
    Number(new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false })) * 60 +
    Number(new Date().toLocaleString("en-US", { timeZone: tz, minute: "numeric" }));
  const nextAppt = [...google.events, ...icsEvents]
    .filter((e) => e.time && e.minutes >= nowMinutes)
    .sort((a, b) => a.minutes - b.minutes)[0];

  // Sparklines: closed units / volume / GCI per month this year
  const sparkMonths = new Date().getMonth() + 1;
  const sparkUnits = Array.from({ length: sparkMonths }, () => 0);
  const sparkVolume = Array.from({ length: sparkMonths }, () => 0);
  const sparkGci = Array.from({ length: sparkMonths }, () => 0);
  for (const d of deals.filter(isClosed)) {
    const dt = parseDateSafe(d.closedDate || d.closeDate);
    if (!dt || dt.getMonth() >= sparkMonths) continue;
    sparkUnits[dt.getMonth()] += 1;
    sparkVolume[dt.getMonth()] += d.price ?? 0;
    sparkGci[dt.getMonth()] += dealGci(d) ?? 0;
  }

  const activeBuyers = deals.filter((d) => d.side === "Buyer" && isActive(d) && !isClosed(d));
  const activeListings = deals.filter((d) => d.side === "Listing" && isActive(d) && !isClosed(d));
  const pendingDeals = deals.filter(isPending);

  const upcoming = deals
    .filter((d) => {
      const days = daysUntil(d.closeDate);
      return days != null && days >= 0 && !isClosed(d);
    })
    .sort((a, b) => (daysUntil(a.closeDate) ?? 999) - (daysUntil(b.closeDate) ?? 999))
    .slice(0, 5);

  const pct = targets.annual ? Math.round((stats.unitsClosed / targets.annual) * 100) : 0;

  const sourceCounts: Record<string, number> = {};
  for (const d of deals) if (d.source) sourceCounts[d.source] = (sourceCounts[d.source] ?? 0) + 1;
  const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));

  return (
    <>
      <Topbar title="Dashboard" subtitle="Where the team stands right now." />

      {/* First-run setup banner */}
      {!data.settings.onboarded && (
        <div className="card mb-6 flex items-center gap-3 border-elevate-200 bg-gradient-to-r from-elevate-50 to-white p-4">
          <Rocket size={18} className="shrink-0 text-elevate-600" />
          <p className="min-w-0 flex-1 text-sm text-ink-muted">
            <span className="font-semibold text-ink">New here?</span> Three quick steps
            (logo, goal, team) and everything lights up.
          </p>
          <Link
            href="/welcome"
            className="shrink-0 rounded-xl bg-elevate-500 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400"
          >
            Start setup
          </Link>
          <form action={markOnboarded}>
            <button type="submit" className="rounded-lg p-1.5 text-ink-faint hover:bg-mist" aria-label="Dismiss">
              <X size={15} />
            </button>
          </form>
        </div>
      )}

      {/* Hero: annual goal */}
      <div className="card relative mb-6 overflow-hidden bg-ink p-6 text-white sm:p-8">
        <div className="dot-grid absolute inset-0" />
        <div
          className="absolute -right-24 -top-32 h-96 w-96 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #05c3f9, transparent 70%)" }}
        />
        <div className="relative z-10 mb-6 flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="font-display text-lg font-bold">
            {greeting}
            {firstName ? `, ${firstName}` : ""}.
          </p>
          <span className="flex flex-wrap items-center gap-2 text-xs">
            {nextAppt && (
              <span className="flex items-center gap-1.5 rounded-full bg-elevate-500/20 px-3 py-1.5 font-semibold text-elevate-300">
                <Clock size={12} /> Next: {nextAppt.time.replace(" ", "").toLowerCase()} · {nextAppt.title}
              </span>
            )}
            <Link href="/tasks" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white/80 transition hover:bg-white/20">
              <CheckSquare size={12} /> {dueToday.length} due today
            </Link>
            {overdue.length > 0 && (
              <Link href="/tasks?view=all" className="flex items-center gap-1.5 rounded-full bg-rose-500/25 px-3 py-1.5 font-semibold text-rose-200 transition hover:bg-rose-500/35">
                <AlertCircle size={12} /> {overdue.length} overdue
              </Link>
            )}
            {upcoming.filter((d) => (daysUntil(d.closeDate) ?? 99) <= 7).length > 0 && (
              <Link href="/deals?view=contract" className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1.5 font-semibold text-emerald-300 transition hover:bg-emerald-500/30">
                <Home size={12} /> {upcoming.filter((d) => (daysUntil(d.closeDate) ?? 99) <= 7).length} closing this week
              </Link>
            )}
          </span>
        </div>
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              {year} goal
            </p>
            <p className="mt-2 font-display text-4xl font-bold">
              {stats.unitsClosed}
              <span className="text-white/40"> / {targets.annual} closings</span>
            </p>
            <div className="mt-4 w-64 max-w-full">
              <Progress pct={pct} />
              <p className="mt-1.5 text-xs text-white/50">
                {pct}% of target · {stats.unitsPending} pending
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-white/50">Closed volume</p>
              <p className="font-display text-2xl font-bold text-emerald-400">
                {fmtMoney(stats.volume.closed, true)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50">Closed GCI</p>
              <p className="font-display text-2xl font-bold text-emerald-400">
                {fmtMoney(stats.gci.closed, true)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50">Pending volume</p>
              <p className="font-display text-2xl font-bold text-amber-400">
                {fmtMoney(stats.volume.pending, true)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50">Pending GCI</p>
              <p className="font-display text-2xl font-bold text-amber-400">
                {fmtMoney(stats.gci.pending, true)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50">Pipeline volume</p>
              <p className="font-display text-2xl font-bold text-elevate-400">
                {fmtMoney(stats.pipelineVolume, true)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50">Pipeline GCI</p>
              <p className="font-display text-2xl font-bold text-elevate-400">
                {fmtMoney(stats.pipelineGci, true)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat grid — each card deep-links to its page */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link href="/deals">
          <StatCard
            label="Active clients"
            value={String(activeBuyers.length + activeListings.length)}
            sub={`${activeBuyers.length} buyers · ${activeListings.length} listings`}
            icon={Users}
            tint="cyan"
          />
        </Link>
        <Link href="/deals?view=contract">
          <StatCard
            label="Pending contracts"
            value={String(pendingDeals.length)}
            sub={fmtMoney(pendingDeals.reduce((s, d) => s + (d.price ?? 0), 0), true)}
            icon={FileSignature}
            tint="amber"
          />
        </Link>
        <Link href="/deals?view=closed">
          <StatCard
            label="Closed volume YTD"
            value={fmtMoney(stats.volume.closed, true)}
            sub={`${fmtMoney(stats.volume.pending, true)} pending`}
            icon={TrendingUp}
            tint="green"
            spark={sparkVolume}
          />
        </Link>
        <Link href="/money">
          <StatCard
            label="GCI YTD"
            value={fmtMoney(stats.gci.closed, true)}
            sub={`${fmtMoney(stats.gci.pending, true)} pending`}
            icon={DollarSign}
            tint="slate"
            spark={sparkGci}
          />
        </Link>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Section title="Quarterly pace" className="lg:col-span-2">
          <QuarterChart data={stats.quarters} />
        </Section>

        <Section
          title="Tasks"
          action={
            <Link href="/tasks" className="text-xs font-semibold text-elevate-600 hover:underline">
              View all →
            </Link>
          }
        >
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-rose-50 p-3">
              <p className="font-display text-xl font-bold text-rose-600">{overdue.length}</p>
              <p className="text-[11px] text-ink-muted">Overdue</p>
            </div>
            <div className="rounded-xl bg-elevate-50 p-3">
              <p className="font-display text-xl font-bold text-elevate-700">{dueToday.length}</p>
              <p className="text-[11px] text-ink-muted">Due today</p>
            </div>
            <div className="rounded-xl bg-mist p-3">
              <p className="font-display text-xl font-bold">{open.length}</p>
              <p className="text-[11px] text-ink-muted">Open</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {open.slice(0, 4).map((t) => (
              <li key={t.id} className="flex items-start gap-2.5 text-sm">
                <CheckSquare size={15} className="mt-0.5 shrink-0 text-ink-faint" />
                <div className="min-w-0">
                  <p className="truncate">{t.task}</p>
                  <p className="text-xs text-ink-faint">
                    {t.assignedTo || "Unassigned"} · {fmtDate(t.dueDate)}
                  </p>
                </div>
              </li>
            ))}
            {open.length === 0 && <EmptyState message="No open tasks 🎉" />}
          </ul>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Upcoming closings"
          className="lg:col-span-2"
          action={
            <Link href="/deals?view=contract" className="text-xs font-semibold text-elevate-600 hover:underline">
              All deals →
            </Link>
          }
        >
          {upcoming.length > 0 ? (
            <Table headers={["Client / Property", "Side", "Close", "Price", "GCI", "Status"]}>
              {upcoming.map((d) => (
                <tr key={d.id} className="hover:bg-chalk/60">
                  <Td className="font-semibold">{d.address || d.name}</Td>
                  <Td><TypeBadge value={d.side} /></Td>
                  <Td>
                    <span className="flex items-center gap-1.5">
                      <CalendarClock size={14} className="text-elevate-600" />
                      {fmtDate(d.closeDate)}
                    </span>
                  </Td>
                  <Td>{fmtMoney(d.price)}</Td>
                  <Td className="text-emerald-700">{fmtMoney(dealGci(d))}</Td>
                  <Td><StatusBadge value={d.status} /></Td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState message="No closings on the calendar yet." />
          )}
        </Section>

        <Section
          title="Lead pipeline"
          action={
            <Link href="/leads" className="text-xs font-semibold text-elevate-600 hover:underline">
              View leads →
            </Link>
          }
        >
          <div className="mb-3 flex items-center gap-2 text-sm">
            <Sparkles size={15} className="text-elevate-600" />
            <span className="font-semibold">{data.leads.length} leads</span>
            <span className="text-ink-faint">in play</span>
          </div>
          <SourcePie data={sourceData} />
        </Section>
      </div>
    </>
  );
}
