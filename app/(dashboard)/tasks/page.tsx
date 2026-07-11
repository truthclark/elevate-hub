import Link from "next/link";
import Topbar from "@/components/topbar";
import { Section, StatusBadge, EmptyState } from "@/components/ui";
import { TaskModal, AddButton, EditIcon } from "@/components/forms";
import { getAppData, taskBuckets } from "@/lib/derive";
import MyDay from "@/components/my-day";
import ActivityLog from "@/components/activity-log";
import KpiTally from "@/components/kpi-tally";
import { store } from "@/lib/store";
import { fetchCalendarEvents, type CalEvent } from "@/lib/ics";
import { fetchGoogleCalendarEvents } from "@/lib/gcal";
import { auth, authConfigured } from "@/auth";
import { toggleTask } from "@/app/actions";
import { fmtDate, cn } from "@/lib/utils";
import { TaskItem } from "@/lib/types";
import { AlertCircle, CalendarCheck, CalendarClock, Check } from "lucide-react";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "day", label: "My Day" },
  { key: "all", label: "All tasks" },
  { key: "activity", label: "Activity log" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

function TaskRow({
  t,
  team,
  overdue,
}: {
  t: TaskItem;
  team: string[];
  overdue?: boolean;
}) {
  const done = t.status.toLowerCase() === "done";
  return (
    <li className="flex items-start gap-3 rounded-xl border border-mist/70 bg-white p-3.5 transition hover:shadow-card">
      <form action={toggleTask}>
        <input type="hidden" name="id" value={t.id} />
        <input type="hidden" name="done" value={String(!done)} />
        <button
          type="submit"
          aria-label={done ? "Reopen task" : "Complete task"}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition",
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : overdue
                ? "border-rose-400 hover:bg-rose-50"
                : "border-ink-faint/40 hover:border-elevate-500 hover:bg-elevate-50"
          )}
        >
          {done && <Check size={13} strokeWidth={3} />}
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", done && "text-ink-faint line-through")}>
          {t.task}
        </p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {t.assignedTo || "Unassigned"}
          {t.relatedClient && ` · ${t.relatedClient}`}
          {t.notes && ` · ${t.notes}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <div className="flex flex-col items-end gap-1">
          <StatusBadge value={t.priority} />
          <span className={cn("text-xs", overdue ? "font-semibold text-rose-600" : "text-ink-muted")}>
            {fmtDate(t.dueDate)}
          </span>
        </div>
        <TaskModal task={t} team={team} trigger={<EditIcon />} />
      </div>
    </li>
  );
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const view: ViewKey = (VIEWS.some((v) => v.key === searchParams?.view)
    ? searchParams?.view
    : "day") as ViewKey;

  const data = await getAppData();
  const activities = await store.listActivities();
  // Calendar overlay window: last week through +5 weeks (covers week navigation)
  const p = (x: number) => String(x).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const from = new Date(); from.setDate(from.getDate() - 7);
  const to = new Date(); to.setDate(to.getDate() + 35);
  // Calendars: Google OAuth first (near real-time), iCal feeds as fallback
  // for anyone not connected via Google.
  let events: CalEvent[] = [];
  if (view === "day") {
    const google = await fetchGoogleCalendarEvents(data.team, iso(from), iso(to)).catch(
      () => ({ events: [] as CalEvent[], connectedEmails: new Set<string>() })
    );
    const icsTeam = data.team.filter(
      (m) => !m.email || !google.connectedEmails.has(m.email.toLowerCase())
    );
    const icsEvents = await fetchCalendarEvents(icsTeam, iso(from), iso(to)).catch(() => []);
    events = [...google.events, ...icsEvents].sort((a, b) =>
      a.date === b.date ? a.minutes - b.minutes : a.date < b.date ? -1 : 1
    );
  }
  const team = data.team.filter((m) => m.active).map((m) => m.name);
  const { overdue, dueToday, upcoming } = taskBuckets(data.tasks);
  const done = data.tasks.filter((t) => t.status.toLowerCase() === "done");

  // Default My Day to the signed-in team member (match by email, then name)
  let me = "";
  if (authConfigured) {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    const name = session?.user?.name?.toLowerCase();
    const match = data.team.find(
      (m) =>
        (email && m.email.toLowerCase() === email) ||
        (name && m.name.toLowerCase() === name)
    );
    me = match?.name ?? "";
  }

  const subtitleBy: Record<ViewKey, string> = {
    day: "Check them off here — no spreadsheet required.",
    all: `${overdue.length} overdue · ${dueToday.length} due today · ${upcoming.length} upcoming`,
    activity: "Every call, consult, and touch — tap + to log as you go.",
  };

  return (
    <>
      <Topbar
        title="Tasks"
        subtitle={subtitleBy[view]}
        action={<TaskModal team={team} trigger={<AddButton label="New task" />} />}
      />

      {/* View tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "day" ? "/tasks" : `/tasks?view=${v.key}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              view === v.key
                ? "bg-ink text-white"
                : "border border-mist bg-white text-ink-muted hover:text-ink"
            )}
          >
            {v.label}
            {v.key === "all" && overdue.length > 0 && (
              <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                {overdue.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {view === "day" && (
        <MyDay tasks={data.tasks} team={data.team} defaultPerson={me} events={events} />
      )}

      {view === "all" && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Section title="Overdue" action={<AlertCircle size={16} className="text-rose-500" />}>
              {overdue.length > 0 ? (
                <ul className="space-y-2.5">
                  {overdue.map((t) => <TaskRow key={t.id} t={t} team={team} overdue />)}
                </ul>
              ) : (
                <EmptyState message="Nothing overdue. Clean board." />
              )}
            </Section>

            <Section title="Due today" action={<CalendarCheck size={16} className="text-elevate-600" />}>
              {dueToday.length > 0 ? (
                <ul className="space-y-2.5">
                  {dueToday.map((t) => <TaskRow key={t.id} t={t} team={team} />)}
                </ul>
              ) : (
                <EmptyState message="Nothing due today." />
              )}
            </Section>

            <Section title="Upcoming" action={<CalendarClock size={16} className="text-ink-faint" />}>
              {upcoming.length > 0 ? (
                <ul className="space-y-2.5">
                  {upcoming.map((t) => <TaskRow key={t.id} t={t} team={team} />)}
                </ul>
              ) : (
                <EmptyState message="No upcoming tasks." />
              )}
            </Section>
          </div>

          {done.length > 0 && (
            <Section title="Completed" className="mt-6">
              <ul className="space-y-2.5">
                {done.slice(-10).reverse().map((t) => <TaskRow key={t.id} t={t} team={team} />)}
              </ul>
            </Section>
          )}
        </>
      )}

      {view === "activity" && (
        <>
          <KpiTally activities={activities} team={data.team} defaultPerson={me} />
          <ActivityLog activities={activities} team={data.team} defaultPerson={me} />
        </>
      )}
    </>
  );
}
