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
import { fmtMoney, fmtDate, cn } from "@/lib/utils";
import { inputCls } from "@/components/modal";
import { DEFAULT_CHECKLISTS, CHECKLIST_TITLES, ACTIVITY_KINDS, DealNote } from "@/lib/types";
import {
  ArrowLeft,
  Check,
  CalendarClock,
  StickyNote,
  MessageSquare,
  CheckSquare,
  Pin,
  PinOff,
  X,
  ListPlus,
  Plus,
} from "lucide-react";

export const dynamic = "force-dynamic";

function NoteCard({ nt, dealId }: { nt: DealNote; dealId: number }) {
  return (
    <li
      className={cn(
        "group rounded-xl border p-3",
        nt.pinned ? "border-elevate-200 bg-elevate-50/50" : "border-mist/70 bg-white"
      )}
    >
      <div className="flex items-start gap-2">
        {nt.pinned && <Pin size={12} className="mt-1 shrink-0 text-elevate-600" />}
        <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{nt.body}</p>
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
      </div>
      <p className="mt-1.5 text-[11px] text-ink-faint">
        {nt.author} · {fmtDate(nt.createdAt.slice(0, 10))}
      </p>
    </li>
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

  // Linked tasks: by dealId first, then by related-client text match
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

  // Activity entries that mention this client or property
  const activities = (await store.listActivities()).filter((a) => {
    const about = a.about.toLowerCase();
    return (
      about &&
      (about.includes(nameLc) ||
        nameLc.includes(about) ||
        (addrLc && about.includes(addrLc)))
    );
  });

  // Notes: pinned first, then newest
  const notes = await store.listNotes(deal.id);
  const sortedNotes = [
    ...notes.filter((nt) => nt.pinned),
    ...notes.filter((nt) => !nt.pinned),
  ];
  const visibleNotes = sortedNotes.slice(0, 3);
  const moreNotes = sortedNotes.slice(3);

  // Signed-in member (for the activity quick-log default)
  let me = deal.agent;
  if (authConfigured) {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    const match = data.team.find((m) => email && m.email.toLowerCase() === email);
    if (match) me = match.name;
  }
  const todayIso = new Date().toISOString().slice(0, 10);

  const checklist =
    (data.settings.checklists ?? DEFAULT_CHECKLISTS)[deal.side] ??
    DEFAULT_CHECKLISTS[deal.side];
  const doneCount = checklist.filter((c) =>
    (deal.checklist[c.key] ?? "").toLowerCase().startsWith("y")
  ).length;

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

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {/* Timeline */}
        <Section
          title="Timeline"
          className="lg:col-span-2"
          action={<CalendarClock size={16} className="text-elevate-600" />}
        >
          {timeline.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {timeline.map((m) => (
                <span
                  key={m.label}
                  className={cn(
                    "chip",
                    m.done
                      ? "bg-mist text-ink-faint line-through"
                      : m.days != null && m.days <= 3
                        ? "bg-rose-100 text-rose-700"
                        : m.days != null && m.days <= 7
                          ? "bg-amber-100 text-amber-800"
                          : "bg-elevate-100 text-elevate-800"
                  )}
                >
                  {m.label}: {fmtDate(m.date)}
                  {!m.done && m.days != null && ` (${m.days}d)`}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState message="No contract dates yet — add them with Edit deal." />
          )}
          {/* Facts */}
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-mist pt-4 sm:grid-cols-3">
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

        {/* Checklist */}
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
                          on
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-ink-faint/40"
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
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Tasks */}
        <Section
          title={`Tasks (${openTasks.length} open)`}
          className="lg:col-span-2"
          action={
            <TaskModal
              team={agents}
              defaults={{ dealId: deal.id, relatedClient: deal.name || deal.address }}
              trigger={
                <button className="flex items-center gap-1 text-xs font-semibold text-elevate-600 hover:underline">
                  <CheckSquare size={13} /> New task
                </button>
              }
            />
          }
        >
          {data.settings.templates.length > 0 && (
            <form
              action={applyTemplateToDeal}
              className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-chalk/70 px-3 py-2.5"
            >
              <ListPlus size={14} className="shrink-0 text-ink-faint" />
              <span className="text-xs font-semibold text-ink-muted">Apply SOP template:</span>
              <input type="hidden" name="dealId" value={deal.id} />
              <select name="templateId" className="min-w-0 flex-1 rounded-lg border border-mist bg-white px-2 py-1.5 text-xs outline-none">
                {data.settings.templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.items.length} tasks)
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-elevate-500 px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-elevate-400"
              >
                Apply
              </button>
            </form>
          )}
          {openTasks.length > 0 ? (
            <ul className="space-y-2">
              {openTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-xl border border-mist/70 bg-white p-3"
                >
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
                    <p className="text-sm font-medium">{t.task}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {t.assignedTo || "Unassigned"} · {fmtDate(t.dueDate) || "no date"}
                    </p>
                  </div>
                  <TaskModal task={t} team={agents} trigger={<EditIcon />} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No open tasks for this deal." />
          )}
          {doneTasks.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-mist pt-3">
              {doneTasks.slice(-6).map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm text-ink-faint">
                  <Check size={13} className="text-emerald-500" />
                  <span className="line-through">{t.task}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Notes + activity */}
        <div className="flex flex-col gap-4">
          <Section
            title={`Notes${notes.length ? ` (${notes.length})` : ""}`}
            action={<StickyNote size={16} className="text-ink-faint" />}
          >
            {/* Composer */}
            <form action={addNote} className="mb-3">
              <input type="hidden" name="dealId" value={deal.id} />
              <textarea
                name="body"
                rows={2}
                required
                placeholder="Add a note…"
                className={cn(inputCls, "w-full resize-y")}
              />
              <button
                type="submit"
                className="mt-2 flex items-center gap-1.5 rounded-xl bg-elevate-500 px-3.5 py-2 text-xs font-bold text-ink transition hover:bg-elevate-400"
              >
                <Plus size={13} /> Save note
              </button>
            </form>

            {sortedNotes.length > 0 ? (
              <>
                <ul className="space-y-2">
                  {visibleNotes.map((nt) => (
                    <NoteCard key={nt.id} nt={nt} dealId={deal.id} />
                  ))}
                </ul>
                {moreNotes.length > 0 && (
                  <details className="group mt-2">
                    <summary className="cursor-pointer list-none text-xs font-semibold text-elevate-600 hover:underline [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">Show all {sortedNotes.length} notes</span>
                      <span className="hidden group-open:inline">Show fewer</span>
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {moreNotes.map((nt) => (
                        <NoteCard key={nt.id} nt={nt} dealId={deal.id} />
                      ))}
                    </ul>
                  </details>
                )}
              </>
            ) : (
              !deal.notes && <EmptyState message="No notes yet." />
            )}

            {/* Legacy free-text notes from the deal form */}
            {deal.notes && (
              <div className="mt-3 rounded-xl bg-chalk/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  From the deal form
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">{deal.notes}</p>
              </div>
            )}
          </Section>

          <Section title="Activity" action={<MessageSquare size={16} className="text-ink-faint" />}>
            {/* Quick log */}
            <form action={logActivity} className="mb-3 space-y-2">
              <input type="hidden" name="dealId" value={deal.id} />
              <input type="hidden" name="about" value={deal.name || deal.address} />
              <input type="hidden" name="date" value={todayIso} />
              <div className="flex gap-2">
                <select name="kind" className={cn(inputCls, "flex-1")} defaultValue="Call">
                  {ACTIVITY_KINDS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <select name="who" className={cn(inputCls, "flex-1")} defaultValue={me}>
                  {data.team.filter((m) => m.active).map((m) => (
                    <option key={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input name="notes" placeholder="What happened? (optional)" className={cn(inputCls, "min-w-0 flex-1")} />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-ink px-3.5 py-2 text-xs font-bold text-white transition hover:bg-ink-soft"
                >
                  Log
                </button>
              </div>
            </form>

            {activities.length > 0 ? (
              <ul className="space-y-2.5">
                {activities.slice(0, 8).map((a) => (
                  <li key={a.id} className="text-sm">
                    <p className="font-medium">
                      {a.kind}
                      <span className="ml-2 text-xs font-normal text-ink-faint">
                        {a.who} · {fmtDate(a.date)}
                      </span>
                    </p>
                    {a.notes && <p className="text-xs text-ink-muted">{a.notes}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="Nothing logged yet." />
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
