import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

// Serves a funnel/form's uploaded cover photo.
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const funnel = (await store.listFunnels()).find((f) => f.slug === params.slug);
  if (!funnel?.coverData) {
    return NextResponse.json({ error: "No cover" }, { status: 404 });
  }
  const buf = Buffer.from(funnel.coverData, "base64");
  const name = (funnel.coverName || "").toLowerCase();
  const type = name.endsWith(".png")
    ? "image/png"
    : name.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
