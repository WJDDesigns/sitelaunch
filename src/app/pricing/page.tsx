import Link from "next/link";
import type { Metadata } from "next";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";
import PricingCards from "./PricingCards";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for agencies of every size.",
};

const TIERS = [
  {
    name: "Comet",
    tagline: "For getting started",
    price: "Free",
    period: "forever",
    features: [
      { text: "1 submission / month", included: true },
      { text: "1 GB file storage", included: true },
      { text: "Branded workspace", included: true },
      { text: "Unlimited form fields", included: true },
      { text: "Community support", included: true },
      { text: "White-labeling", included: false },
      { text: "Custom domain", included: false },
      { text: "Priority support", included: false },
    ],
    cta: "Get Started Free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Nova",
    tagline: "For growing agencies",
    price: "$99",
    period: "/mo",
    features: [
      { text: "25 submissions / month", included: true },
      { text: "50 GB file storage", included: true },
      { text: "Full white-labeling", included: true },
      { text: "Custom domain mapping", included: true },
      { text: "Remove SiteLaunch branding", included: true },
      { text: "Email support", included: true },
      { text: "CSV & PDF exports", included: true },
      { text: "Team members", included: true },
    ],
    cta: "Get Nova",
    href: "/checkout?plan=pro",
    highlight: true,
  },
  {
    name: "Supernova",
    tagline: "For scaling teams",
    price: "$249",
    period: "/mo",
    features: [
      { text: "Unlimited submissions", included: true },
      { text: "500 GB file storage", included: true },
      { text: "Everything in Nova", included: true },
      { text: "Priority 24/7 support", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Custom onboarding setup", included: true },
      { text: "SLA guarantee", included: true },
    ],
    cta: "Get Supernova",
    href: "/checkout?plan=enterprise",
    highlight: false,
  },
];

const FAQ = [
  {
    q: "Can I upgrade or downgrade anytime?",
    a: "Yes. You can switch plans at any time from your dashboard. When upgrading, you'll be prorated for the remainder of the billing cycle. Downgrades take effect at the next billing date.",
  },
  {
    q: "What happens if I hit my submission limit?",
    a: "You'll receive an email when you're approaching your limit. Once reached, new submissions will be queued until the next billing cycle or you upgrade your plan.",
  },
  {
    q: "What counts as a submission?",
    a: "A submission is one completed client onboarding form. Drafts and in-progress forms don't count toward your limit until the client clicks submit.",
  },
  {
    q: "Is there a contract or commitment?",
    a: "No. All plans are month-to-month with no long-term contracts. You can cancel anytime and your workspace will remain accessible through the end of the billing period.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Yes — annual billing comes with a 20% discount. Contact us at hello@mysitelaunch.com to set up annual billing on Nova or Supernova.",
  },
  {
    q: "What file types can clients upload?",
    a: "Clients can upload any file type including images, PDFs, documents, videos, and design files. Individual files can be up to 100 MB on all plans.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen flex flex-col selection:bg-primary/30">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-8 py-4 bg-background/70 backdrop-blur-2xl border-b border-on-surface/[0.04]">
        <Link href="/" className="flex items-center gap-2.5">
          <SiteLaunchLogo className="h-7 w-auto text-primary" ringClassName="text-on-surface/70" />
          <span className="text-lg font-bold font-headline text-on-surface tracking-tight">SiteLaunch</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link className="text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-300" href="/#features">Features</Link>
          <Link className="text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-300" href="/#how-it-works">How It Works</Link>
          <Link className="text-sm text-primary font-semibold transition-colors duration-300" href="/pricing">Pricing</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:inline-flex text-sm text-on-surface-variant hover:text-on-surface transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 bg-primary text-on-primary font-semibold rounded-xl text-sm hover:shadow-[0_0_24px_rgba(var(--color-primary),0.4)] active:scale-[0.97] transition-all duration-300"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 md:pt-44 pb-16 md:pb-20 px-6 overflow-hidden text-center">
        <div className="absolute inset-0 gradient-mesh pointer-events-none" />
        <div className="absolute inset-0 bg-dot-grid pointer-events-none" />
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.14] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-[10%] w-[400px] h-[300px] bg-tertiary/[0.08] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4 animate-fade-up">Pricing</span>
          <h1 className="animate-fade-up delay-1 text-4xl md:text-6xl font-headline font-extrabold tracking-tight mb-6 leading-tight">
            Simple pricing,<br />
            <span className="gradient-text-hero">no surprises.</span>
          </h1>
          <p className="animate-fade-up delay-2 text-lg text-on-surface-variant/80 max-w-xl mx-auto">
            Start free, scale when you&apos;re ready. Every plan includes unlimited form fields and a fully branded workspace.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 pt-4 pb-24 md:pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-crosshatch pointer-events-none" />
        <div className="absolute inset-0 bg-aurora pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <PricingCards tiers={TIERS} />
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-6 pb-24 md:pb-32 relative overflow-hidden bg-surface-container-low/20">
        <div className="absolute inset-0 bg-diagonal-lines pointer-events-none" />
        <div className="absolute inset-0 bg-corner-glow pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outline-variant/15 to-transparent" />
        <div className="max-w-4xl mx-auto relative z-10 pt-24 md:pt-32">
          <h2 className="text-2xl md:text-3xl font-headline font-bold text-center mb-12">Compare plans at a glance</h2>
          <div className="rounded-2xl overflow-hidden border border-outline-variant/[0.08] bg-surface-container/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/[0.08]">
                  <th className="text-left px-6 py-4 text-xs uppercase tracking-widest text-on-surface-variant/50 font-bold">Feature</th>
                  <th className="text-center px-4 py-4 text-xs uppercase tracking-widest text-on-surface-variant/50 font-bold">Comet</th>
                  <th className="text-center px-4 py-4 text-xs uppercase tracking-widest text-primary font-bold">Nova</th>
                  <th className="text-center px-4 py-4 text-xs uppercase tracking-widest text-on-surface-variant/50 font-bold">Supernova</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/[0.05]">
                <CompareRow feature="Monthly submissions" comet="1" nova="25" supernova="Unlimited" />
                <CompareRow feature="File storage" comet="1 GB" nova="50 GB" supernova="500 GB" />
                <CompareRow feature="Form fields" comet="Unlimited" nova="Unlimited" supernova="Unlimited" />
                <CompareRow feature="White-labeling" comet={false} nova={true} supernova={true} />
                <CompareRow feature="Custom domain" comet={false} nova={true} supernova={true} />
                <CompareRow feature="Remove branding" comet={false} nova={true} supernova={true} />
                <CompareRow feature="CSV & PDF exports" comet={false} nova={true} supernova={true} />
                <CompareRow feature="Team members" comet="1" nova="5" supernova="Unlimited" />
                <CompareRow feature="Priority support" comet={false} nova={false} supernova={true} />
                <CompareRow feature="Dedicated account manager" comet={false} nova={false} supernova={true} />
                <CompareRow feature="SLA guarantee" comet={false} nova={false} supernova={true} />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-24 md:pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-honeycomb pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute top-[20%] left-[-5%] w-[400px] h-[350px] bg-primary/[0.07] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-5%] w-[350px] h-[300px] bg-tertiary/[0.06] rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10 pt-24 md:pt-32">
          <h2 className="text-2xl md:text-3xl font-headline font-bold text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="glass-panel rounded-2xl border border-outline-variant/[0.08] p-6">
                <h3 className="font-bold text-on-surface mb-2">{item.q}</h3>
                <p className="text-sm text-on-surface-variant/70 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24 md:pb-32 text-center relative overflow-hidden bg-surface-container-low/20">
        <div className="absolute inset-0 bg-ripple pointer-events-none" />
        <div className="absolute inset-0 gradient-mesh pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outline-variant/15 to-transparent" />
        <div className="max-w-3xl mx-auto relative z-10 pt-24 md:pt-32">
          <div className="gradient-border rounded-3xl">
            <div className="relative glass-panel noise-overlay p-12 md:p-16 rounded-3xl overflow-hidden">
              <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-primary/[0.06] rounded-full blur-[80px] pointer-events-none" />
              <h2 className="text-3xl md:text-4xl font-headline font-bold mb-4 relative z-10">
                Ready to streamline your onboarding?
              </h2>
              <p className="text-on-surface-variant mb-8 relative z-10 max-w-md mx-auto">
                Start collecting client content in minutes. No credit card required.
              </p>
              <Link
                href="/signup"
                className="relative z-10 inline-flex items-center gap-2 px-8 py-4 bg-primary text-on-primary font-bold rounded-xl hover:shadow-[0_0_40px_rgba(var(--color-primary),0.4)] transition-all duration-500 group"
              >
                Get Started Free
                <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-8 border-t border-on-surface/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <SiteLaunchLogo className="h-5 w-auto text-primary" ringClassName="text-on-surface/50" />
            <span className="text-sm font-bold text-on-surface font-headline">SiteLaunch</span>
          </Link>
          <div className="flex flex-wrap justify-center gap-8 text-xs text-on-surface-variant/40 uppercase tracking-widest font-label">
            <a className="hover:text-primary transition-colors duration-300" href="#">Privacy Policy</a>
            <a className="hover:text-primary transition-colors duration-300" href="#">Terms of Service</a>
            <a className="hover:text-primary transition-colors duration-300" href="#">Contact</a>
          </div>
          <div className="text-xs text-on-surface-variant/30">
            &copy; {new Date().getFullYear()} SiteLaunch
          </div>
        </div>
      </footer>
    </main>
  );
}

function CompareRow({
  feature,
  comet,
  nova,
  supernova,
}: {
  feature: string;
  comet: string | boolean;
  nova: string | boolean;
  supernova: string | boolean;
}) {
  function renderCell(val: string | boolean) {
    if (val === true) return <i className="fa-solid fa-check text-tertiary text-xs" />;
    if (val === false) return <i className="fa-solid fa-minus text-on-surface-variant/20 text-xs" />;
    return <span className="text-on-surface-variant">{val}</span>;
  }

  return (
    <tr className="hover:bg-primary/[0.02] transition-colors">
      <td className="px-6 py-3.5 text-on-surface font-medium">{feature}</td>
      <td className="text-center px-4 py-3.5">{renderCell(comet)}</td>
      <td className="text-center px-4 py-3.5">{renderCell(nova)}</td>
      <td className="text-center px-4 py-3.5">{renderCell(supernova)}</td>
    </tr>
  );
}
