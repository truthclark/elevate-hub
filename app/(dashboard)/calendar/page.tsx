import Topbar from "@/components/topbar";
import Calendar, { CalEvent } from "@/components/calendar-ui";
import { TaskModal, AddButton } from "@/components/forms";
import { getAppData, isClosed } from "@/lib/derive";
import { fetchCalendarEvents } from "@/lib/ics";
import { fetchGoogleCalendarEvents } from "@/lib/gcal";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const data = await getAppData();
  const team = data.team.filter((m) => m.active).map((m) => m.name);

  const events: CalEvent[] = [];

  // Appointments from connected calendars (Google first, iCal fallback),
  // fetched for a wide window so month navigation has data.
  const p = (x: number) => String(x).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const from = new Date(); from.setDate(from.getDate() - 60);
  const to = new Date(); to.setDate(to.getDate() + 120);
  const google = await fetchGoogleCalendarEvents(data.team, iso(from), iso(to)).catch(
    () => ({ events: [], connectedEmails: new Set<string>() })
  );
  const icsTeam = data.team.filter(
    (m) => !m.email || !google.connectedEmails.has(m.email.toLowerCase())
  );
  const icsEvents = await fetchCalendarEvents(icsTeam, iso(from), iso(to)).catch(() => []);
  const oneName = data.team.filter((m) => m.active).length === 1;
  for (const e of [...google.events, ...icsEvents]) {
    events.push({
      date: e.date,
      label: oneName ? e.title : `${e.title} (${e.who.split(" ")[0]})`,
      kind: "appt",
      time: e.time,
      minutes: e.minutes,
      who: e.who,
    });
  }

  for (const t of data.tasks) {
    if (!t.dueDate) continue;
    events.push({
      date: t.dueDate,
      label: t.assignedTo ? `${t.assignedTo}: ${t.task}` : t.task,
      kind: t.status.toLowerCase() === "done" ? "task-done" : "task",
      href: "/tasks",
    });
  }

  for (const d of data.deals) {
    const name = d.address || d.name;
    if (d.closeDate && !isClosed(d))
      events.push({ date: d.closeDate, label: `🏠 Closing — ${name}`, kind: "closing", href: "/deals?view=contract" });
    if (d.closedDate)
      events.push({ date: d.closedDate, label: `✅ Closed — ${name}`, kind: "task-done", href: "/deals?view=contract" });
    if (isClosed(d)) continue;
    const deadlines: [string, string][] = [
      [d.optionDeadline, "Option ends"],
      [d.inspDate, "Inspection"],
      [d.financingDeadline, "Financing"],
      [d.appraisalDeadline, "Appraisal"],
    ];
    for (const [date, label] of deadlines) {
      if (date) events.push({ date, label: `${label} — ${name}`, kind: "deadline", href: "/deals?view=contract" });
    }
  }

  return (
    <>
      <Topbar
        title="Calendar"
        subtitle="Every task, deadline, and closing in one view."
        action={<TaskModal team={team} trigger={<AddButton label="New task" />} />}
      />
      <Calendar events={events} />
    </>
  );
}
