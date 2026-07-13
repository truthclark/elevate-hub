import Link from "next/link";
import Topbar from "@/components/topbar";
import { Section, StatCard, LoftyLink } from "@/components/ui";
import { DealModal, AddButton } from "@/components/forms";
import ClientsTable from "@/components/clients-table";
import ListingsTable from "@/components/listings-table";
import TxnTable, { TxnRow } from "@/components/txn-table";
import DealBoard from "@/components/deal-board";
import {
  getAppData,
  dealGci,
  dealTimeline,
  isClosed,
  isPending,
  buildAlerts,
} from "@/lib/derive";
import { fmtMoney, cn } from "@/lib/utils";
import {
  AlertTriangle,
  FileSignature,
  CheckCircle2,
  Clock,
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

export default async function DealsPage({
  searchParams,
}: {
  searchParams?: { view?: string };
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
    closed: `${closed.length} closed`,
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
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="In progress" value={String(pendingRows.length)} icon={FileSignature} tint="cyan" />
            <StatCard
              label="Pending volume"
              value={fmtMoney(pendingRows.reduce((s, r) => s + (r.deal.price ?? 0), 0), true)}
              icon={Clock}
              tint="amber"
            />
            <StatCard
              label="Closed YTD"
              value={String(rows.filter((r) => r.closed).length)}
              icon={CheckCircle2}
              tint="green"
            />
            <StatCard label="Alerts" value={String(alerts.length)} icon={AlertTriangle} tint="slate" />
          </div>

          {alerts.length > 0 && (
            <Section
              title="Needs attention"
              className="mb-6 border-amber-200 bg-gradient-to-br from-amber-50/60 to-white"
            >
              <ul className="space-y-2">
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
            </Section>
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
        <Section title="Closed deals">
          <ClientsTable
            deals={closed}
            agents={agents}
            templates={data.settings.templates}
            checklists={data.settings.checklists}
            gciBy={gciBy}
            closedView
          />
        </Section>
      )}
    </>
  );
}
