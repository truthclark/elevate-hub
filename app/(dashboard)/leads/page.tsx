import Topbar from "@/components/topbar";
import { Section, StatCard, LoftyLink } from "@/components/ui";
import { LeadModal, AddButton } from "@/components/forms";
import LeadsTable from "@/components/leads-table";
import { SourcePie } from "@/components/charts";
import { getAppData } from "@/lib/derive";
import { Sparkles, Flame, PhoneCall, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const data = await getAppData();
  const agents = data.team.filter((m) => m.active).map((m) => m.name);
  const leads = data.leads;
  const hot = leads.filter((l) => l.followUpStatus.toLowerCase().includes("hot"));
  const needsCall = leads.filter(
    (l) => !l.lastContact || l.followUpStatus.toLowerCase().includes("new")
  );

  const sourceCounts: Record<string, number> = {};
  for (const l of leads) if (l.source) sourceCounts[l.source] = (sourceCounts[l.source] ?? 0) + 1;
  const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));

  return (
    <>
      <Topbar
        title="Leads"
        subtitle="Every opportunity, from first touch to converted."
        action={
          <div className="flex items-center gap-2">
            <LoftyLink />
            <LeadModal agents={agents} trigger={<AddButton label="New lead" />} />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total leads" value={String(leads.length)} icon={Sparkles} tint="cyan" />
        <StatCard label="Hot" value={String(hot.length)} icon={Flame} tint="amber" />
        <StatCard label="Needs first call" value={String(needsCall.length)} icon={PhoneCall} tint="slate" />
        <StatCard
          label="Buyer leads"
          value={String(leads.filter((l) => l.type.toLowerCase() === "buyer").length)}
          icon={Users}
          tint="green"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="All leads" className="lg:col-span-2">
          <LeadsTable leads={leads} agents={agents} />
        </Section>

        <Section title="Lead sources">
          <SourcePie data={sourceData} />
        </Section>
      </div>
    </>
  );
}
