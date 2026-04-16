"use client";

import { useState } from "react";

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
  const initial = TABS.find((t) => t.id === defaultTab) ? (defaultTab as TabId) : "general";
  const [active, setActive] = useState<TabId>(initial);

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
              onClick={() => setActive(tab.id)}
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
