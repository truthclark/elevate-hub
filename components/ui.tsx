import { cn } from "@/lib/utils";
import { LucideIcon, ExternalLink } from "lucide-react";
import CountUp from "./count-up";

// Tiny inline trend line for stat cards (last N periods)
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2 || data.every((v) => v === 0)) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 72;
  const h = 22;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / range) * (h - 4)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="#05c3f9"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Lofty link (opens the CRM in a new tab) ──────────────────────
export function LoftyLink() {
  return (
    <a
      href="https://app.lofty.com"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-xl border border-mist bg-white px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-elevate-300 hover:text-elevate-700"
    >
      <ExternalLink size={14} /> Open Lofty
    </a>
  );
}

// ── Stat card ────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tint = "cyan",
  spark,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tint?: "cyan" | "green" | "amber" | "slate";
  spark?: number[]; // optional trend line (e.g. monthly values)
}) {
  const iconBg = {
    cyan: "bg-elevate-100 text-elevate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-mist text-ink-muted",
  }[tint];

  return (
    <div className={cn("card card-hover p-5", `stat-tint-${tint}`)}>
      <div className="mb-4 flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            iconBg
          )}
        >
          <Icon size={19} />
        </div>
        {spark && <Sparkline data={spark} />}
      </div>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight">
        <CountUp text={value} />
      </p>
      {sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  closed: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  option: "bg-orange-100 text-orange-800",
  "under contract": "bg-amber-100 text-amber-800",
  active: "bg-elevate-100 text-elevate-800",
  "on market": "bg-elevate-100 text-elevate-800",
  showing: "bg-sky-100 text-sky-800",
  shopping: "bg-sky-100 text-sky-800",
  accepted: "bg-emerald-100 text-emerald-800",
  hot: "bg-rose-100 text-rose-700",
  warm: "bg-amber-100 text-amber-800",
  nurture: "bg-mist text-ink-muted",
  new: "bg-violet-100 text-violet-700",
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-mist text-ink-muted",
  done: "bg-emerald-100 text-emerald-800",
  open: "bg-elevate-100 text-elevate-800",
  referred: "bg-violet-100 text-violet-700",
};

// Type/side badge — Buyer blue, Seller/Listing green, Referral purple
const TYPE_STYLES: Record<string, string> = {
  buyer: "bg-blue-100 text-blue-800",
  listing: "bg-emerald-100 text-emerald-800",
  seller: "bg-emerald-100 text-emerald-800",
  referral: "bg-violet-100 text-violet-700",
  investor: "bg-amber-100 text-amber-800",
  va: "bg-cyan-100 text-cyan-800",
};

export function TypeBadge({ value }: { value: string }) {
  if (!value) return <span className="text-ink-faint">—</span>;
  const style = TYPE_STYLES[value.toLowerCase()] ?? "bg-mist text-ink-muted";
  return <span className={cn("chip", style)}>{value}</span>;
}

export function StatusBadge({ value }: { value: string }) {
  if (!value) return <span className="text-ink-faint">—</span>;
  const key = Object.keys(STATUS_STYLES).find((k) =>
    value.toLowerCase().includes(k)
  );
  return (
    <span className={cn("chip", key ? STATUS_STYLES[key] : "bg-mist text-ink-muted")}>
      {value}
    </span>
  );
}

// ── Section card wrapper ─────────────────────────────────────────
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Data table ───────────────────────────────────────────────────
export function Table({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="thin-scroll overflow-x-auto">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-mist text-left text-[11px] uppercase tracking-wider text-ink-faint">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-mist/70">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-3 align-middle", className)}>{children}</td>;
}

// ── Progress bar ─────────────────────────────────────────────────
export function Progress({
  pct,
  color = "#05c3f9",
}: {
  pct: number;
  color?: string;
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-mist">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
      />
    </div>
  );
}

// ── Avatar dot ───────────────────────────────────────────────────
export function Avatar({
  initials,
  color,
  size = 36,
  photo,
}: {
  initials: string;
  color: string;
  size?: number;
  photo?: string;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={initials}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full font-display font-bold text-white"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.36,
      }}
    >
      {initials}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-mist py-9 text-center">
      {/* little skyline illustration in brand tones */}
      <svg width="110" height="52" viewBox="0 0 110 52" fill="none" aria-hidden className="mb-3 opacity-80">
        {/* sun */}
        <circle cx="88" cy="12" r="7" fill="#05c3f9" opacity="0.25" />
        <circle cx="88" cy="12" r="4" fill="#05c3f9" opacity="0.5" />
        {/* back buildings */}
        <rect x="8" y="22" width="14" height="30" rx="2" fill="rgb(var(--mist))" />
        <rect x="62" y="18" width="16" height="34" rx="2" fill="rgb(var(--mist))" />
        {/* house */}
        <path d="M28 30 L44 17 L60 30" stroke="#05c3f9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="32" y="30" width="24" height="22" rx="2" fill="#05c3f9" opacity="0.14" />
        <rect x="32" y="30" width="24" height="22" rx="2" stroke="#05c3f9" strokeWidth="2" fill="none" />
        <rect x="40.5" y="38" width="7" height="14" rx="1.5" fill="#05c3f9" opacity="0.55" />
        {/* ground */}
        <line x1="2" y1="52" x2="108" y2="52" stroke="rgb(var(--ink-faint))" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
      </svg>
      <p className="max-w-xs text-sm text-ink-faint">{message}</p>
    </div>
  );
}
