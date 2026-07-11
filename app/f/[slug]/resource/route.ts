import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

// Serves a funnel's uploaded freebie (or redirects to the external link).
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const funnel = (await store.listFunnels()).find(
    (f) => f.slug === params.slug && f.active
  );
  if (!funnel) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!funnel.resourceData) {
    if (funnel.resourceUrl) return NextResponse.redirect(funnel.resourceUrl);
    return NextResponse.json({ error: "No resource" }, { status: 404 });
  }
  const buf = Buffer.from(funnel.resourceData, "base64");
  const name = funnel.resourceName || "resource.pdf";
  const type = name.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : "application/octet-stream";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${name}"`,
    },
  });
}
