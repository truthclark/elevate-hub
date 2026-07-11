import Sidebar from "@/components/sidebar";
import Assistant from "@/components/assistant";
import CommandPalette, { SearchItem } from "@/components/command-palette";
import { store } from "@/lib/store";
import { brandOf, DEFAULT_BRAND, type Brand } from "@/lib/brand";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let logoUrl: string | null = null;
  let brand: Brand = DEFAULT_BRAND;
  const searchItems: SearchItem[] = [
    { type: "Page", label: "Dashboard", href: "/" },
    { type: "Page", label: "Pipeline", href: "/pipeline" },
    { type: "Page", label: "Deals", href: "/deals" },
    { type: "Page", label: "Leads", href: "/leads" },
    { type: "Page", label: "Tasks", href: "/tasks" },
    { type: "Page", label: "Calendar", href: "/calendar" },
    { type: "Page", label: "Funnels", href: "/funnels" },
    { type: "Page", label: "Scorecard", href: "/scorecard" },
    { type: "Page", label: "Reports", href: "/reports" },
    { type: "Page", label: "Money", href: "/money" },
    { type: "Page", label: "SOPs", href: "/sops" },
    { type: "Page", label: "Team", href: "/team" },
    { type: "Page", label: "Settings", href: "/settings" },
    { type: "Page", label: "Links", href: "/links" },
    { type: "Page", label: "Archive", href: "/archive" },
  ];
  try {
    const settings = await store.getSettings();
    if (settings.branding?.logo) logoUrl = "/api/logo";
    brand = brandOf(settings);
    const [deals, leads, tasks, sops] = await Promise.all([
      store.listDeals(),
      store.listLeads(),
      store.listTasks(),
      store.listSops(),
    ]);
    for (const d of deals) {
      if (d.archived) continue;
      searchItems.push({
        type: "Deal",
        label: d.name || d.address,
        sub: [d.side, d.address && d.name ? d.address : "", d.status].filter(Boolean).join(" · "),
        href: `/deals/${d.id}`,
      });
    }
    for (const l of leads) {
      if (l.archived) continue;
      searchItems.push({
        type: "Lead",
        label: l.name,
        sub: [l.type, l.phone, l.followUpStatus].filter(Boolean).join(" · "),
        href: "/leads",
      });
    }
    for (const t of tasks) {
      if (t.status.toLowerCase() === "done") continue;
      searchItems.push({
        type: "Task",
        label: t.task,
        sub: [t.assignedTo, t.relatedClient].filter(Boolean).join(" · "),
        href: t.dealId != null ? `/deals/${t.dealId}` : "/tasks",
      });
    }
    for (const sop of sops) {
      searchItems.push({ type: "SOP", label: sop.title, sub: sop.category, href: "/sops" });
    }
  } catch {
    logoUrl = null;
  }
  return (
    <div className="min-h-screen">
      <Sidebar
        logoUrl={logoUrl}
        appName={brand.appName}
        brokerageName={brand.brokerageName}
        tagline={brand.tagline}
      />
      <main className="px-4 py-6 sm:px-6 lg:ml-60 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
      <CommandPalette items={searchItems} />
      <Assistant />
    </div>
  );
}
