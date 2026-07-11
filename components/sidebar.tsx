"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Table2,
  FileSignature,
  Sparkles,
  CheckSquare,
  CalendarDays,
  Gauge,
  Megaphone,
  BookOpen,
  Wallet,
  UsersRound,
  BarChart3,
  Settings,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_GROUPS: {
  title: string;
  items: { href: string; label: string; icon: LucideIcon }[];
}[] = [
  {
    title: "",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pipeline", label: "Pipeline", icon: Table2 },
      { href: "/deals", label: "Deals", icon: FileSignature },
      { href: "/leads", label: "Leads", icon: Sparkles },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Run the business",
    items: [
      { href: "/funnels", label: "Funnels", icon: Megaphone },
      { href: "/scorecard", label: "Scorecard", icon: Gauge },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/money", label: "Money", icon: Wallet },
      { href: "/sops", label: "SOPs", icon: BookOpen },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/team", label: "Team", icon: UsersRound },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Old routes redirect into /deals; highlight Deals when they're active.
const DEAL_PATHS = ["/deals", "/clients", "/transactions", "/listings"];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.title || "main"} className="flex flex-col gap-1">
          {group.title && (
            <p className="px-3.5 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              {group.title}
            </p>
          )}
          {group.items.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : href === "/deals"
                  ? DEAL_PATHS.some((p) => pathname.startsWith(p))
                  : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-elevate-500 text-ink shadow-[0_4px_14px_rgba(5,195,249,0.35)]"
                    : "text-ink-muted hover:bg-mist hover:text-ink"
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    active ? "text-ink" : "text-ink-faint group-hover:text-ink"
                  )}
                />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand({
  logoUrl,
  appName,
  brokerageName,
}: {
  logoUrl?: string | null;
  appName: string;
  brokerageName: string;
}) {
  return (
    <Link href="/" className="flex items-center gap-3 px-2">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={`${appName} logo`}
          className="h-10 w-10 rounded-xl object-contain"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink font-display text-lg font-bold text-elevate-400">
          {appName.charAt(0)}
        </div>
      )}
      <div className="leading-tight">
        <p className="font-display text-sm font-bold">{appName}</p>
        <p className="text-[11px] text-ink-faint">{brokerageName}</p>
      </div>
    </Link>
  );
}

export default function Sidebar({
  logoUrl,
  appName = "Elevate Hub",
  brokerageName = "Real Broker LLC",
  tagline = "Higher purpose. Higher standards.",
}: {
  logoUrl?: string | null;
  appName?: string;
  brokerageName?: string;
  tagline?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-8 border-r border-mist bg-white p-4 lg:flex">
        <Brand logoUrl={logoUrl} appName={appName} brokerageName={brokerageName} />
        <NavLinks />
        <div className="mt-auto rounded-2xl bg-gradient-to-br from-elevate-50 to-white border border-elevate-100 p-4">
          <p className="font-display text-xs font-semibold text-ink">{tagline}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
            Add deals from your phone, check off SOPs, and download a full
            backup anytime in Settings.
          </p>
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-mist bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand logoUrl={logoUrl} appName={appName} brokerageName={brokerageName} />
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-ink hover:bg-mist"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white p-4 pt-6 shadow-2xl">
            <Brand logoUrl={logoUrl} appName={appName} brokerageName={brokerageName} />
            <div className="mt-8">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
