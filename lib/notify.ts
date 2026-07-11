// Lightweight email notifications via Resend (same key as the morning digest).
// All sends are fire-and-forget: a failed email never blocks the save.

import { TaskItem, TeamMember } from "./types";
import { fmtDate } from "./utils";

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.DIGEST_FROM || "Elevate Hub <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
  } catch (err) {
    console.error("Notification email failed (non-blocking):", err);
  }
}

// Emailed when a task is assigned to someone (not when you assign to yourself).
export async function notifyTaskAssigned(
  task: Omit<TaskItem, "id">,
  assignee: TeamMember | undefined,
  actor: string
) {
  if (!assignee?.email) return;
  if (assignee.name.toLowerCase().startsWith(actor.toLowerCase())) return; // self-assign
  const when = [fmtDate(task.dueDate), task.dueTime].filter(Boolean).join(" at ");
  const html = `
    <div style="font-family:sans-serif;max-width:480px">
      <p style="font-size:15px"><strong>${actor}</strong> assigned you a task:</p>
      <p style="font-size:17px;font-weight:bold;margin:8px 0">${task.task}</p>
      <p style="color:#555;font-size:14px;margin:4px 0">
        ${when ? `Due ${when}` : "No due date"}
        ${task.relatedClient ? ` &middot; ${task.relatedClient}` : ""}
        ${task.priority ? ` &middot; ${task.priority} priority` : ""}
      </p>
      ${task.notes ? `<p style="color:#555;font-size:13px">${task.notes}</p>` : ""}
      <p style="font-size:13px;margin-top:16px">
        <a href="${process.env.APP_URL || ""}/tasks" style="color:#05c3f9;font-weight:bold">Open your task list</a>
      </p>
    </div>`;
  await sendEmail(assignee.email, `New task: ${task.task}`, html);
}
