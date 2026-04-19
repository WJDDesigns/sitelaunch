"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { id: "general", label: "General", icon: "fa-gear" },
  { id: "branding", label: "Branding", icon: "fa-palette" },
  { id: "integrations", label: "Integrations", icon: "fa-plug" },
  { id: "advanced", label: "Advanced", icon: "fa-sliders" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  generalContent: React.ReactNode;
  brandingContent: React.ReactNode;
  integrationsContent: React.ReactNode;
  advancedContent: React.ReactNode;
  defaultTab?: string;
}

export default function SettingsTabs({ generalContent, brandingContent, integrationsContent, advancedContent, defaultTab }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Resolve initial tab: URL ?tab= param takes priority, then defaultTab prop, then "general"
  const urlTab = searchParams.get("tab");
  const resolvedDefault = TABS.find((t) => t.id === urlTab) ? (urlTab as TabId) : TABS.find((t) => t.id === defaultTab) ? (defaultTab as TabId) : "general";
  const [active, setActive] = useState<TabId>(resolvedDefault);

  // Sync tab state when URL changes externally (e.g. back/forward nav)
  useEffect(() => {
    const param = searchParams.get("tab");
    if (param && TABS.find((t) => t.id === param) && param !== active) {
      setActive(param as TabId);
    }
  }, [searchParams, active]);

  const switchTab = useCallback((tabId: TabId) => {
    setActive(tabId);
    // Update URL without full page reload
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === "general") {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }
    const qs = params.toString();
    router.replace(`/dashboard/settings${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router, searchParams]);

  const panels: Record<TabId, React.ReactNode> = {
    general: generalContent,
    branding: brandingContent,
    integrations: integrationsContent,
    advanced: advancedContent,
  };

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-container-high/40 border border-outline-variant/[0.08]">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-xs`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="space-y-6 animate-fade-up">
        {panels[active]}
      </div>
    </>
  );
}
