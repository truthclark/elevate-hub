import { parseDateSafe } from "./utils";

// Shared time-period filter for the Reports page and PDF downloads.
// Records without a date stay visible in the wide views (YTD / All time)
// and drop out of narrow ones, so nothing silently disappears year-round.

export interface ReportRange {
  from: Date | null;
  to: Date | null;
  label: string;
  wide: boolean; // includes records that have no date yet
}

export const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "ytd", label: "Year to date" },
  { value: "q1", label: "Q1" },
  { value: "q2", label: "Q2" },
  { value: "q3", label: "Q3" },
  { value: "q4", label: "Q4" },
  { value: "month", label: "This month" },
  { value: "lastmonth", label: "Last month" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export function resolveRange(period: string | undefined, year: number): ReportRange {
  const now = new Date();
  const p = (period || "ytd").toLowerCase();
  const q = (n: number): ReportRange => ({
    from: new Date(year, (n - 1) * 3, 1),
    to: new Date(year, n * 3, 0, 23, 59, 59),
    label: `Q${n} ${year}`,
    wide: false,
  });
  switch (p) {
    case "q1": return q(1);
    case "q2": return q(2);
    case "q3": return q(3);
    case "q4": return q(4);
    case "month":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: now,
        label: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        wide: false,
      };
    case "lastmonth": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        from,
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
        label: from.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        wide: false,
      };
    }
    case "last30": {
      const from = new Date(now); from.setDate(from.getDate() - 30);
      return { from, to: now, label: "Last 30 days", wide: false };
    }
    case "last90": {
      const from = new Date(now); from.setDate(from.getDate() - 90);
      return { from, to: now, label: "Last 90 days", wide: false };
    }
    case "all":
      return { from: null, to: null, label: "All time", wide: true };
    default:
      return { from: new Date(year, 0, 1), to: now, label: `${year} YTD`, wide: true };
  }
}

export function inRange(dateStr: string | undefined, r: ReportRange): boolean {
  const d = dateStr ? parseDateSafe(dateStr) : null;
  if (!d) return r.wide; // undated records only show in wide views
  if (r.from && d < r.from) return false;
  if (r.to && d > r.to) return false;
  return true;
}
