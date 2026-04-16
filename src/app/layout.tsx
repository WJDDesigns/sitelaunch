import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import ThemeProvider from "@/components/ThemeProvider";
import CookieConsent from "@/components/CookieConsent";
import type { ThemeMode } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SiteLaunch | Client Onboarding for Agencies", template: "%s · SiteLaunch" },
  description:
    "Collect client content, files, and approvals in one branded workspace. SiteLaunch replaces scattered emails with a clean onboarding portal your clients will love.",
  applicationName: "SiteLaunch",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(process.env.NEXT_PUBLIC_MARKETING_URL || "https://mysitelaunch.com"),
  keywords: ["client onboarding", "agency tools", "content collection", "white-label portal", "SaaS"],
  authors: [{ name: "WJD Designs", url: "https://wjddesigns.com" }],
  creator: "WJD Designs",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "SiteLaunch",
    title: "SiteLaunch | Client Onboarding for Agencies",
    description:
      "Collect client content, files, and approvals in one branded workspace. Replace scattered emails with a clean onboarding portal.",
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SiteLaunch - Client onboarding, launched.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SiteLaunch | Client Onboarding for Agencies",
    description:
      "Collect client content, files, and approvals in one branded workspace.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1326",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const savedTheme = (cookieStore.get("theme")?.value ?? "dark") as ThemeMode;
  // Resolve for server-side initial render
  const isDark = savedTheme === "dark" || savedTheme === "auto";

  return (
    <html lang="en" className={isDark ? "dark" : ""} suppressHydrationWarning>
      <head>
        {/* Inline script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=document.cookie.match(/theme=([^;]+)/);var m=t?t[1]:"dark";var d=m==="dark"||(m==="auto"&&window.matchMedia("(prefers-color-scheme:dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-background text-on-surface" suppressHydrationWarning>
        <ThemeProvider defaultMode={savedTheme}>
          {children}
        </ThemeProvider>
        <CookieConsent />
        <Analytics />
        {/* Ambient background glows — multi-layered aurora */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-primary/[0.07] blur-[140px] rounded-full animate-glow-breathe" />
          <div className="absolute bottom-[5%] left-[15%] w-[35%] h-[35%] bg-tertiary/[0.05] blur-[120px] rounded-full animate-glow-breathe" style={{ animationDelay: "-2s" }} />
          <div className="absolute top-[40%] left-[60%] w-[25%] h-[25%] bg-inverse-primary/[0.04] blur-[100px] rounded-full animate-glow-breathe" style={{ animationDelay: "-4s" }} />
        </div>
      </body>
    </html>
  );
}
