import Topbar from "@/components/topbar";
import { Section, StatCard } from "@/components/ui";
import { ScorecardGrid, MeasurablesEditor, ScoreRow } from "@/components/scorecard-ui";
import { getAppData } from "@/lib/derive";
import { store } from "@/lib/store";
import { lastWeeks, lastMonths, autoValues, ensureProspectingRows } from "@/lib/scorecard";
import { DEFAULT_MEASURABLES, Measurable } from "@/lib/types";
import { currentRole } from "@/auth";
import { Target, TrendingUp, TrendingDown, CalendarRange } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ScorecardPage() {
  const data = await getAppData();
  const activities = await store.listActivities();
  const role = await currentRole();
  const weeks = lastWeeks(13);
  const months = lastMonths(6);
  const currentWeek = weeks[weeks.length - 1];
  const currentMonth = months[months.length - 1];
  const scores = data.settings.scores ?? {};
  const agents = data.team.filter((m) => m.active).map((m) => m.name);

  // Core prospecting rows are always present — they feed straight from the
  // activity log (+/- tally on the Tasks page) and can't be deleted.
  const measurables = ensureProspectingRows(
    data.settings.measurables ?? DEFAULT_MEASURABLES,
    DEFAULT_MEASURABLES
  );

  const buildRow = (m: Measurable, keys: string[], period: "week" | "month"): ScoreRow => {
    const values: Record<string, number | undefined> = {};
    const currentKey = period === "week" ? currentWeek : currentMonth;
    if (m.auto) {
      const auto = autoValues(m.auto, keys, data.deals, data.leads, activities, period);
      for (const k of keys) values[k] = auto[k];
      // dealsPending is a live snapshot — only meaningful this period
      if (m.auto === "dealsPending") {
        for (const k of keys) if (k !== currentKey) values[k] = scores[m.id]?.[k];
      }
    } else {
      for (const k of keys) values[k] = scores[m.id]?.[k];
    }
    return { m, values };
  };

  const weeklyRows: ScoreRow[] = measurables
    .filter((m) => (m.period ?? "week") === "week")
    .map((m) => buildRow(m, weeks, "week"));
  const monthlyRows: ScoreRow[] = measurables
    .filter((m) => m.period === "month")
    .map((m) => buildRow(m, months, "month"));

  const onTrackOf = (rows: ScoreRow[], key: string) => {
    const scored = rows.filter((r) => r.values[key] != null);
    return {
      scored,
      hit: scored.filter((r) => {
        const v = r.values[key]!;
        return r.m.direction === "<=" ? v <= r.m.target : v >= r.m.target;
      }),
    };
  };
  const thisWeek = onTrackOf(weeklyRows, currentWeek);
  const lastWeekKey = weeks[weeks.length - 2];
  const lastWeekStats = onTrackOf(weeklyRows, lastWeekKey);
  const thisMonth = onTrackOf(monthlyRows, currentMonth);

  return (
    <>
      <Topbar
        title="Scorecard"
        subtitle="Leading numbers, EOS style — weekly activity, monthly outcomes."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          label="On track this week"
          value={`${thisWeek.hit.length} / ${weeklyRows.length}`}
          sub={
            thisWeek.scored.length < weeklyRows.length
              ? `${weeklyRows.length - thisWeek.scored.length} not entered yet`
              : "all entered"
          }
          icon={Target}
          tint="cyan"
        />
        <StatCard
          label="Last week"
          value={`${lastWeekStats.hit.length} / ${weeklyRows.length}`}
          sub={lastWeekStats.hit.length >= thisWeek.hit.length ? "hold the standard" : "trending up"}
          icon={lastWeekStats.hit.length > thisWeek.hit.length ? TrendingDown : TrendingUp}
          tint={lastWeekStats.hit.length > thisWeek.hit.length ? "amber" : "green"}
        />
        <StatCard
          label="Monthly goals on track"
          value={monthlyRows.length ? `${thisMonth.hit.length} / ${monthlyRows.length}` : "—"}
          sub={monthlyRows.length ? "this month so far" : "none set"}
          icon={CalendarRange}
          tint="slate"
        />
      </div>

      <Section title="Weekly measurables — last 13 weeks" className="mb-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <p className="text-xs text-ink-faint">
            Prospecting rows fill themselves from the activity log (use the +/− tally on the
            Tasks page). Click any cell in a manual row to enter a number. Green = target hit.
          </p>
          {role === "Admin" && <MeasurablesEditor measurables={measurables} agents={agents} />}
        </div>
        <ScorecardGrid rows={weeklyRows} cols={weeks} mode="week" />
      </Section>

      <Section title="Monthly goals — last 6 months">
        <p className="mb-3 text-xs text-ink-faint">
          Outcome goals judged per month (e.g. 4 closings a month). Set a measurable to
          &ldquo;per month&rdquo; in Edit measurables to move it here.
        </p>
        <ScorecardGrid rows={monthlyRows} cols={months} mode="month" />
      </Section>

      <p className="mt-4 text-xs text-ink-faint">
        Review this page together every week; a number that is red two weeks straight becomes
        an issue to solve at your L10.
      </p>
    </>
  );
}
