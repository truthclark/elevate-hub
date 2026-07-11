import { NextRequest, NextResponse } from "next/server";
import { brandOf } from "@/lib/brand";
import { getAppData, taskBuckets, isClosed, isPending } from "@/lib/derive";
import { auth, authConfigured } from "@/auth";
import { parseDateSafe, fmtDate, daysUntil } from "@/lib/utils";
import { TaskItem, Deal, TeamMember } from "@/lib/types";

export const dynamic = "force-dynamic";

// Morning digest email. Runs from Vercel Cron (7am Central) or manually.
//   /api/digest            — sends to every active member with an email
//   /api/digest?preview=1  — renders the HTML in the browser (no send)
// Cron auth: Authorization: Bearer CRON_SECRET. Manual: signed-in session.

const CYAN = "#05c3f9";

interface Deadline {
  deal: string;
  label: string;
  date: string;
  days: number;
}

function upcomingDeadlines(deals: Deal[], horizon = 3): Deadline[] {
  const out: Deadline[] = [];
  const fields: [keyof Deal, string][] = [
    ["optionDeadline", "Option period ends"],
    ["inspDate", "Inspection"],
    ["financingDeadline", "Financing deadline"],
    ["appraisalDeadline", "Appraisal deadline"],
    ["closeDate", "Closing"],
  ];
  for (const d of deals) {
    if (isClosed(d) || d.archived) continue;
    for (const [field, label] of fields) {
      const v = d[field] as string;
      if (!v) continue;
      const days = daysUntil(v);
      if (days != null && days >= 0 && days <= horizon) {
        out.push({ deal: d.address || d.name, label, date: v, days });
      }
    }
  }
  return out.sort((a, b) => a.days - b.days);
}

function taskLine(t: TaskItem, overdue: boolean): string {
  return `<tr>
    <td style="padding:6px 0;border-bottom:1px solid #eef0f3;">
      <span style="font-weight:600;color:#1B1B24;">${esc(t.task)}</span>
      ${t.relatedClient ? `<span style="color:#8a8f98;"> · ${esc(t.relatedClient)}</span>` : ""}
    </td>
    <td style="padding:6px 0;border-bottom:1px solid #eef0f3;text-align:right;white-space:nowrap;color:${overdue ? "#e11d48" : "#6b7280"};font-weight:${overdue ? "700" : "400"};">
      ${overdue ? "overdue · " : ""}${esc(fmtDate(t.dueDate))}
    </td>
  </tr>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHtml(
  member: TeamMember,
  overdue: TaskItem[],
  dueToday: TaskItem[],
  deadlines: Deadline[],
  pendingCount: number,
  appUrl: string,
  brandLine: string
): string {
  const first = member.name.split(" ")[0];
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const section = (title: string, body: string) =>
    body
      ? `<p style="margin:22px 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#8a8f98;">${title}</p>
         <table style="width:100%;border-collapse:collapse;font-size:14px;">${body}</table>`
      : "";

  const allClear = overdue.length === 0 && dueToday.length === 0 && deadlines.length === 0;

  return `<!doctype html><html><body style="margin:0;background:#f7f8fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8eaee;">
      <div style="height:5px;background:${CYAN};"></div>
      <div style="padding:26px 28px;">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.1em;color:#8a8f98;">ELEVATE HUB · ${dateLabel.toUpperCase()}</p>
        <h1 style="margin:8px 0 2px;font-size:22px;color:#1B1B24;">Morning, ${esc(first)}.</h1>
        <p style="margin:0;color:#6b7280;font-size:14px;">
          ${allClear
            ? "Clean slate today. Go generate some business."
            : `${overdue.length ? `<b style="color:#e11d48;">${overdue.length} overdue</b>, ` : ""}${dueToday.length} due today, ${deadlines.length} contract deadline${deadlines.length === 1 ? "" : "s"} in the next 3 days.`}
        </p>
        ${section("OVERDUE", overdue.map((t) => taskLine(t, true)).join(""))}
        ${section("DUE TODAY", dueToday.map((t) => taskLine(t, false)).join(""))}
        ${section(
          "CONTRACT DEADLINES — NEXT 3 DAYS",
          deadlines
            .map(
              (d) => `<tr>
              <td style="padding:6px 0;border-bottom:1px solid #eef0f3;"><b>${esc(d.deal)}</b> <span style="color:#8a8f98;">· ${esc(d.label)}</span></td>
              <td style="padding:6px 0;border-bottom:1px solid #eef0f3;text-align:right;white-space:nowrap;color:${d.days <= 1 ? "#e11d48" : "#b45309"};font-weight:700;">
                ${d.days === 0 ? "TODAY" : d.days === 1 ? "tomorrow" : `in ${d.days} days`}
              </td></tr>`
            )
            .join("")
        )}
        <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">${pendingCount} deal${pendingCount === 1 ? "" : "s"} in contract right now.</p>
        <a href="${appUrl}/tasks" style="display:inline-block;margin-top:18px;background:${CYAN};color:#1B1B24;font-weight:700;font-size:14px;text-decoration:none;padding:11px 22px;border-radius:12px;">Open My Day</a>
      </div>
    </div>
    <p style="text-align:center;color:#a0a5ad;font-size:11px;margin-top:14px;">${brandLine}</p>
  </div></body></html>`;
}

export async function GET(req: NextRequest) {
  // Auth: Vercel cron (Bearer CRON_SECRET) or a signed-in user
  const cronOk =
    process.env.CRON_SECRET &&
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  let sessionOk = !authConfigured;
  if (!cronOk && authConfigured) {
    const session = await auth();
    sessionOk = Boolean(session?.user);
  }
  if (!cronOk && !sessionOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preview = req.nextUrl.searchParams.get("preview");
  const data = await getAppData();
  const year = data.settings.year;
  const deals = data.deals.filter((d) => d.year === year);
  const deadlines = upcomingDeadlines(deals);
  const pendingCount = deals.filter(isPending).length;
  const appUrl = process.env.APP_URL || `https://${req.headers.get("host")}`;
  const brand = brandOf(data.settings);
  const brandLine = `${brand.companyName} · brokered by ${brand.brokerageName}`;

  const members = data.team.filter((m) => m.active && m.email);
  const results: { to: string; status: string }[] = [];

  for (const member of members) {
    const mine = data.tasks.filter(
      (t) =>
        t.status.toLowerCase() !== "done" &&
        t.assignedTo.toLowerCase() === member.name.toLowerCase()
    );
    const { overdue, dueToday } = taskBuckets(mine);
    const html = buildHtml(member, overdue, dueToday, deadlines, pendingCount, appUrl, brandLine);

    if (preview) {
      // Render the first member's digest in the browser
      return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
    }

    if (!process.env.RESEND_API_KEY) {
      results.push({ to: member.email, status: "skipped: RESEND_API_KEY not set" });
      continue;
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.DIGEST_FROM || `${brand.appName} <onboarding@resend.dev>`,
          to: member.email,
          subject: `Your day: ${overdue.length + dueToday.length} tasks, ${deadlines.length} deadlines`,
          html,
        }),
      });
      results.push({ to: member.email, status: res.ok ? "sent" : `error ${res.status}: ${await res.text()}` });
    } catch (e) {
      results.push({ to: member.email, status: `failed: ${(e as Error).message}` });
    }
  }

  return NextResponse.json({ date: new Date().toISOString(), results });
}
