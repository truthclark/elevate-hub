import { store } from "@/lib/store";
import { dealTimeline, isClosed } from "@/lib/derive";
import { fmtDate, daysUntil, initialsOf } from "@/lib/utils";
import { hasRole } from "@/lib/types";
import { brandOf, DEFAULT_BRAND } from "@/lib/brand";
import { Check, CalendarClock, Home, Phone, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

// Public, read-only client timeline. Token-gated: only people with the link
// can see it, and it shows dates + progress only (no money, no notes).

export default async function ClientTimelinePage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  let deals: Awaited<ReturnType<typeof store.listDeals>> = [];
  let team: Awaited<ReturnType<typeof store.listTeam>> = [];
  let brand = DEFAULT_BRAND;
  let logo: string | undefined;
  try {
    const [d, t, settings] = await Promise.all([
      store.listDeals(),
      store.listTeam(),
      store.getSettings(),
    ]);
    deals = d;
    team = t;
    brand = brandOf(settings);
    logo = settings.branding?.logo;
  } catch {
    // fall through to inactive-link message
  }
  const deal = token ? deals.find((d) => d.shareToken === token && !d.archived) : undefined;

  if (!deal) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-chalk p-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="font-display text-lg font-bold">This link is no longer active</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Reach out to your agent at {brand.companyName} and they can send you a fresh one.
          </p>
        </div>
      </main>
    );
  }

  const timeline = dealTimeline(deal);
  const closed = isClosed(deal);
  const doneCount = timeline.filter((m) => m.done).length;
  const next = timeline.find((m) => !m.done && m.days != null && m.days >= 0);

  // Plain-English explainer for whatever comes next
  const NEXT_UP: Record<string, string> = {
    Contract: "Your offer is signed and official — the clock starts now.",
    "Option ends":
      "This is your inspection window. We check everything, and you can walk away for any reason before it ends.",
    Inspection:
      "A licensed inspector goes through the home top to bottom. We'll review the full report together.",
    Financing:
      "Your lender finishes underwriting. Sending documents back quickly is the #1 way to keep this on time.",
    Appraisal:
      "The lender independently confirms the home's value. Totally routine — and we handle any surprises.",
    Closing: "Signing day. Bring your photo ID, leave with your keys.",
  };
  const pct = timeline.length ? doneCount / timeline.length : 0;
  const RING = 2 * Math.PI * 26; // r=26 circle circumference
  const agent =
    team.find((m) => m.name.toLowerCase() === deal.agent.toLowerCase()) ??
    team.find((m) => m.active && hasRole(m, "Agent"));
  const closeDays = daysUntil(deal.closeDate);

  return (
    <main className="min-h-screen bg-chalk pb-16">
      {/* Header */}
      <div className="relative overflow-hidden bg-ink px-5 pb-16 pt-8 text-white">
        <div className="relative mx-auto max-w-xl">
          <div className="flex items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={brand.companyName} className="h-10 w-10 rounded-xl bg-white object-contain p-1" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-elevate-500 font-display text-lg font-bold text-ink">
                {brand.companyName.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-display text-sm font-bold">{brand.companyName}</p>
              <p className="text-[11px] text-white/50">Brokered by {brand.brokerageName}</p>
            </div>
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold">
            {closed ? "Congratulations — you closed!" : "Your transaction, live"}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-white/60">
            <Home size={15} />
            {deal.address || deal.name}
          </p>
          {!closed && next && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm">
              <CalendarClock size={15} className="text-elevate-400" />
              Next up: <b>{next.label}</b>
              {next.days === 0 ? " today" : next.days === 1 ? " tomorrow" : ` in ${next.days} days`}
            </p>
          )}
          {!closed && !next && closeDays != null && closeDays >= 0 && (
            <p className="mt-4 text-sm text-white/70">{closeDays} days to closing.</p>
          )}
        </div>
      </div>

      <div className="mx-auto -mt-8 max-w-xl px-5">
        {/* Property photo — full 16:9, shown whole like a listing card */}
        {deal.photo && (
          <div className="mb-4 aspect-video overflow-hidden rounded-2xl shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={deal.photo}
              alt={deal.address || "Your new home"}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Progress card */}
        <div className="card p-6">
          <div className="mb-2 flex items-center gap-4">
            {/* progress ring */}
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 60 60" className="h-16 w-16 -rotate-90">
                <circle cx="30" cy="30" r="26" fill="none" stroke="rgb(var(--mist))" strokeWidth="6" />
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="none"
                  stroke="#05c3f9"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={RING}
                  strokeDashoffset={RING * (1 - pct)}
                  style={{ transition: "stroke-dashoffset 1s ease-out" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold">
                {Math.round(pct * 100)}%
              </span>
            </div>
            <div>
              <p className="font-display text-base font-bold">
                {closed ? "Every milestone, done." : "Your progress"}
              </p>
              <p className="text-sm text-ink-muted">
                {doneCount} of {timeline.length} milestones complete
              </p>
            </div>
          </div>

          <ol className="mt-6 space-y-0">
            {timeline.map((m, i) => (
              <li key={m.label} className="relative flex gap-4 pb-6 last:pb-0">
                {i < timeline.length - 1 && (
                  <span
                    className={`absolute left-[13px] top-7 h-full w-0.5 ${m.done ? "bg-elevate-300" : "bg-mist"}`}
                  />
                )}
                <span
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                    m.done
                      ? "border-elevate-500 bg-elevate-500 text-white"
                      : "border-mist bg-white text-ink-faint"
                  }`}
                >
                  {m.done ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className={`text-sm font-semibold ${m.done ? "text-ink" : "text-ink-muted"}`}>
                    {m.label}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {fmtDate(m.date)}
                    {!m.done && m.days != null && m.days >= 0 && (
                      <span className="ml-1.5 font-semibold text-elevate-700">
                        {m.days === 0 ? "today" : m.days === 1 ? "tomorrow" : `in ${m.days} days`}
                      </span>
                    )}
                  </p>
                  {/* what-happens-next explainer on the upcoming milestone */}
                  {next && m.label === next.label && NEXT_UP[m.label] && (
                    <p className="mt-2 rounded-xl bg-elevate-50 px-3 py-2.5 text-xs leading-relaxed text-elevate-900">
                      <span className="font-bold">What this means: </span>
                      {NEXT_UP[m.label]}
                    </p>
                  )}
                </div>
              </li>
            ))}
            {timeline.length === 0 && (
              <p className="text-sm text-ink-faint">
                Dates will appear here as soon as your contract timeline is set.
              </p>
            )}
          </ol>
        </div>

        {/* Agent card */}
        {agent && (
          <div className="card mt-4 flex items-center gap-4 p-5">
            {agent.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.photo} alt={agent.name} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full font-display text-sm font-bold text-white"
                style={{ background: agent.color }}
              >
                {initialsOf(agent.name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{agent.name}</p>
              <p className="text-xs text-ink-faint">Questions? Reach out anytime.</p>
            </div>
            <div className="flex gap-2">
              {agent.phone && (
                <a href={`tel:${agent.phone}`} className="rounded-xl bg-elevate-500 p-2.5 text-ink" aria-label="Call">
                  <Phone size={16} />
                </a>
              )}
              {agent.email && (
                <a href={`mailto:${agent.email}`} className="rounded-xl border border-mist p-2.5 text-ink-muted" aria-label="Email">
                  <Mail size={16} />
                </a>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-ink-faint">
          This page updates automatically as your transaction moves forward.
        </p>
      </div>
    </main>
  );
}
