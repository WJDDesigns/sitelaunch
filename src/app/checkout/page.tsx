import { getPlans } from "@/lib/plans";
import CheckoutForm from "./CheckoutForm";
import Link from "next/link";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";

interface Props {
  searchParams: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const { plan: selectedPlan } = await searchParams;
  const plans = await getPlans();
  const paidPlans = plans.filter((p) => p.priceMonthly > 0);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="gradient-mesh fixed inset-0 -z-10" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10 animate-glow-breathe" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <SiteLaunchLogo className="h-7 w-auto text-primary" ringClassName="text-on-surface/70" />
          <span className="text-lg font-extrabold font-headline text-on-surface tracking-tight">
            SiteLaunch
          </span>
        </Link>
        <Link
          href="/pricing"
          className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Back to Pricing
        </Link>
      </nav>

      {/* Content */}
      <main className="relative z-10 max-w-2xl mx-auto px-6 md:px-10 pb-20">
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight text-on-surface">
            Complete Your Upgrade
          </h1>
          <p className="text-sm text-on-surface-variant/60 mt-2">
            Choose your plan and apply a coupon if you have one.
          </p>
        </header>

        <CheckoutForm plans={paidPlans} defaultPlan={selectedPlan} />
      </main>
    </div>
  );
}
