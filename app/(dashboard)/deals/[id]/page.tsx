import Link from "next/link";
import { notFound } from "next/navigation";
import Topbar from "@/components/topbar";
import { Section, StatusBadge, TypeBadge, EmptyState } from "@/components/ui";
import { DealModal, TaskModal, AddButton, EditIcon } from "@/components/forms";
import ShareButton from "@/components/share-button";
import { getAppData, dealGci, dealTimeline, isClosed } from "@/lib/derive";
import { store } from "@/lib/store";
import { auth, authConfigured } from "@/auth";
import {
  toggleCheck,
  toggleTask,
  addNote,
  togglePinNote,
  deleteNote,
  applyTemplateToDeal,
  logActivity,
} from "@/app/actions";
import { fmtMoney, fmtDate, parseDateSafe, cn } from "@/lib/utils";
import { inputCls, inputBase } from "@/components/modal";
import { DEFAULT_CHECKLISTS, CHECKLIST_TITLES, ACTIVITY_KINDS, DealNote } from "@/lib/types";
import {
  ArrowLeft,
  Check,
  CalendarClock,
  StickyNote,
  CheckSquare,
  Pin,
  PinOff,
  X,
  ListPlus,
  Plus,
  Phone,
  Flag,
  MessageSquare,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ── Unified feed types ───────────────────────────────────────────
interface FeedItem {
  when: number; // epoch ms for sorting
  dateLabel: string;
  kind: "note" | "activity" | "task" | "milestone";
  title: string;
  body?: string;
  who?: string;
  note?: DealNote; // present for notes (pin/delete actions)
  activityKind?: string;
}

function NoteActions({ nt, dealId }: { nt: DealNote; dealId: number }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
      <form action={togglePinNote}>
        <input type="hidden" name="id" value={nt.id} />
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="pinned" value={String(!nt.pinned)} />
        <button
          type="submit"
          className="rounded p-1 text-ink-faint hover:bg-mist hover:text-ink"
          title={nt.pinned ? "Unpin" : "Pin to top"}
        >
          {nt.pinned ? <PinOff size={13} /> : <Pin size={13} />}
        </button>
      </form>
      <form action={deleteNote}>
        <input type="hidden" name="id" value={nt.id} />
        <input type="hidden" name="dealId" value={dealId} />
        <button
          type="submit"
          className="rounded p-1 text-ink-faint hover:bg-rose-50 hover:text-rose-600"
          title="Delete note"
        >
          <X size={13} />
        </button>
      </form>
    </span>
  );
}

const FEED_STYLE: Record<FeedItem["kind"], { bg: string; fg: string }> = {
  note: { bg: "bg-amber-100", fg: "text-amber-700" },
  activity: { bg: "bg-elevate-100", fg: "text-elevate-700" },
  task: { bg: "bg-emerald-100", fg: "text-emerald-700" },
  milestone: { bg: "bg-violet-100", fg: "text-violet-700" },
};

function FeedIcon({ kind }: { kind: FeedItem["kind"] }) {
  const Icon =
    kind === "note" ? StickyNote : kind === "task" ? CheckSquare : kind === "milestone" ? Flag : Phone;
  const s = FEED_STYLE[kind];
  return (
    <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", s.bg, s.fg)}>
      <Icon size={14} />
    </span>
  );
}

export default async function DealPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) notFound();

  const data = await getAppData();
  const deal = data.deals.find((d) => d.id === id);
  if (!deal) notFound();

  const agents = data.team.filter((m) => m.active).map((m) => m.name);
  const gci = dealGci(deal);
  const timeline = dealTimeline(deal);
  const closed = isClosed(deal);

  // Linked tasks
  const nameLc = deal.name.toLowerCase();
  const addrLc = deal.address.toLowerCase();
  const tasks = data.tasks.filter(
    (t) =>
      t.dealId === deal.id ||
      (t.relatedClient &&
        (t.relatedClient.toLowerCase() === nameLc ||
          (addrLc && t.relatedClient.toLowerCase() === addrLc)))
  );
  const openTasks = tasks.filter((t) => t.status.toLowerCase() !== "done");
  const doneTasks = tasks.filter((t) => t.status.toLowerCase() === "done");

  const activities = (await store.listActivities()).filter((a) => {
    const about = a.about.toLowerCase();
    return (
      about &&
      (about.includes(nameLc) || nameLc.includes(about) || (addrLc && about.includes(addrLc)))
    );
  });
  const notes = await store.listNotes(deal.id);

  // ── Build the unified feed ─────────────────────────────────────
  const feed: FeedItem[] = [];
  for (const nt of notes) {
    const d = new Date(nt.createdAt);
    feed.push({
      when: d.getTime(),
      dateLabel: fmtDate(nt.createdAt.slice(0, 10)),
      kind: "note",
      title: nt.author ? `${nt.author} left a note` : "Note",
      body: nt.body,
      note: nt,
    });
  }
  for (const a of activities) {
    const d = parseDateSafe(a.date);
    feed.push({
      when: d?.getTime() ?? 0,
      dateLabel: fmtDate(a.date),
      kind: "activity",
      title: a.kind,
      body: a.notes,
      who: a.who,
      activityKind: a.kind,
    });
  }
  for (const t of doneTasks) {
    const d = t.completedAt ? new Date(t.completedAt) : parseDateSafe(t.dueDate);
    feed.push({
      when: d?.getTime() ?? 0,
      dateLabel: t.completedAt ? fmtDate(t.completedAt.slice(0, 10)) : fmtDate(t.dueDate),
      kind: "task",
      title: "Task completed",
      body: t.task,
      who: t.assignedTo,
    });
  }
  for (const m of timeline.filter((x) => x.done)) {
    const d = parseDateSafe(m.date);
    feed.push({
      when: d?.getTime() ?? 0,
      dateLabel: fmtDate(m.date),
      kind: "milestone",
      title: m.label,
    });
  }
  const pinnedNotes = feed.filter((f) => f.note?.pinned);
  const stream = feed
    .filter((f) => !f.note?.pinned)
    .sort((a, b) => b.when - a.when);

  const checklist =
    (data.settings.checklists ?? DEFAULT_CHECKLISTS)[deal.side] ?? DEFAULT_CHECKLISTS[deal.side];
  const doneCount = checklist.filter((c) =>
    (deal.checklist[c.key] ?? "").toLowerCase().startsWith("y")
  ).length;

  let me = deal.agent;
  if (authConfigured) {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    const match = data.team.find((m) => email && m.email.toLowerCase() === email);
    if (match) me = match.name;
  }
  const todayIso = new Date().toISOString().slice(0, 10);

  const facts: [string, string][] = [
    ["Agent", deal.agent],
    ["Source", deal.source],
    ["Referred by", deal.referredBy],
    ["Lender", deal.lender],
    ["Close goal", deal.closeGoal],
    ["Year", String(deal.year)],
  ];

  return (
    <>
      <Topbar
        title={deal.name || deal.address}
        subtitle={deal.address && deal.name ? deal.address : undefined}
        action={
          <DealModal
            deal={deal}
            agents={agents}
            templates={data.settings.templates}
            checklists={data.settings.checklists}
            trigger={<AddButton label="Edit deal" />}
          />
        }
      />

      <Link
        href="/deals"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={13} /> All deals
      </Link>

      {/* Summary strip */}
      <div className="card mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
        <TypeBadge value={deal.side} />
        <StatusBadge value={deal.status} />
        <span className="text-sm">
          <span className="text-ink-faint">Price </span>
          <span className="font-semibold">{fmtMoney(deal.price)}</span>
        </span>
        <span className="text-sm">
          <span className="text-ink-faint">GCI </span>
          <span className="font-semibold text-emerald-700">{fmtMoney(gci)}</span>
        </span>
        <span className="text-sm">
          <span className="text-ink-faint">{closed ? "Closed " : "Closing "}</span>
          <span className="font-semibold">
            {fmtDate(closed ? deal.closedDate || deal.closeDate : deal.closeDate) || "—"}
          </span>
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Client link
          </span>
          <ShareButton dealId={deal.id} token={deal.shareToken} />
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Left: what's ahead + the story so far ── */}
        <div className="space-y-4 lg:col-span-2">
          {/* Property photo — full 16:9, never cropped into a strip */}
          {deal.photo && (
            <div className="relative aspect-video overflow-hidden rounded-2xl shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={deal.photo} alt={deal.address || deal.name} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#111118]/70 to-transparent p-4 pt-10">
                <p className="font-display text-lg font-bold text-white">
                  {deal.address || deal.name}
                </p>
              </div>
            </div>
          )}

          {timeline.some((m) => !m.done) && (
            <Section title="Coming up" action={<CalendarClock size={16} className="text-elevate-600" />}>
              <div className="flex flex-wrap gap-2">
                {timeline
                  .filter((m) => !m.done)
                  .map((m) => (
                    <span
                      key={m.label}
                      className={cn(
                        "chip",
                        m.days != null && m.days <= 3
                          ? "bg-rose-100 text-rose-700"
                          : m.days != null && m.days <= 7
                            ? "bg-amber-100 text-amber-800"
                            : "bg-elevate-100 text-elevate-800"
                      )}
                    >
                      {m.label}: {fmtDate(m.date)}
                      {m.days != null && ` (${m.days}d)`}
                    </span>
                  ))}
              </div>
            </Section>
          )}

          {/* Composer */}
          <Section title="Log it" action={<MessageSquare size={16} className="text-ink-faint" />}>
            <form action={addNote} className="mb-4">
              <input type="hidden" name="dealId" value={deal.id} />
              <textarea
                name="body"
                rows={2}
                required
                placeholder="Write a note — it lands in the timeline below…"
                className={cn(inputCls, "w-full resize-y")}
              />
              <button
                type="submit"
                className="mt-2 flex items-center gap-1.5 rounded-xl bg-elevate-500 px-3.5 py-2 text-xs font-bold text-ink transition hover:bg-elevate-400"
              >
                <Plus size={13} /> Save note
              </button>
            </form>
            <form action={logActivity} className="flex flex-wrap items-center gap-2 border-t border-mist pt-3">
              <input type="hidden" name="dealId" value={deal.id} />
              <input type="hidden" name="about" value={deal.name || deal.address} />
              <input type="hidden" name="date" value={todayIso} />
              <select name="kind" className={cn(inputBase, "w-36")} defaultValue="Call">
                {ACTIVITY_KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <select name="who" className={cn(inputBase, "w-32")} defaultValue={me}>
                {data.team.filter((m) => m.active).map((m) => (
                  <option key={m.id}>{m.name}</option>
                ))}
              </select>
              <input name="notes" placeholder="What happened?" className={cn(inputBase, "min-w-24 flex-1")} />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-ink px-3.5 py-2 text-xs font-bold text-white transition hover:bg-ink-soft"
              >
                Log
              </button>
            </form>
          </Section>

          {/* Unified timeline */}
          <Section title="The story so far">
            {pinnedNotes.length + stream.length === 0 ? (
              <EmptyState message="Nothing logged yet — notes, calls, milestones, and completed tasks all land here." />
            ) : (
              <ol className="relative">
                <span className="absolute bottom-2 left-4 top-2 w-px bg-mist" aria-hidden />
                {[...pinnedNotes, ...stream].map((item, i) => (
                  <li key={i} className="group relative flex gap-3.5 pb-5 last:pb-0">
                    <FeedIcon kind={item.kind} />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <span className="font-semibold">
                          {item.note?.pinned && <Pin size={11} className="mr-1 inline text-elevate-600" />}
                          {item.title}
                        </span>
                        <span className="text-xs text-ink-faint">
                          {item.who && `${item.who} · `}
                          {item.dateLabel}
                        </span>
                      </p>
                      {item.body && (
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-muted">{item.body}</p>
                      )}
                    </div>
                    {item.note && <NoteActions nt={item.note} dealId={deal.id} />}
                  </li>
                ))}
              </ol>
            )}
            {deal.notes && (
              <div className="mt-4 rounded-xl bg-chalk/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  From the deal form
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">{deal.notes}</p>
              </div>
            )}
          </Section>
        </div>

        {/* ── Right: work to do + facts ── */}
        <div className="space-y-4">
          <Section
            title={CHECKLIST_TITLES[deal.side]}
            action={
              <span className="text-xs font-semibold text-ink-muted">
                {doneCount}/{checklist.length}
              </span>
            }
          >
            <ul className="space-y-1.5">
              {checklist.map((c) => {
                const on = (deal.checklist[c.key] ?? "").toLowerCase().startsWith("y");
                return (
                  <li key={c.key}>
                    <form action={toggleCheck}>
                      <input type="hidden" name="kind" value="deal" />
                      <input type="hidden" name="id" value={deal.id} />
                      <input type="hidden" name="key" value={c.key} />
                      <input type="hidden" name="on" value={String(!on)} />
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-mist"
                      >
                        <span
                          className={cn(
                            "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2",
                            on ? "border-emerald-500 bg-emerald-500 text-white" : "border-ink-faint/40"
                          )}
                        >
                          {on && <Check size={12} strokeWidth={3} />}
                        </span>
                        <span className={cn(on && "text-ink-faint line-through")}>{c.label}</span>
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section
            title={`Tasks (${openTasks.length} open)`}
            action={
              <TaskModal
                team={agents}
                defaults={{ dealId: deal.id, relatedClient: deal.name || deal.address }}
                trigger={
                  <button className="flex items-center gap-1 text-xs font-semibold text-elevate-600 hover:underline">
                    <CheckSquare size={13} /> New
                  </button>
                }
              />
            }
          >
            {data.settings.templates.length > 0 && (
              <form
                action={applyTemplateToDeal}
                className="mb-3 flex items-center gap-2 rounded-xl bg-chalk/70 px-2.5 py-2"
              >
                <ListPlus size={13} className="shrink-0 text-ink-faint" />
                <input type="hidden" name="dealId" value={deal.id} />
                <select name="templateId" className="min-w-0 flex-1 rounded-lg border border-mist bg-white px-2 py-1.5 text-xs outline-none">
                  {data.settings.templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.items.length})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-elevate-500 px-2.5 py-1.5 text-xs font-bold text-ink transition hover:bg-elevate-400"
                >
                  Apply
                </button>
              </form>
            )}
            {openTasks.length > 0 ? (
              <ul className="space-y-2">
                {openTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5 rounded-xl border border-mist/70 bg-white p-2.5">
                    <form action={toggleTask}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="done" value="true" />
                      <button
                        type="submit"
                        aria-label="Complete task"
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-ink-faint/40 transition hover:border-emerald-500 hover:bg-emerald-50"
                      />
                    </form>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{t.task}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {t.assignedTo || "Unassigned"} · {fmtDate(t.dueDate) || "no date"}
                      </p>
                    </div>
                    <TaskModal task={t} team={agents} trigger={<EditIcon />} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="No open tasks." />
            )}
          </Section>

          <Section title="Details">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {facts
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{k}</p>
                    <p className="text-sm font-medium">{v}</p>
                  </div>
                ))}
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
