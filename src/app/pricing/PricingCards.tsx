"use client";

import Link from "next/link";
import HoloCard from "@/components/HoloCard";

interface TierFeature {
  text: string;
  included: boolean;
}

interface Tier {
  name: string;
  tagline: string;
  price: string;
  period: string;
  features: TierFeature[];
  cta: string;
  href: string;
  highlight: boolean;
}

export default function PricingCards({ tiers }: { tiers: Tier[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
      {tiers.map((tier, i) => (
        <div
          key={tier.name}
          className={`animate-fade-up relative flex flex-col transition-all duration-500 ${
            tier.highlight ? "md:-mt-4 md:mb-4" : ""
          }`}
          style={{ animationDelay: `${0.1 + i * 0.1}s` }}
        >
          <HoloCard
            className="rounded-2xl h-full"
            featured={tier.highlight}
            glowColor={
              tier.highlight
                ? "rgba(var(--color-primary), 0.5)"
                : "rgba(var(--color-primary), 0.25)"
            }
          >
            {tier.highlight ? (
              <div className="gradient-border rounded-2xl h-full">
                <div className="relative glass-panel noise-overlay rounded-2xl p-8 md:p-10 flex flex-col h-full">
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                  <div className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
                    <i className="fa-solid fa-star text-[8px] text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold font-headline">{tier.name}</h3>
                  <p className="text-sm text-on-surface-variant/60 mt-1 mb-6">
                    {tier.tagline}
                  </p>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-5xl font-headline font-extrabold gradient-text">
                      {tier.price}
                    </span>
                    <span className="text-on-surface-variant">{tier.period}</span>
                  </div>
                  <FeatureList features={tier.features} variant="featured" />
                  <Link
                    href={tier.href}
                    className="w-full py-3.5 text-center rounded-xl font-bold text-sm bg-primary text-on-primary hover:shadow-[0_0_30px_rgba(var(--color-primary),0.4)] transition-all duration-500 relative z-10"
                  >
                    {tier.cta}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-low/60 border border-outline-variant/10 rounded-2xl p-8 md:p-10 flex flex-col h-full">
                <h3 className="text-2xl font-bold font-headline">{tier.name}</h3>
                <p className="text-sm text-on-surface-variant/60 mt-1 mb-6">
                  {tier.tagline}
                </p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-headline font-extrabold">
                    {tier.price}
                  </span>
                  <span className="text-on-surface-variant">{tier.period}</span>
                </div>
                <FeatureList features={tier.features} variant="default" />
                <Link
                  href={tier.href}
                  className="w-full py-3.5 text-center rounded-xl font-bold text-sm border border-outline-variant/20 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 relative z-10"
                >
                  {tier.cta}
                </Link>
              </div>
            )}
          </HoloCard>
        </div>
      ))}
    </div>
  );
}

function FeatureList({
  features,
  variant,
}: {
  features: TierFeature[];
  variant: "featured" | "default";
}) {
  return (
    <ul className="space-y-3.5 mb-8 flex-grow">
      {features.map((f) => (
        <li key={f.text} className="flex items-center gap-3 text-sm">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
              f.included
                ? variant === "featured"
                  ? "bg-tertiary/10"
                  : "bg-surface-container-high"
                : "bg-surface-container-high/50"
            }`}
          >
            <i
              className={`fa-solid ${
                f.included
                  ? variant === "featured"
                    ? "fa-check text-tertiary"
                    : "fa-check text-on-surface-variant/60"
                  : "fa-minus text-on-surface-variant/20"
              } text-[9px]`}
            />
          </div>
          <span
            className={
              f.included
                ? variant === "featured"
                  ? ""
                  : "text-on-surface-variant"
                : variant === "featured"
                ? "text-on-surface-variant/40"
                : "text-on-surface-variant/30"
            }
          >
            {f.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
