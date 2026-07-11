import Topbar from "@/components/topbar";
import { FunnelList } from "@/components/funnels-ui";
import { EmptyState } from "@/components/ui";
import { store } from "@/lib/store";
import { currentRole } from "@/auth";

export const dynamic = "force-dynamic";

export default async function FunnelsPage() {
  const funnels = await store.listFunnels();
  const role = await currentRole();
  const isAdmin = role === "Admin";

  return (
    <>
      <Topbar
        title="Funnels"
        subtitle="Public landing pages that turn free resources into leads — no Jotform, no GoHighLevel."
      />
      <FunnelList funnels={funnels} isAdmin={isAdmin} />
      {funnels.length === 0 && !isAdmin && (
        <EmptyState message="No funnels yet — an admin can create the first one." />
      )}
      <p className="mt-6 text-xs text-ink-faint">
        Every submission creates a Lead here (source = funnel name), pings Lofty through
        Zapier if a ZAPIER_LEAD_HOOK_URL is set, and emails the freebie automatically.
        Share the link anywhere: bio, QR codes, ads, sign riders.
      </p>
    </>
  );
}
