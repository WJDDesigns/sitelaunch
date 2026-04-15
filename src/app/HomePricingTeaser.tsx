"use client";

import Link from "next/link";
import HoloCard from "@/components/HoloCard";

export default function HomePricingTeaser() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12 items-start">
      {/* Comet */}
      <HoloCard className="rounded-2xl h-full" glowColor="rgba(var(--color-primary), 0.25)">
        <div className="bg-surface-container-low/60 border border-outline-variant/10 rounded-2xl p-6 text-center h-full">
          <h3 className="text-lg font-bold font-headline mb-1">Comet</h3>
          <div className="text-3xl font-extrabold font-headline mb-2">Free</div>
          <p className="text-xs text-on-surface-variant/60">1 submission/mo &middot; 1 GB</p>
        </div>
      </HoloCard>

      {/* Nova (featured) */}
      <HoloCard className="rounded-2xl h-full" featured glowColor="rgba(var(--color-primary), 0.5)">
        <div className="gradient-border rounded-2xl h-full">
          <div className="relative glass-panel noise-overlay rounded-2xl p-6 text-center">
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <h3 className="text-lg font-bold font-headline mb-1 text-primary">Nova</h3>
            <div className="text-3xl font-extrabold font-headline gradient-text mb-2">$99<span className="text-base font-normal text-on-surface-variant">/mo</span></div>
            <p className="text-xs text-on-surface-variant/60">25 submissions/mo &middot; 50 GB</p>
          </div>
        </div>
      </HoloCard>

      {/* Supernova */}
      <HoloCard className="rounded-2xl h-full" glowColor="rgba(var(--color-primary), 0.25)">
        <div className="bg-surface-container-low/60 border border-outline-variant/10 rounded-2xl p-6 text-center h-full">
          <h3 className="text-lg font-bold font-headline mb-1">Supernova</h3>
          <div className="text-3xl font-extrabold font-headline mb-2">$249<span className="text-base font-normal text-on-surface-variant">/mo</span></div>
          <p className="text-xs text-on-surface-variant/60">Unlimited &middot; 500 GB</p>
        </div>
      </HoloCard>
    </div>
  );
}
