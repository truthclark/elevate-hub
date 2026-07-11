"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Activity, TeamMember, ACTIVITY_KINDS, CONTACT_KINDS, APPT_KINDS } from "@/lib/types";
import { logActivity, deleteActivity } from "@/app/actions";
import { fmtDate, parseDateSafe, initialsOf, cn } from "@/lib/utils";
import { Avatar } from "./ui";
import {
  Phone, MessageSquare, Mail, AtSign, MessagesSquare, CalendarCheck2,
  Users, Home, DoorOpen, RotateCw, StickyNote, Plus, Loader2, Trash2, Activity as ActivityIcon,
} from "lucide-react";

const KIND_ICONS: Record<string, typeof Phone> = {
  Call: Phone, Text: MessageSquare, Email: Mail, DM: AtSign,
  Conversation: MessagesSquare, Appointment: CalendarCheck2, Consult: Users,
  Showing: Home, "Open House": DoorOpen, "Follow-up": RotateCw, Other: StickyNote,
};

const RANGES = ["Day", "Week", "Month", "Quarter", "Year"] as const;
type Range = (typeof RANGES)[number];

function rangeStart(range: Range): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "Week") {
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  } else if (range === "Month") {
    d.setDate(1);
  } else if (range === "Quarter") {
    d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
  } else if (range === "Year") {
    d.setMonth(0, 1);
  }
  return d;
}

function todayIso(): string {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function ActivityLog({
  activities,
  team,
  defaultPerson,
}: {
  activities: Activity[];
  team: TeamMember[];
  defaultPerson?: string;
}) {
  const members = team.filter((m) => m.active);
  const [range, setRange] = useState<Range>("Day");
  const [person, setPerson] = useState(
    defaultPerson && members.some((m) => m.name === defaultPerson) ? defaultPerson : ""
  );
  const [kind, setKind] = useState<string>("Call");
  const [busy, startTransition] = useTransition();
  const aboutRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => {
    const start = rangeStart(range).getTime();
    return activities.filter((a) => {
      const d = parseDateSafe(a.date)?.getTime();
      return (
        d != null &&
        d >= start &&
        (!person || a.who.toLowerCase() === person.toLowerCase())
      );
    });
  }, [activities, range, person]);

  const contacts = shown.filter((a) => CONTACT_KINDS.includes(a.kind)).length;
  const appts = shown.filter((a) => APPT_KINDS.includes(a.kind)).length;

  const submit = (fd: FormData) => {
    startTransition(async () => {
      await logActivity(fd);
      if (aboutRef.current) aboutRef.current.value = "";
      if (notesRef.current) notesRef.current.value = "";
    });
  };

  return (
    <div className="card mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-elevate-400">
            <ActivityIcon size={17} />
          </span>
          <div>
            <h2 className="font-display text-base font-bold">Activity</h2>
            <p className="text-xs text-ink-faint">
              {contacts} contacts · {appts} appointments this {range.toLowerCase()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {members.length > 1 && (
            <>
              <button
                onClick={() => setPerson("")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold transition",
                  person === "" ? "bg-ink text-white" : "border border-mist bg-white text-ink-muted"
                )}
              >
                All
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPerson(m.name)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold transition",
                    person === m.name ? "bg-ink text-white" : "border border-mist bg-white text-ink-muted"
                  )}
                >
                  {m.name.split(" ")[0]}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-mist" />
            </>
          )}
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold transition",
                range === r
                  ? "bg-elevate-500 text-ink"
                  : "border border-mist bg-white text-ink-muted hover:text-ink"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* Quick log */}
        <form action={submit} className="mb-4 rounded-xl bg-chalk/70 p-3.5">
          <input type="hidden" name="date" value={todayIso()} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="who" value={person || members[0]?.name || ""} />
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {ACTIVITY_KINDS.map((k) => {
              const Icon = KIND_ICONS[k] ?? StickyNote;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition",
                    kind === k
                      ? "bg-ink text-white"
                      : "border border-mist bg-white text-ink-muted hover:text-ink"
                  )}
                >
                  <Icon size={11} /> {k}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={aboutRef}
              name="about"
              placeholder="Who was it with? (client, lead...)"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-elevate-400"
            />
            <input
              ref={notesRef}
              name="notes"
              placeholder="Quick note (optional)"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-elevate-400"
            />
            <button
              type="submit"
              disabled={busy}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-elevate-500 px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Log it
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">
            Logs as {kind} by {(person || members[0]?.name || "you").split(" ")[0]}, today.
            Calls, texts, and consults feed the Scorecard automatically.
          </p>
        </form>

        {/* Stream */}
        {shown.length > 0 ? (
          <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1 thin-scroll">
            {shown.map((a) => {
              const Icon = KIND_ICONS[a.kind] ?? StickyNote;
              const member = members.find((m) => m.name.toLowerCase() === a.who.toLowerCase());
              return (
                <li key={a.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-chalk/60">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mist text-ink-muted">
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-semibold">{a.kind}</span>
                      {a.about && <span className="text-ink-muted"> with {a.about}</span>}
                      {a.notes && <span className="text-ink-faint"> · {a.notes}</span>}
                    </p>
                  </div>
                  {member && (
                    <Avatar initials={initialsOf(member.name)} color={member.color} size={20} photo={member.photo} />
                  )}
                  <span className="shrink-0 text-xs text-ink-faint">{fmtDate(a.date)}</span>
                  <form action={deleteActivity} className="opacity-0 transition group-hover:opacity-100">
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="rounded p-1 text-ink-faint hover:text-rose-500" aria-label="Delete activity">
                      <Trash2 size={12} />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl bg-chalk/60 px-4 py-6 text-center text-sm text-ink-faint">
            Nothing logged this {range.toLowerCase()} yet. Every call and conversation you
            log builds your scorecard.
          </p>
        )}
      </div>
    </div>
  );
}
