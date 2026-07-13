import Link from "next/link";
import { notFound } from "next/navigation";
import Topbar from "@/components/topbar";
import { EmptyState } from "@/components/ui";
import { store } from "@/lib/store";
import { currentRole } from "@/auth";
import {
  createLeadFromSubmission,
  attachSubmission,
  deleteSubmission,
} from "@/app/actions";
import { isClosed } from "@/lib/derive";
import { cn } from "@/lib/utils";
import { ArrowLeft, UserPlus, Link2, Trash2, CheckCircle2, Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

// Response inbox for an intake form: read answers, create a lead from a
// response, or attach it to an existing lead/client.
export default async function ResponsesPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) notFound();
  const funnel = (await store.listFunnels()).find((f) => f.id === id);
  if (!funnel) notFound();

  const [subs, leads, deals] = await Promise.all([
    store.listSubmissions(id),
    store.listLeads(),
    store.listDeals(),
  ]);
  const role = await currentRole();
  const isAdmin = role === "Admin";
  const activeLeads = leads.filter((l) => !l.archived);
  const activeDeals = deals.filter((d) => !d.archived && !isClosed(d));
  const leadName = (lid: number | null) => leads.find((l) => l.id === lid)?.name;
  const dealName = (did: number | null) => {
    const d = deals.find((x) => x.id === did);
    return d ? d.name || d.address : undefined;
  };

  return (
    <>
      <Topbar
        title={`${funnel.name} — responses`}
        subtitle={`${subs.length} received · /f/${funnel.slug}`}
      />
      <Link
        href="/funnels"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={13} /> All funnels & forms
      </Link>

      {subs.length === 0 ? (
        <EmptyState message="No responses yet — share the form link and they'll land here." />
      ) : (
        <div className="space-y-4">
          {subs.map((sub) => {
            const linkedLead = leadName(sub.leadId);
            const linkedDeal = dealName(sub.dealId);
            const linked = Boolean(linkedLead || linkedDeal);
            return (
              <div key={sub.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-[15px] font-bold">{sub.name || "(no name)"}</p>
                    <p className="text-xs text-ink-muted">
                      {[sub.email, sub.phone].filter(Boolean).join(" · ") || "no contact info"}
                      {" · "}
                      {new Date(sub.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {linked ? (
                    <span className="chip bg-emerald-100 text-emerald-800">
                      <CheckCircle2 size={12} />
                      {linkedDeal ? (
                        <Link href={`/deals/${sub.dealId}`} className="hover:underline">
                          Attached to {linkedDeal}
                        </Link>
                      ) : (
                        <Link href="/leads" className="hover:underline">
                          Lead: {linkedLead}
                        </Link>
                      )}
                    </span>
                  ) : (
                    <span className="chip bg-amber-100 text-amber-800">
                      <Inbox size={12} /> New
                    </span>
                  )}
                </div>

                {/* Answers */}
                <dl className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {sub.answers.map((a, i) => (
                    <div key={i} className={cn(a.value.length > 60 && "sm:col-span-2")}>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                        {a.label}
                      </dt>
                      <dd className="whitespace-pre-wrap text-sm">{a.value}</dd>
                    </div>
                  ))}
                  {sub.answers.length === 0 && (
                    <p className="text-sm text-ink-faint">Contact info only.</p>
                  )}
                </dl>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-mist pt-4">
                  {!linked && (
                    <form action={createLeadFromSubmission}>
                      <input type="hidden" name="id" value={sub.id} />
                      <button className="flex items-center gap-1.5 rounded-xl bg-elevate-500 px-3.5 py-2 text-xs font-bold text-ink transition hover:bg-elevate-400">
                        <UserPlus size={13} /> Create lead
                      </button>
                    </form>
                  )}
                  <form action={attachSubmission} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={sub.id} />
                    <select
                      name="target"
                      className="rounded-xl border border-mist bg-white px-2.5 py-2 text-xs outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        {linked ? "Re-attach to…" : "Attach to existing…"}
                      </option>
                      {activeDeals.length > 0 && (
                        <optgroup label="Clients / deals">
                          {activeDeals.map((d) => (
                            <option key={`d${d.id}`} value={`deal:${d.id}`}>
                              {d.name || d.address} ({d.side})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {activeLeads.length > 0 && (
                        <optgroup label="Leads">
                          {activeLeads.map((l) => (
                            <option key={`l${l.id}`} value={`lead:${l.id}`}>
                              {l.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <button className="flex items-center gap-1.5 rounded-xl border border-mist px-3 py-2 text-xs font-semibold text-ink-muted transition hover:border-elevate-300 hover:text-elevate-700">
                      <Link2 size={12} /> Attach
                    </button>
                  </form>
                  {isAdmin && (
                    <form
                      action={deleteSubmission}
                      className="ml-auto"
                    >
                      <input type="hidden" name="id" value={sub.id} />
                      <button
                        className="rounded-lg p-1.5 text-ink-faint transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Delete response"
                      >
                        <Trash2 size={13} />
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-xs text-ink-faint">
        Attaching a response to a client adds the answers as a note on their deal record.
        Attaching to a lead appends them to the lead&apos;s notes.
      </p>
    </>
  );
}
