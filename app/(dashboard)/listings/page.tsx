import { redirect } from "next/navigation";

// Listings merged into Deals — keep old links working.
export default function ListingsRedirect() {
  redirect("/deals?view=listings");
}
