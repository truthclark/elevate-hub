export function fmtMoney(n: number | null | undefined, compact = false): string {
  if (n == null || isNaN(n)) return "—";
  if (compact) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  }
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function parseNumber(val: unknown): number | null {
  if (val == null || val === "" || val === "—") return null;
  const n = parseFloat(String(val).replace(/[$,%\s]/g, ""));
  return isNaN(n) ? null : n;
}

export function parseDateSafe(val: string): Date | null {
  if (!val || val === "select date") return null;
  // ISO (from date pickers): parse as LOCAL date, not UTC, to avoid off-by-one
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// Convert any stored date string to YYYY-MM-DD for <input type="date">
export function toInputDate(val: string): string {
  const d = parseDateSafe(val);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysUntil(dateStr: string): number | null {
  const d = parseDateSafe(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function fmtDate(val: string): string {
  const d = parseDateSafe(val);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? ""))
    .toUpperCase();
}
