import { redirect } from "next/navigation";

// Transactions merged into Deals — keep old links (and ?view=) working.
export default function TransactionsRedirect({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  redirect(searchParams?.view === "closed" ? "/deals?view=closed" : "/deals?view=contract");
}
