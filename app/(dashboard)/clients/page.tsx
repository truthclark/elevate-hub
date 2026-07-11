import { redirect } from "next/navigation";

// Clients merged into Deals — keep old links working.
export default function ClientsRedirect() {
  redirect("/deals");
}
