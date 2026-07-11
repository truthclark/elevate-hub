import Topbar from "@/components/topbar";
import { Avatar, Section, EmptyState } from "@/components/ui";
import { MemberModal, AddButton, EditIcon } from "@/components/forms";
import { getAppData, taskBuckets } from "@/lib/derive";
import { currentRole } from "@/auth";
import { brandOf } from "@/lib/brand";
import { initialsOf, cn } from "@/lib/utils";
import { Mail, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const data = await getAppData();
  const role = await currentRole();
  const isAdmin = role === "Admin";
  const { open } = taskBuckets(data.tasks);
  const brand = brandOf(data.settings);

  return (
    <>
      <Topbar
        title="Team"
        subtitle={`${brand.companyName} · Brokered by ${brand.brokerageName}`}
        action={isAdmin ? <MemberModal trigger={<AddButton label="Add member" />} /> : undefined}
      />

      {isAdmin && (
        <div className="card mb-6 flex items-start gap-3 border-elevate-100 bg-gradient-to-br from-elevate-50/70 to-white p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-elevate-600" />
          <p className="text-sm text-ink-muted">
            <span className="font-semibold text-ink">Access control:</span> anyone
            listed here as <span className="font-semibold">Active</span> with a
            Google email can sign in. Set someone to Inactive (or delete them) to
            revoke access instantly. Admins can manage the team and settings;
            Agents and Ops see everything else.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.team.map((m) => {
          const memberTasks = open.filter(
            (t) => t.assignedTo.toLowerCase() === m.name.toLowerCase()
          );
          return (
            <div key={m.id} className={cn("card card-hover overflow-hidden", !m.active && "opacity-55")}>
              <div
                className="h-16"
                style={{ background: `linear-gradient(120deg, ${m.color}22, ${m.color}08)` }}
              />
              <div className="-mt-7 px-5 pb-5">
                <div className="flex items-end justify-between">
                  <Avatar initials={initialsOf(m.name)} color={m.color} size={56} photo={m.photo} />
                  <div className="flex items-center gap-1">
                    {!m.active && <span className="chip bg-mist text-ink-muted">Inactive</span>}
                    <span className="chip bg-ink/5 text-ink-muted">{m.role}</span>
                    {isAdmin && <MemberModal member={m} trigger={<EditIcon />} />}
                  </div>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold">{m.name}</h3>
                <p className="text-sm leading-relaxed text-ink-muted">{m.focus}</p>
                {m.email && (
                  <a
                    href={`mailto:${m.email}`}
                    className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint hover:text-elevate-600"
                  >
                    <Mail size={13} /> {m.email}
                  </a>
                )}
                <div className="mt-4 flex items-center justify-between rounded-xl bg-chalk px-3.5 py-2.5">
                  <span className="text-xs text-ink-muted">Open tasks</span>
                  <span className="font-display text-sm font-bold">{memberTasks.length}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Section title="Accountability snapshot" className="mt-6">
        {open.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {data.team.filter((m) => m.active).map((m) => {
              const memberTasks = open.filter(
                (t) => t.assignedTo.toLowerCase() === m.name.toLowerCase()
              );
              return (
                <div key={m.id} className="rounded-xl border border-mist p-4">
                  <div className="flex items-center gap-2">
                    <Avatar initials={initialsOf(m.name)} color={m.color} size={28} photo={m.photo} />
                    <p className="text-sm font-semibold">{m.name}</p>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {memberTasks.slice(0, 3).map((t) => (
                      <li key={t.id} className="truncate text-xs text-ink-muted">• {t.task}</li>
                    ))}
                    {memberTasks.length === 0 && (
                      <li className="text-xs text-ink-faint">All clear</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState message="No open tasks assigned." />
        )}
      </Section>
    </>
  );
}
