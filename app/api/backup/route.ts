import { NextRequest, NextResponse } from "next/server";
import { buildBackupWorkbook } from "@/lib/backup";
import { store } from "@/lib/store";
import { hasRole } from "@/lib/types";
import { auth, authConfigured } from "@/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Nightly offsite backup: Vercel cron hits this route, we build the full
// .xlsx and email it to every active admin via Resend. No AI, no third-party
// automation — one function run per night.
//
// Auth: Vercel cron (Bearer CRON_SECRET) or a signed-in user ("send now").

export async function GET(req: NextRequest) {
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

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      sent: [],
      status: "skipped: RESEND_API_KEY not set (same key the digest uses)",
    });
  }

  const team = await store.listTeam();
  // BACKUP_EMAIL env overrides; otherwise every active admin with an email
  const recipients = process.env.BACKUP_EMAIL
    ? [process.env.BACKUP_EMAIL]
    : team.filter((m) => m.active && m.email && hasRole(m, "Admin")).map((m) => m.email);
  if (recipients.length === 0) {
    return NextResponse.json({ sent: [], status: "no admin emails on the Team page" });
  }

  const { buffer, filename, appName } = await buildBackupWorkbook();
  const stamp = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.DIGEST_FROM || `${appName} <onboarding@resend.dev>`,
      to: recipients,
      subject: `${appName} nightly backup — ${stamp}`,
      html: `<div style="font-family:sans-serif;max-width:480px">
        <p style="font-size:15px"><strong>Your nightly backup is attached.</strong></p>
        <p style="color:#555;font-size:13px">Every deal, lead, task, team member, P&amp;L entry,
        and SOP as of tonight. Keep a few of these around — they're your own offsite copy,
        independent of any hosting provider.</p>
      </div>`,
      attachments: [
        {
          filename,
          content: buffer.toString("base64"),
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Backup email failed:", err);
    return NextResponse.json({ sent: [], status: `email failed: ${err.slice(0, 200)}` }, { status: 500 });
  }
  return NextResponse.json({ sent: recipients, status: "ok", file: filename });
}
