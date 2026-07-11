import { TeamMember } from "./types";

// Minimal iCal feed reader for the My Day appointment overlay.
// Read-only, no OAuth: each member pastes their calendar's secret .ics URL.
// Note: recurring events without expanded instances are skipped (v1).

export interface CalEvent {
  date: string; // YYYY-MM-DD (local)
  time: string; // "9:00 AM" or "" for all-day
  minutes: number; // minutes since midnight for sorting (0 for all-day)
  title: string;
  who: string; // team member name
}

const g = globalThis as unknown as {
  __icsCache?: Map<string, { at: number; events: CalEvent[] }>;
};

function unfold(ics: string): string[] {
  // RFC 5545 line folding: continuation lines start with space/tab
  return ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
}

function parseDt(value: string, params: string): { date: string; time: string; minutes: number } | null {
  // Forms: 20260708T140000Z | 20260708T140000 (with TZID) | 20260708 (all-day)
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, da, h, mi, , z] = m;
  if (!h) return { date: `${y}-${mo}-${da}`, time: "", minutes: 0 };
  let d: Date;
  if (z) {
    d = new Date(Date.UTC(+y, +mo - 1, +da, +h, +mi));
    // Convert UTC to Central time (his market). Rough DST: Mar-Nov = -5, else -6.
    const month = d.getUTCMonth() + 1;
    const offset = month >= 3 && month <= 11 ? -5 : -6;
    d = new Date(d.getTime() + offset * 3600 * 1000);
    const p = (x: number) => String(x).padStart(2, "0");
    const hours = d.getUTCHours();
    const mins = d.getUTCMinutes();
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    return {
      date: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`,
      time: `${h12}:${p(mins)} ${hours < 12 ? "AM" : "PM"}`,
      minutes: hours * 60 + mins,
    };
  }
  // Local/TZID time: take at face value (assumes feed TZ ≈ team TZ)
  void params;
  const hours = +h;
  const mins = +mi;
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const p = (x: number) => String(x).padStart(2, "0");
  return {
    date: `${y}-${mo}-${da}`,
    time: `${h12}:${p(mins)} ${hours < 12 ? "AM" : "PM"}`,
    minutes: hours * 60 + mins,
  };
}

function parseIcs(ics: string, who: string, fromIso: string, toIso: string): CalEvent[] {
  const out: CalEvent[] = [];
  const lines = unfold(ics);
  let inEvent = false;
  let dt: ReturnType<typeof parseDt> = null;
  let title = "";
  let recurring = false;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true; dt = null; title = ""; recurring = false;
    } else if (line === "END:VEVENT") {
      if (inEvent && dt && !recurring && dt.date >= fromIso && dt.date <= toIso) {
        out.push({ date: dt.date, time: dt.time, minutes: dt.minutes, title: title || "(busy)", who });
      }
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith("DTSTART")) {
        const idx = line.indexOf(":");
        dt = parseDt(line.slice(idx + 1).trim(), line.slice(7, idx));
      } else if (line.startsWith("SUMMARY")) {
        title = line.slice(line.indexOf(":") + 1).replace(/\\,/g, ",").replace(/\\n/g, " ").trim();
      } else if (line.startsWith("RRULE")) {
        recurring = true; // v1: skip unexpanded recurring events
      }
    }
  }
  return out;
}

export async function fetchCalendarEvents(
  team: TeamMember[],
  fromIso: string,
  toIso: string
): Promise<CalEvent[]> {
  if (!g.__icsCache) g.__icsCache = new Map();
  const events: CalEvent[] = [];
  const members = team.filter((m) => m.active && m.calendarUrl?.startsWith("http"));
  await Promise.all(
    members.map(async (m) => {
      const key = `${m.id}:${m.calendarUrl}`;
      const cached = g.__icsCache!.get(key);
      if (cached && Date.now() - cached.at < 10 * 60 * 1000) {
        events.push(...cached.events.filter((e) => e.date >= fromIso && e.date <= toIso));
        return;
      }
      try {
        const res = await fetch(m.calendarUrl!, {
          signal: AbortSignal.timeout(6000),
          cache: "no-store",
        });
        if (!res.ok) return;
        const text = await res.text();
        // Parse a wide window once, cache, then filter per request
        const wideFrom = new Date();
        wideFrom.setDate(wideFrom.getDate() - 7);
        const wideTo = new Date();
        wideTo.setDate(wideTo.getDate() + 60);
        const p = (x: number) => String(x).padStart(2, "0");
        const iso = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
        const all = parseIcs(text, m.name, iso(wideFrom), iso(wideTo));
        g.__icsCache!.set(key, { at: Date.now(), events: all });
        events.push(...all.filter((e) => e.date >= fromIso && e.date <= toIso));
      } catch {
        // feed unreachable — silently skip
      }
    })
  );
  return events.sort((a, b) => (a.date === b.date ? a.minutes - b.minutes : a.date < b.date ? -1 : 1));
}
