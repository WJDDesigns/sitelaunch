import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import CookieConsent from "@/components/CookieConsent";
import type { ThemeMode } from "@/components/ThemeProvider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "linqme | Forms, Entries & Insights for Agencies", template: "%s · linqme" },
  description:
    "Build custom forms, collect client data and files, manage entries, and visualize everything with real-time insights. All under your own brand.",
  applicationName: "linqme",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(process.env.NEXT_PUBLIC_MARKETING_URL || "https://linqme.io"),
  keywords: ["agency platform", "form builder", "client portal", "data insights", "white-label", "entry management", "SaaS"],
  authors: [{ name: "WJD Designs", url: "https://wjddesigns.com" }],
  creator: "WJD Designs",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "linqme",
    title: "linqme | Forms, Entries & Insights for Agencies",
    description:
      "Build custom forms, collect client data, manage entries, and visualize it all with real-time insights. All under your own brand.",
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "linqme - Forms, Entries and Insights for Agencies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "linqme | Forms, Entries & Insights for Agencies",
    description:
      "Build custom forms, collect client data, and visualize it all with real-time insights.",
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
    <html lang="en" className={`${isDark ? "dark" : ""} ${jakarta.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Inline script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=document.cookie.match(/theme=([^;]+)/);var m=t?t[1]:"dark";var d=m==="dark"||(m==="auto"&&window.matchMedia("(prefers-color-scheme:dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`,
          }}
        />
        {/* Google Fonts loaded via next/font (see imports above) */}
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
