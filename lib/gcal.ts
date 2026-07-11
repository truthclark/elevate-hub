// Google Calendar (OAuth) — near-real-time events for My Day.
// Reuses the app's existing Google OAuth client; refresh tokens live in the
// database (google_calendar_tokens) keyed by member email. Server-only.

import { TeamMember } from "./types";
import { store } from "./store";
import type { CalEvent } from "./ics";

const TZ = process.env.CALENDAR_TZ || "America/Chicago";

// Access tokens are short-lived; cache them per refresh token in-process.
const g = globalThis as unknown as {
  __gcalAccess?: Map<string, { token: string; exp: number }>;
};

async function accessToken(refreshToken: string): Promise<string | null> {
  if (!g.__gcalAccess) g.__gcalAccess = new Map();
  const cached = g.__gcalAccess.get(refreshToken);
  if (cached && Date.now() < cached.exp - 60_000) return cached.token;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; expires_in: number };
    g.__gcalAccess.set(refreshToken, {
      token: data.access_token,
      exp: Date.now() + data.expires_in * 1000,
    });
    return data.access_token;
  } catch {
    return null;
  }
}

interface GEvent {
  summary?: string;
  status?: string;
  start?: { date?: string; dateTime?: string };
}

// Ask Google to return times already in the team's timezone, then read the
// wall-clock digits straight off the string — no timezone math on our side.
function parseWhen(ev: GEvent): { date: string; time: string; minutes: number } | null {
  if (ev.start?.date) return { date: ev.start.date, time: "", minutes: 0 };
  const m = ev.start?.dateTime?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, date, hh, mm] = m;
  const hours = +hh;
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return {
    date,
    time: `${h12}:${mm} ${hours < 12 ? "AM" : "PM"}`,
    minutes: hours * 60 + +mm,
  };
}

async function eventsFor(
  refreshToken: string,
  who: string,
  fromIso: string,
  toIso: string
): Promise<CalEvent[]> {
  const token = await accessToken(refreshToken);
  if (!token) return [];
  try {
    const params = new URLSearchParams({
      timeMin: `${fromIso}T00:00:00Z`,
      timeMax: `${toIso}T23:59:59Z`,
      singleEvents: "true", // expands recurring events (the iCal path can't)
      orderBy: "startTime",
      maxResults: "150",
      timeZone: TZ,
    });
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: GEvent[] };
    const out: CalEvent[] = [];
    for (const ev of data.items ?? []) {
      if (ev.status === "cancelled") continue;
      const when = parseWhen(ev);
      if (!when || when.date < fromIso || when.date > toIso) continue;
      out.push({ ...when, title: ev.summary || "(busy)", who });
    }
    return out;
  } catch {
    return [];
  }
}

// Events for every member with a connected Google Calendar.
export async function fetchGoogleCalendarEvents(
  team: TeamMember[],
  fromIso: string,
  toIso: string
): Promise<{ events: CalEvent[]; connectedEmails: Set<string> }> {
  const connections = await store.listCalendarConnections();
  const connectedEmails = new Set(connections.map((c) => c.email.toLowerCase()));
  const members = team.filter(
    (m) => m.active && m.email && connectedEmails.has(m.email.toLowerCase())
  );
  const events: CalEvent[] = [];
  await Promise.all(
    members.map(async (m) => {
      const token = await store.getCalendarToken(m.email);
      if (!token) return;
      events.push(...(await eventsFor(token, m.name, fromIso, toIso)));
    })
  );
  return { events, connectedEmails };
}
