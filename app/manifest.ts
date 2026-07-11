import type { MetadataRoute } from "next";
import { store } from "@/lib/store";
import { brandOf, DEFAULT_BRAND } from "@/lib/brand";

// Branding comes from the database — render per request, not at build time
export const dynamic = "force-dynamic";

// Makes the hub installable as an app on phones (Add to Home Screen).
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let brand = DEFAULT_BRAND;
  try {
    brand = brandOf(await store.getSettings());
  } catch {
    // defaults
  }
  return {
    name: brand.appName,
    short_name: brand.appName.split(" ")[0],
    description: `Business command center for ${brand.companyName}.`,
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#05c3f9",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
