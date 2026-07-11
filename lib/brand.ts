import { Settings } from "./types";

// One place for company identity. Everything user-facing reads from here,
// so a new team can rebrand the whole app from Settings → Branding.
// Defaults are Elevate's so existing deployments look identical.

export interface Brand {
  appName: string;
  companyName: string;
  brokerageName: string;
  city: string;
  tagline: string;
}

export const DEFAULT_BRAND: Brand = {
  appName: "Elevate Hub",
  companyName: "Elevate Realty Team",
  brokerageName: "Real Broker LLC",
  city: "San Antonio, TX",
  tagline: "Higher purpose. Higher standards.",
};

export function brandOf(settings?: Settings | null): Brand {
  const b = settings?.branding ?? {};
  return {
    appName: b.appName || DEFAULT_BRAND.appName,
    companyName: b.companyName || DEFAULT_BRAND.companyName,
    brokerageName: b.brokerageName || DEFAULT_BRAND.brokerageName,
    city: b.city || DEFAULT_BRAND.city,
    tagline: b.tagline || DEFAULT_BRAND.tagline,
  };
}
