import type { Metadata } from "next";
import { Sora, DM_Sans } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

// Title, description, and favicon follow Settings → Branding.
export async function generateMetadata(): Promise<Metadata> {
  let hasLogo = false;
  const { DEFAULT_BRAND, brandOf } = await import("@/lib/brand");
  let brand = DEFAULT_BRAND;
  try {
    const { store } = await import("@/lib/store");
    const settings = await store.getSettings();
    hasLogo = Boolean(settings.branding?.logo);
    brand = brandOf(settings);
  } catch {
    // defaults
  }
  return {
    title: `${brand.appName} — ${brand.companyName}`,
    description: `Business command center for ${brand.companyName}, brokered by ${brand.brokerageName}.`,
    appleWebApp: {
      capable: true,
      title: brand.appName,
      statusBarStyle: "default",
    },
    ...(hasLogo
      ? { icons: { icon: "/api/logo", apple: "/api/logo" } }
      : { icons: { apple: "/icon-192.png" } }),
  };
}

export const viewport = {
  themeColor: "#05c3f9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply saved theme before paint — prevents light-mode flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("hub-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
