import Topbar from "@/components/topbar";
import { Section, StatCard, Table, Td, EmptyState } from "@/components/ui";
import { PnlChart } from "@/components/charts";
import { AddEntryButton, EntryRow, AutoIncomeRow } from "@/components/pnl-ui";
import { getAppData, monthlyTeamNet } from "@/lib/derive";
import { materializeRecurringPnl } from "@/app/actions";
import { store } from "@/lib/store";
import { fmtMoney, cn } from "@/lib/utils";
import { DEFAULT_BROKERAGE } from "@/lib/types";
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";

export const dynamic = "force-dynamic";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function MoneyPage() {
  // Recurring entries fill in any months that have arrived since last visit
  await materializeRecurringPnl();
  const [data, pnl] = await Promise.all([getAppData(), store.listPnl()]);
  const year = data.settings.year;
  const brokerage = data.settings.brokerage ?? DEFAULT_BROKERAGE;
  const deals = data.deals.filter((d) => d.year === year);
  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthCount = year === now.getFullYear() ? now.getMonth() + 1 : 12;

  // Build the monthly ledger
  const months = Array.from({ length: monthCount }, (_, i) => {
    const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
    const entries = pnl.filter((e) => e.month === ym);
    // Pass ALL deals: the brokerage cap year can span calendar years
    const gciIncome = monthlyTeamNet(data.deals, brokerage, ym);
    const otherIncome = entries.filter((e) => e.kind === "Income").reduce((s, e) => s + e.amount, 0);
    const expenses = entries.filter((e) => e.kind === "Expense").reduce((s, e) => s + e.amount, 0);
    return {
      ym,
      month: MONTH_NAMES[i],
      gciIncome,
      otherIncome,
      income: gciIncome + otherIncome,
      expenses,
      net: gciIncome + otherIncome - expenses,
      entries,
    };
  });

  const ytd = {
    income: months.reduce((s, m) => s + m.income, 0),
    gci: months.reduce((s, m) => s + m.gciIncome, 0),
    expenses: months.reduce((s, m) => s + m.expenses, 0),
  };
  const thisMonth = months.find((m) => m.ym === currentYm) ?? months[months.length - 1];

  return (
    <>
      <Topbar
        title="Money"
        subtitle={`Quick P&L for ${year} — commission income flows in automatically; log everything else.`}
        action={<AddEntryButton defaultMonth={currentYm} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Income YTD" value={fmtMoney(ytd.income, true)} sub={`${fmtMoney(ytd.gci, true)} from commissions`} icon={TrendingUp} tint="green" />
        <StatCard label="Expenses YTD" value={fmtMoney(ytd.expenses, true)} icon={TrendingDown} tint="amber" />
        <StatCard
          label="Net YTD"
          value={fmtMoney(ytd.income - ytd.expenses, true)}
          icon={PiggyBank}
          tint={ytd.income - ytd.expenses >= 0 ? "cyan" : "slate"}
        />
        <StatCard
          label={`Net — ${thisMonth?.month ?? ""}`}
          value={fmtMoney(thisMonth?.net ?? 0, true)}
          sub={`${fmtMoney(thisMonth?.income ?? 0, true)} in · ${fmtMoney(thisMonth?.expenses ?? 0, true)} out`}
          icon={Wallet}
          tint="slate"
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Section title="Income vs expenses" className="lg:col-span-2">
          <PnlChart data={months.map(({ month, income, expenses }) => ({ month, income, expenses }))} />
        </Section>

        <Section title={`${thisMonth?.month} entries`}>
          <ul className="space-y-2">
            {thisMonth && thisMonth.gciIncome > 0 && (
              <AutoIncomeRow label="Commission income" amount={thisMonth.gciIncome} />
            )}
            {thisMonth?.entries.map((e) => <EntryRow key={e.id} e={e} />)}
            {thisMonth && thisMonth.entries.length === 0 && thisMonth.gciIncome === 0 && (
              <EmptyState message="Nothing logged this month yet." />
            )}
          </ul>
        </Section>
      </div>

      <Section title={`${year} ledger`}>
        <Table headers={["Month", "Commission income", "Other income", "Expenses", "Net"]}>
          {months.map((m) => (
            <tr key={m.ym} className={cn("hover:bg-chalk/60", m.ym === currentYm && "bg-elevate-50/40")}>
              <Td className="font-semibold">{m.month}</Td>
              <Td className="text-emerald-700">{m.gciIncome ? fmtMoney(m.gciIncome) : "—"}</Td>
              <Td className="text-emerald-700">{m.otherIncome ? fmtMoney(m.otherIncome) : "—"}</Td>
              <Td className="text-rose-600">{m.expenses ? fmtMoney(m.expenses) : "—"}</Td>
              <Td className={cn("font-bold", m.net >= 0 ? "text-ink" : "text-rose-600")}>
                {fmtMoney(m.net)}
              </Td>
            </tr>
          ))}
          <tr className="border-t-2 border-mist bg-chalk/60">
            <Td className="font-display font-bold">YTD</Td>
            <Td className="font-bold text-emerald-700">{fmtMoney(ytd.gci)}</Td>
            <Td className="font-bold text-emerald-700">{fmtMoney(ytd.income - ytd.gci)}</Td>
            <Td className="font-bold text-rose-600">{fmtMoney(ytd.expenses)}</Td>
            <Td className="font-display font-bold">{fmtMoney(ytd.income - ytd.expenses)}</Td>
          </tr>
        </Table>
        <p className="mt-3 text-xs text-ink-faint">
          Commission income = team net after referral fees and the {brokerage.splitPct}% brokerage split
          (capped at {fmtMoney(brokerage.annualCap)}/yr — adjust in Settings). This is a management view, not your books.
        </p>
      </Section>
    </>
  );
}
