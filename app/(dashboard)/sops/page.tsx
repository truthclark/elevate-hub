import Topbar from "@/components/topbar";
import { SopLibrary } from "@/components/sop-ui";
import { store } from "@/lib/store";
import { currentRole } from "@/auth";

export const dynamic = "force-dynamic";

export default async function SopsPage() {
  const [sops, role] = await Promise.all([store.listSops(), currentRole()]);

  return (
    <>
      <Topbar
        title="SOPs"
        subtitle="How Elevate runs — documented, followed by all, improved together."
      />
      <SopLibrary sops={sops} isAdmin={role === "Admin"} />
    </>
  );
}
