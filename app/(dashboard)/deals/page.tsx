import Link from "next/link";
import Topbar from "@/components/topbar";
import { Section, StatCard, LoftyLink } from "@/components/ui";
import { DealModal, AddButton } from "@/components/forms";
import ClientsTable from "@/components/clients-table";
import ListingsTable from "@/components/listings-table";
import TxnTable, { TxnRow } from "@/components/txn-table";
import DealBoard from "@/components/deal-board";
import { MoneyBars } from "@/components/charts";
import {
  getAppData,
  dealGci,
  dealTimeline,
  isClosed,
  isPending,
  buildAlerts,
} from "@/lib/derive";
import { fmtMoney, parseDateSafe, cn } from "@/lib/utils";
import {
  AlertTriangle,
  FileSignature,
  CheckCircle2,
  Clock,
  DollarSign,
  Home,
  Tag,
} from "lucide-react";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "board", label: "Board" },
  { key: "active", label: "Active" },
  { key: "contract", label: "Under Contract" },
  { key: "listings", label: "Listings" },
  { key: "closed", label: "Closed" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

const CHECK = (v?: string) => (v ?? "").toLowerCase().startsWith("y");

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function DealsPage({
  searchParams,
}: {
  searchParams?: { view?: string; year?: string };
}) {
  const view: ViewKey = (VIEWS.some((v) => v.key === searchParams?.view)
    ? searchParams?.view
    : "active") as ViewKey;

  const data = await getAppData();
  const agents = data.team.filter((m) => m.active).map((m) => m.name);
  const gciBy: Record<number, number | null> = {};
  for (const d of data.deals) gciBy[d.id] = dealGci(d);

  // View datasets
  const active = data.deals.filter((d) => !isClosed(d));
  const closed = data.deals.filter(isClosed);
  const listings = data.deals.filter((d) => d.side === "Listing" && !isClosed(d));
  const onMarket = listings.filter((d) => CHECK(d.checklist.mls));

  const txnDeals = data.deals.filter(
    (d) => d.side !== "Referral" || isPending(d) || isClosed(d)
  );
  const rows: TxnRow[] = txnDeals
    .filter((d) => isClosed(d) || isPending(d) || d.closeDate || d.contractDate)
    .map((d) => ({
      deal: d,
      gci: dealGci(d),
      timeline: dealTimeline(d),
      closed: isClosed(d),
    }));
  const pendingRows = rows.filter((r) => !r.closed);
  const alerts = buildAlerts(data.deals, []).filter((a) =>
    a.href.startsWith("/deals")
  );

  const boardDeals = data.deals.filter((d) => d.year === data.settings.year || !isClosed(d));

  // ── Closed view: pick a year, see that year's story ─────────────
  const closedYearOf = (d: (typeof closed)[number]) =>
    parseDateSafe(d.closedDate || d.closeDate)?.getFullYear() ?? d.year;
  const closedYears = Array.from(new Set(closed.map(closedYearOf))).sort((a, b) => b - a);
  const requestedYear = parseInt(searchParams?.year ?? "");
  const closedYear = closedYears.includes(requestedYear)
    ? requestedYear
    : closedYears.includes(data.settings.year)
      ? data.settings.year
      : (closedYears[0] ?? data.settings.year);
  const closedInYear = closed.filter((d) => closedYearOf(d) === closedYear);
  const closedVolume = closedInYear.reduce((s, d) => s + (d.price ?? 0), 0);
  const closedGciTotal = closedInYear.reduce((s, d) => s + (gciBy[d.id] ?? 0), 0);
  const monthly = MONTHS.map((month) => ({ month, closings: 0, volume: 0, gci: 0 }));
  for (const d of closedInYear) {
    const dt = parseDateSafe(d.closedDate || d.closeDate);
    if (!dt) continue;
    const m = monthly[dt.getMonth()];
    m.closings += 1;
    m.volume += d.price ?? 0;
    m.gci += gciBy[d.id] ?? 0;
  }

  const counts: Record<ViewKey, number> = {
    board: active.length,
    active: active.length,
    contract: pendingRows.length,
    listings: listings.length,
    closed: closed.length,
  };

  const subtitleBy: Record<ViewKey, string> = {
    board: "Drag deals through the pipeline.",
    active: `${active.length} active · ${closed.length} closed this year`,
    contract: "Everything under contract or headed to the closing table.",
    listings: `${listings.length} active · ${onMarket.length} on the MLS`,
    closed: `${closedInYear.length} closed in ${closedYear}`,
  };

  return (
    <>
      <Topbar
        title="Deals"
        subtitle={subtitleBy[view]}
        action={
          <div className="flex items-center gap-2">
            <LoftyLink />
            <DealModal
              agents={agents}
              templates={data.settings.templates}
              checklists={data.settings.checklists}
              defaultSide={view === "listings" ? "Listing" : undefined}
              trigger={
                <AddButton label={view === "listings" ? "New listing" : "New deal"} />
              }
            />
          </div>
        }
      />

      {/* View tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "active" ? "/deals" : `/deals?view=${v.key}`}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              view === v.key
                ? "bg-ink text-white"
                : "border border-mist bg-white text-ink-muted hover:text-ink"
            )}
          >
            {v.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] font-bold",
                view === v.key ? "bg-white/20 text-white" : "bg-mist text-ink-muted"
              )}
            >
              {counts[v.key]}
            </span>
          </Link>
        ))}
      </div>

      {view === "board" && <DealBoard deals={boardDeals} team={data.team} />}

      {view === "active" && (
        <Section title="Active deals">
          <ClientsTable
            deals={active}
            agents={agents}
            templates={data.settings.templates}
            checklists={data.settings.checklists}
            gciBy={gciBy}
          />
        </Section>
      )}

      {view === "contract" && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="In progress" value={String(pendingRows.length)} icon={FileSignature} tint="cyan" />
            <StatCard
              label="Pending volume"
              value={fmtMoney(pendingRows.reduce((s, r) => s + (r.deal.price ?? 0), 0), true)}
              icon={Clock}
              tint="amber"
            />
            <StatCard
              label="Pending GCI"
              value={fmtMoney(pendingRows.reduce((s, r) => s + (r.gci ?? 0), 0), true)}
              sub="what's coming when these close"
              icon={DollarSign}
              tint="green"
            />
            <StatCard
              label="Closed YTD"
              value={String(rows.filter((r) => r.closed).length)}
              icon={CheckCircle2}
              tint="slate"
            />
          </div>

          {/* Alerts live in a compact bubble — tap to expand */}
          {alerts.length > 0 && (
            <details className="group mb-6">
              <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 [&::-webkit-details-marker]:hidden">
                <AlertTriangle size={14} />
                {alerts.length} need{alerts.length === 1 ? "s" : ""} attention
                <span className="text-xs font-normal text-amber-700/70 group-open:hidden">· show</span>
                <span className="hidden text-xs font-normal text-amber-700/70 group-open:inline">· hide</span>
              </summary>
              <ul className="mt-3 space-y-2 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-white p-4">
                {alerts.map((a, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                    <AlertTriangle
                      size={15}
                      className={a.severity === "red" ? "text-rose-600" : "text-amber-600"}
                    />
                    <span className="font-semibold">{a.label}</span>
                    <span className="text-xs text-ink-faint">{a.detail}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <Section title="Transaction pipeline">
            <TxnTable
              rows={rows}
              agents={agents}
              templates={data.settings.templates}
              checklists={data.settings.checklists}
              initialView="pending"
            />
          </Section>
        </>
      )}

      {view === "listings" && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Active listings" value={String(listings.length)} icon={Home} tint="cyan" />
            <StatCard
              label="Active list volume"
              value={fmtMoney(listings.reduce((s, d) => s + (d.price ?? 0), 0), true)}
              icon={Tag}
              tint="slate"
            />
            <StatCard label="On the MLS" value={String(onMarket.length)} icon={CheckCircle2} tint="green" />
            <StatCard
              label="Closed YTD"
              value={String(closed.filter((d) => d.side === "Listing").length)}
              icon={Home}
              tint="amber"
            />
          </div>
          <Section title="Active listings">
            <ListingsTable
              deals={listings}
              agents={agents}
              templates={data.settings.templates}
              checklists={data.settings.checklists}
              gciBy={gciBy}
            />
          </Section>
        </>
      )}

      {view === "closed" && (
        <>
          {/* Year filter */}
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {closedYears.map((y) => (
              <Link
                key={y}
                href={`/deals?view=closed&year=${y}`}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  y === closedYear
                    ? "bg-elevate-500 text-ink"
                    : "border border-mist bg-white text-ink-muted hover:text-ink"
                )}
              >
                {y}
              </Link>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard
              label={`Closed in ${closedYear}`}
              value={String(closedInYear.length)}
              icon={CheckCircle2}
              tint="green"
            />
            <StatCard
              label="Closed volume"
              value={fmtMoney(closedVolume, true)}
              icon={Home}
              tint="cyan"
            />
            <StatCard
              label="Closed GCI"
              value={fmtMoney(closedGciTotal, true)}
              sub="gross, before split & fees"
              icon={DollarSign}
              tint="amber"
            />
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <Section title="Closings by month">
              <MoneyBars data={monthly} dataKey="closings" name="Closings" />
            </Section>
            <Section title="Volume by month">
              <MoneyBars data={monthly} dataKey="volume" name="Volume" color="#34d399" />
            </Section>
            <Section title="GCI by month">
              <MoneyBars data={monthly} dataKey="gci" name="GCI" color="#fbbf24" />
            </Section>
          </div>

          <Section title={`Closed deals — ${closedYear}`}>
            <ClientsTable
              deals={closedInYear}
              agents={agents}
              templates={data.settings.templates}
              checklists={data.settings.checklists}
              gciBy={gciBy}
              closedView
            />
          </Section>
        </>
      )}
    </>
  );
}
