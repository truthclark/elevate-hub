"use client";

// App-style bottom tab bar on phones. Five thumb-reachable destinations;
// Menu opens the full drawer for everything else.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Table2, FileSignature, CheckSquare, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Table2 },
  { href: "/deals", label: "Deals", icon: FileSignature },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
] as const;

const DEAL_PATHS = ["/deals", "/clients", "/transactions", "/listings"];

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : href === "/deals"
        ? DEAL_PATHS.some((p) => pathname.startsWith(p))
        : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-mist bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition",
                active ? "text-elevate-600" : "text-ink-faint"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {label}
              <span
                className={cn(
                  "mt-0.5 h-1 w-1 rounded-full transition",
                  active ? "bg-elevate-500" : "bg-transparent"
                )}
              />
            </Link>
          );
        })}
        <button
          onClick={() => window.dispatchEvent(new Event("open-drawer"))}
          className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-ink-faint transition"
        >
          <Menu size={20} />
          Menu
          <span className="mt-0.5 h-1 w-1 rounded-full bg-transparent" />
        </button>
      </div>
    </nav>
  );
}
