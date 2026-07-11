import Topbar from "@/components/topbar";
import LinksBoard from "@/components/links-ui";
import { store } from "@/lib/store";
import { DEFAULT_LINKS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const settings = await store.getSettings();
  return (
    <>
      <Topbar
        title="Links"
        subtitle="Every tool the team uses, one click away. Edit to add your own."
      />
      <LinksBoard links={settings.links ?? DEFAULT_LINKS} />
    </>
  );
}
