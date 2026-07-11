import Topbar from "@/components/topbar";
import { Section, StatCard, Progress, Table, Td } from "@/components/ui";
import { MoneyBars, AgentBars, SourcePie, QuarterChart } from "@/components/charts";
import { getAppData, pipelineStats, dealGci, isClosed, isPending, gciWaterfall } from "@/lib/derive";
import { fmtMoney, parseDateSafe, fmtDate, cn } from "@/lib/utils";
import { DEFAULT_BROKERAGE } from "@/lib/types";
import { resolveRange, inRange } from "@/lib/report-range";
import ReportFilters from "@/components/report-filters";
import { TrendingUp, DollarSign, Percent, Layers, ArrowRight, FileDown } from "lucide-react";

const PDF_REPORTS = [
  { type: "production", label: "Production Report", desc: "Closed units, volume, and GCI, broken down by agent and deal." },
  { type: "pipeline", label: "Pipeline Report", desc: "Everything active and under contract, with projected commission." },
  { type: "money", label: "Money Report", desc: "GCI waterfall, brokerage split, cap progress, and P&L summary." },
  { type: "sources", label: "Leads & Sources", desc: "Lead pipeline status, conversion rate, and business by source." },
];

export const dynamic = "force-dynamic";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { period?: string; agent?: string };
}) {
  const data = await getAppData();
  const year = data.settings.year;
  const targets = data.settings.targets[String(year)] ?? { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 };
  const range = resolveRange(searchParams?.period, year);
  const agentF = searchParams?.agent ?? "";
  const allAgents = data.team.filter((m) => m.active).map((m) => m.name);

  // Filters: agent applies to everything; period applies to closed business
  // (pipeline is always "right now")
  const deals = data.deals.filter(
    (d) => d.year === year && (!agentF || d.agent === agentF)
  );
  const statsDeals = deals.filter(
    (d) => !isClosed(d) || inRange(d.closedDate || d.closeDate, range)
  );
  const stats = pipelineStats(statsDeals, targets);
  const closed = statsDeals.filter(isClosed);
  const filterQuery = `${searchParams?.period ? `&period=${searchParams.period}` : ""}${agentF ? `&agent=${encodeURIComponent(agentF)}` : ""}`;

  const monthly = MONTHS.map((month) => ({ month, closings: 0, volume: 0, gci: 0 }));
  for (const d of closed) {
    const dt = parseDateSafe(d.closedDate || d.closeDate);
    if (!dt) continue;
    const m = monthly[dt.getMonth()];
    m.closings += 1;
    m.volume += d.price ?? 0;
    m.gci += dealGci(d) ?? 0;
  }
  const activeMonths = monthly.slice(0, new Date().getMonth() + 1);

  const totalRecords = deals.length + data.leads.length;
  const converted = deals.filter((d) => isClosed(d) || isPending(d)).length;
  const conversion = totalRecords ? Math.round((converted / totalRecords) * 100) : 0;

  const agentGci: Record<string, number> = {};
  for (const d of closed) {
    const agent = d.agent || "Unassigned";
    agentGci[agent] = (agentGci[agent] ?? 0) + (dealGci(d) ?? 0);
  }
  const agentData = Object.entries(agentGci)
    .map(([agent, gci]) => ({ agent, gci }))
    .sort((a, b) => b.gci - a.gci);

  const sourceCounts: Record<string, number> = {};
  for (const d of deals) if (d.source) sourceCounts[d.source] = (sourceCounts[d.source] ?? 0) + 1;
  const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));

  const unitPct = targets.annual ? Math.round((stats.unitsClosed / targets.annual) * 100) : 0;

  const brokerage = data.settings.brokerage ?? DEFAULT_BROKERAGE;
  // Cap math needs every deal (cap years can span calendar years, and other
  // agents' closings count toward the team cap) — filter for display after.
  const wfAll = gciWaterfall(data.deals, brokerage, year);
  const visibleClosedIds = new Set(closed.map((d) => d.id));
  const wfRows = wfAll.rows.filter((r) => visibleClosedIds.has(r.id));
  const wfSum = (f: (r: (typeof wfRows)[number]) => number) =>
    Math.round(wfRows.reduce((s, r) => s + f(r), 0) * 100) / 100;
  const waterfall = {
    ...wfAll,
    rows: wfRows,
    totals: {
      gross: wfSum((r) => r.gross),
      referralOut: wfSum((r) => r.referralOut),
      netGci: wfSum((r) => r.netGci),
      brokerSplit: wfSum((r) => r.brokerSplit),
      fees: wfSum((r) => r.fees),
      teamNet: wfSum((r) => r.teamNet),
    },
  };
  const hasFees = (brokerage.fees ?? []).length > 0 || waterfall.totals.fees > 0;

  return (
    <>
      <Topbar
        title="Reports"
        subtitle={`${range.label}${agentF ? ` · ${agentF}` : ""} — production, conversion, and pipeline.`}
      />

      <ReportFilters agents={allAgents} />

      {/* PDF downloads — respect the filters above */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {PDF_REPORTS.map((r) => (
          <a
            key={r.type}
            href={`/api/report?type=${r.type}${filterQuery}`}
            className="card card-hover group flex items-start gap-3 p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-elevate-100 text-elevate-700 transition group-hover:bg-elevate-500 group-hover:text-white">
              <FileDown size={17} />
            </span>
            <span>
              <span className="block text-sm font-semibold">{r.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-faint">{r.desc}</span>
              <span className="mt-1.5 block text-[11px] font-semibold text-elevate-600">Download PDF →</span>
            </span>
          </a>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Closed volume YTD" value={fmtMoney(stats.volume.closed, true)} icon={TrendingUp} tint="cyan" />
        <StatCard label="GCI YTD" value={fmtMoney(stats.gci.closed, true)} icon={DollarSign} tint="green" />
        <StatCard
          label="Conversion"
          value={`${conversion}%`}
          sub={`${converted} of ${totalRecords} records in contract/closed`}
          icon={Percent}
          tint="amber"
        />
        <StatCard
          label="Pipeline value"
          value={fmtMoney(stats.pipelineVolume, true)}
          sub={`${fmtMoney(stats.pipelineGci, true)} projected GCI`}
          icon={Layers}
          tint="slate"
        />
      </div>

      <Section title="Goal progress" className="mb-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-ink-muted">Units</span>
              <span className="font-semibold">{stats.unitsClosed} / {targets.annual}</span>
            </div>
            <Progress pct={unitPct} />
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-ink-muted">Closed volume</span>
              <span className="font-semibold">{fmtMoney(stats.volume.closed, true)}</span>
            </div>
            <Progress
              pct={
                stats.volume.closed + stats.volume.pending
                  ? (stats.volume.closed / (stats.volume.closed + stats.volume.pending)) * 100
                  : 0
              }
              color="#34d399"
            />
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-ink-muted">Closed GCI</span>
              <span className="font-semibold">{fmtMoney(stats.gci.closed, true)}</span>
            </div>
            <Progress
              pct={
                stats.gci.closed + stats.gci.pending
                  ? (stats.gci.closed / (stats.gci.closed + stats.gci.pending)) * 100
                  : 0
              }
              color="#fbbf24"
            />
          </div>
        </div>
      </Section>

      {/* GCI waterfall */}
      <Section title="GCI breakdown — where the commission actually goes" className="mb-6">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {[
            { label: "Gross commission", value: waterfall.totals.gross, color: "text-ink" },
            { label: "Referral fees out", value: -waterfall.totals.referralOut, color: "text-rose-600" },
            { label: "Net GCI", value: waterfall.totals.netGci, color: "text-elevate-700" },
            { label: `Brokerage split (${brokerage.splitPct}%)`, value: -waterfall.totals.brokerSplit, color: "text-rose-600" },
            ...(hasFees
              ? [{ label: "Transaction fees", value: -waterfall.totals.fees, color: "text-rose-600" }]
              : []),
            { label: "Team net", value: waterfall.totals.teamNet, color: "text-emerald-700" },
          ].map((step, i, arr) => (
            <span key={step.label} className="flex items-center gap-2">
              <span className="rounded-xl border border-mist bg-white px-3.5 py-2.5 text-center">
                <span className="block text-[11px] text-ink-faint">{step.label}</span>
                <span className={cn("font-display text-lg font-bold", step.color)}>
                  {fmtMoney(Math.abs(step.value), true)}
                </span>
              </span>
              {i < arr.length - 1 && <ArrowRight size={15} className="text-ink-faint" />}
            </span>
          ))}
          {waterfall.capReached && (
            <span className="chip bg-emerald-100 text-emerald-800">
              🎉 Cap hit — {fmtMoney(brokerage.annualCap)} paid this cap year (resets {waterfall.capResetLabel})
            </span>
          )}
          {!waterfall.capReached && brokerage.annualCap > 0 && (
            <span className="chip bg-mist text-ink-muted">
              {fmtMoney(waterfall.brokerPaid)} of {fmtMoney(brokerage.annualCap)} cap paid · resets {waterfall.capResetLabel}
            </span>
          )}
        </div>
        {waterfall.rows.length > 0 ? (
          <Table
            headers={
              hasFees
                ? ["Closed deal", "Date", "Gross", "Referral out", "Net GCI", "Split", "Fees", "Team net"]
                : ["Closed deal", "Date", "Gross", "Referral out", "Net GCI", "Split", "Team net"]
            }
          >
            {waterfall.rows.map((r) => (
              <tr key={r.id} className="hover:bg-chalk/60">
                <Td className="font-semibold">{r.name}</Td>
                <Td>{fmtDate(r.closedDate)}</Td>
                <Td>{fmtMoney(r.gross)}</Td>
                <Td className={r.referralOut ? "text-rose-600" : "text-ink-faint"}>
                  {r.referralOut ? `−${fmtMoney(r.referralOut)}` : "—"}
                </Td>
                <Td>{fmtMoney(r.netGci)}</Td>
                <Td className={r.brokerSplit ? "text-rose-600" : "text-ink-faint"}>
                  {r.brokerSplit ? `−${fmtMoney(r.brokerSplit)}` : "—"}
                </Td>
                {hasFees && (
                  <Td className={r.fees ? "text-rose-600" : "text-ink-faint"}>
                    {r.fees ? `−${fmtMoney(r.fees)}` : "—"}
                  </Td>
                )}
                <Td className="font-bold text-emerald-700">{fmtMoney(r.teamNet)}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="py-6 text-center text-sm text-ink-faint">No closed deals yet this year.</p>
        )}
        <p className="mt-3 text-xs text-ink-faint">
          Split % and cap are set in Settings. Deals missing a closed date are excluded from monthly charts but included here.
        </p>
      </Section>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Section title="Monthly volume (closed)">
          <MoneyBars data={activeMonths} dataKey="volume" name="Volume" />
        </Section>
        <Section title="Monthly GCI (closed)">
          <MoneyBars data={activeMonths} dataKey="gci" name="GCI" color="#34d399" />
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Quarterly units vs target">
          <QuarterChart data={stats.quarters} />
        </Section>
        <Section title="Agent production (closed GCI)">
          <AgentBars data={agentData.length ? agentData : [{ agent: "—", gci: 0 }]} />
        </Section>
        <Section title="Business by source">
          <SourcePie data={sourceData} />
        </Section>
      </div>
    </>
  );
}
