import Topbar from "@/components/topbar";
import PipelineGrid from "@/components/pipeline-grid";
import { getAppData } from "@/lib/derive";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const data = await getAppData();
  const agents = data.team.filter((m) => m.active).map((m) => m.name);

  return (
    <>
      <Topbar
        title="Pipeline"
        subtitle="Everyone at a glance — every step, every checkbox, one screen."
      />
      <PipelineGrid
        deals={data.deals}
        leads={data.leads}
        tasks={data.tasks}
        agents={agents}
        templates={data.settings.templates}
        checklists={data.settings.checklists}
      />
    </>
  );
}
