import { auth, signOut, authConfigured } from "@/auth";
import { getAppData, buildAlerts } from "@/lib/derive";
import AlertsBell from "./alerts-bell";
import { SearchTrigger } from "./command-palette";
import ThemeToggle from "./theme-toggle";
import Link from "next/link";
import { LogOut, Link2 } from "lucide-react";

export default async function Topbar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const session = authConfigured ? await auth() : null;
  const name = session?.user?.name?.split(" ")[0] ?? "Team";
  const data = await getAppData();
  const alerts = buildAlerts(data.deals, data.tasks);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-faint">
          {today}
        </p>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 hidden text-sm text-ink-muted sm:block">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {data.demoMode && (
          <span className="chip hidden bg-amber-100 text-amber-800 sm:inline-flex">
            Demo mode — data resets on restart
          </span>
        )}
        {action}
        <SearchTrigger />
        {/* Secondary controls hide on phones — everything is still reachable */}
        <Link
          href="/links"
          title="Quick links"
          className="hidden rounded-lg border border-mist bg-white p-2 text-ink-muted transition hover:text-ink sm:block"
        >
          <Link2 size={15} />
        </Link>
        <ThemeToggle />
        <AlertsBell alerts={alerts} />
        <span className="hidden text-sm text-ink-muted lg:block">
          Hey, <span className="font-semibold text-ink">{name}</span>
        </span>
        {session?.user && (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              className="hidden items-center gap-1.5 rounded-lg border border-mist bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink sm:flex"
              type="submit"
            >
              <LogOut size={13} /> Sign out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
