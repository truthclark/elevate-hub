import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

// Serves the uploaded team logo (stored as a data URL in settings).
// Used by the sidebar and as the favicon. Falls back to the default icon.
export async function GET(req: Request) {
  try {
    const settings = await store.getSettings();
    const logo = settings.branding?.logo;
    if (logo?.startsWith("data:")) {
      const [meta, b64] = logo.split(",");
      const mime = meta.slice(5, meta.indexOf(";"));
      return new NextResponse(Buffer.from(b64, "base64"), {
        headers: {
          "Content-Type": mime || "image/png",
          "Cache-Control": "public, max-age=300",
        },
      });
    }
  } catch {
    // fall through to default
  }
  return NextResponse.redirect(new URL("/icon.svg", req.url));
}
