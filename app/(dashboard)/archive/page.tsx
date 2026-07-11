import Topbar from "@/components/topbar";
import { Section, StatusBadge, TypeBadge, Table, Td, EmptyState } from "@/components/ui";
import { store } from "@/lib/store";
import { currentRole } from "@/auth";
import { RestoreBtn, DestroyBtn } from "@/components/archive-buttons";
import { fmtMoney, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const [deals, leads, role] = await Promise.all([
    store.listDeals(),
    store.listLeads(),
    currentRole(),
  ]);
  const archivedDeals = deals.filter((d) => d.archived);
  const archivedLeads = leads.filter((l) => l.archived);
  const isAdmin = role === "Admin";

  return (
    <>
      <Topbar
        title="Archive"
        subtitle="Archived records are hidden from every page and report. Restore anytime — or delete forever (admins only, no undo)."
      />

      <Section title={`Archived deals & clients (${archivedDeals.length})`} className="mb-6">
        {archivedDeals.length > 0 ? (
          <Table headers={["Client / Property", "Side", "Status", "Price", "Close date", "", ""]}>
            {archivedDeals.map((d) => (
              <tr key={d.id} className="hover:bg-chalk/60">
                <Td className="font-semibold">{d.address || d.name}</Td>
                <Td><TypeBadge value={d.side} /></Td>
                <Td><StatusBadge value={d.status} /></Td>
                <Td>{fmtMoney(d.price)}</Td>
                <Td>{fmtDate(d.closeDate || d.closedDate)}</Td>
                <Td><RestoreBtn kind="deal" id={d.id} /></Td>
                <Td>{isAdmin && <DestroyBtn kind="deal" id={d.id} name={d.address || d.name} />}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState message="No archived deals." />
        )}
      </Section>

      <Section title={`Archived leads (${archivedLeads.length})`}>
        {archivedLeads.length > 0 ? (
          <Table headers={["Name", "Type", "Source", "Follow-up", "", ""]}>
            {archivedLeads.map((l) => (
              <tr key={l.id} className="hover:bg-chalk/60">
                <Td className="font-semibold">{l.name}</Td>
                <Td><TypeBadge value={l.type} /></Td>
                <Td>{l.source || "—"}</Td>
                <Td><StatusBadge value={l.followUpStatus} /></Td>
                <Td><RestoreBtn kind="lead" id={l.id} /></Td>
                <Td>{isAdmin && <DestroyBtn kind="lead" id={l.id} name={l.name} />}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState message="No archived leads." />
        )}
      </Section>
    </>
  );
}
