import Link from "next/link";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";
import SupportForm from "./SupportForm";

export const metadata = {
  title: "Support | SiteLaunch",
  description: "Get help with SiteLaunch. Contact our support team.",
};

export default function SupportPage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[160px] pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-6 md:px-10 py-16">
        {/* Header */}
        <Link href="/" className="inline-flex items-center gap-2 mb-12">
          <SiteLaunchLogo className="h-8 w-auto text-primary" ringClassName="text-on-surface/60" />
        </Link>

        <div className="glass-panel rounded-2xl border border-outline-variant/15 p-8 md:p-12">
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
            Contact Support
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant/60">
            Have a question or need help? Fill out the form below and we will get back to you.
          </p>
          <p className="mt-1 text-xs text-on-surface-variant/40">
            We typically respond within 24 hours.
          </p>

          <div className="mt-8">
            <SupportForm />
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-on-surface-variant/50">
          <Link href="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <span className="text-outline-variant/20">|</span>
          <Link href="/privacy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <span className="text-outline-variant/20">|</span>
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
