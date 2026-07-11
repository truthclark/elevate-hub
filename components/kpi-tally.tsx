"use client";

// Prospecting KPI tally: tap + / − instead of typing. Each + logs an
// activity for the selected person today; − removes the most recent one.

import { useMemo, useState, useTransition } from "react";
import { Activity, TeamMember } from "@/lib/types";
import { logActivity, undoLastActivity } from "@/app/actions";
import { initialsOf, cn } from "@/lib/utils";
import { Avatar } from "./ui";
import { Plus, Minus, PhoneCall, CalendarPlus, Handshake, PenLine, FileText } from "lucide-react";

const KPIS = [
  { kind: "Conversation", label: "Conversations", icon: PhoneCall, color: "text-elevate-700 bg-elevate-100" },
  { kind: "Appointment Set", label: "Appts set", icon: CalendarPlus, color: "text-amber-700 bg-amber-100" },
  { kind: "Appointment", label: "Appts held", icon: Handshake, color: "text-emerald-700 bg-emerald-100" },
  { kind: "Agreement Signed", label: "Signed", icon: PenLine, color: "text-violet-700 bg-violet-100" },
  { kind: "Offer Written", label: "Offers written", icon: FileText, color: "text-rose-700 bg-rose-100" },
] as const;

export default function KpiTally({
  activities,
  team,
  defaultPerson,
}: {
  activities: Activity[];
  team: TeamMember[];
  defaultPerson?: string;
}) {
  const members = team.filter((m) => m.active);
  const [person, setPerson] = useState(
    defaultPerson && members.some((m) => m.name === defaultPerson) ? defaultPerson : members[0]?.name ?? ""
  );
  const [pending, startTransition] = useTransition();
  // optimistic deltas so taps feel instant
  const [delta, setDelta] = useState<Record<string, number>>({});

  const todayIso = new Date().toISOString().slice(0, 10);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of activities) {
      if (a.date !== todayIso) continue;
      if (person && a.who.toLowerCase() !== person.toLowerCase()) continue;
      c[a.kind] = (c[a.kind] ?? 0) + 1;
    }
    return c;
  }, [activities, person, todayIso]);

  const bump = (kind: string, dir: 1 | -1) => {
    const current = (counts[kind] ?? 0) + (delta[kind] ?? 0);
    if (dir === -1 && current <= 0) return;
    setDelta((d) => ({ ...d, [kind]: (d[kind] ?? 0) + dir }));
    const fd = new FormData();
    if (dir === 1) {
      fd.set("kind", kind);
      fd.set("who", person);
      fd.set("date", todayIso);
      fd.set("about", "");
      fd.set("notes", "");
      startTransition(async () => {
        await logActivity(fd);
        setDelta((d) => ({ ...d, [kind]: (d[kind] ?? 0) - 1 }));
      });
    } else {
      fd.set("kind", kind);
      fd.set("who", person);
      fd.set("date", todayIso);
      startTransition(async () => {
        await undoLastActivity(fd);
        setDelta((d) => ({ ...d, [kind]: (d[kind] ?? 0) + 1 }));
      });
    }
  };

  return (
    <div className="card mb-6 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold">Today&apos;s prospecting</h2>
          <p className="text-xs text-ink-faint">
            Tap + as you go — it all feeds the scorecard automatically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setPerson(m.name)}
              className={cn(
                "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-semibold transition",
                person === m.name
                  ? "bg-ink text-white"
                  : "border border-mist bg-white text-ink-muted hover:text-ink"
              )}
            >
              <Avatar initials={initialsOf(m.name)} color={m.color} size={22} photo={m.photo} />
              {m.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {KPIS.map(({ kind, label, icon: Icon, color }) => {
          const count = Math.max(0, (counts[kind] ?? 0) + (delta[kind] ?? 0));
          return (
            <div key={kind} className="rounded-2xl border border-mist bg-white p-3.5 text-center">
              <span className={cn("mx-auto flex h-8 w-8 items-center justify-center rounded-xl", color)}>
                <Icon size={15} />
              </span>
              <p className="mt-2 font-display text-2xl font-bold">{count}</p>
              <p className="text-[11px] font-semibold text-ink-muted">{label}</p>
              <div className="mt-2.5 flex justify-center gap-2">
                <button
                  onClick={() => bump(kind, -1)}
                  disabled={pending || count === 0}
                  aria-label={`Remove one: ${label}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-mist text-ink-muted transition hover:bg-mist hover:text-ink disabled:opacity-30"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => bump(kind, 1)}
                  disabled={pending}
                  aria-label={`Add one: ${label}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-elevate-500 text-ink transition hover:bg-elevate-400 disabled:opacity-50"
                >
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
