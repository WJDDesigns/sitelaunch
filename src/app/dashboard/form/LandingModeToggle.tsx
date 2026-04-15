"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleShowAllFormsAction } from "./landing-actions";

interface Props {
  showAllForms: boolean;
  storefrontUrl: string;
}

export default function LandingModeToggle({ showAllForms, storefrontUrl }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(showAllForms);

  function handleToggle(value: boolean) {
    setShowAll(value);
    startTransition(async () => {
      const result = await toggleShowAllFormsAction(value);
      if (result.ok) router.refresh();
      else setShowAll(!value); // revert on failure
    });
  }

  return (
    <div className="bg-surface-container rounded-2xl border border-outline-variant/[0.06] p-5 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-on-surface">Landing page mode</h3>
          <p className="text-xs text-on-surface-variant/60 mt-0.5">
            {showAll
              ? "Clients see all your forms in a grid and choose which one to fill out."
              : "Clients land directly on your default form."}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-surface-container-high rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => handleToggle(false)}
            disabled={pending}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              !showAll
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant/60 hover:text-on-surface"
            }`}
          >
            Default form
          </button>
          <button
            onClick={() => handleToggle(true)}
            disabled={pending}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              showAll
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant/60 hover:text-on-surface"
            }`}
          >
            Show all forms
          </button>
        </div>
      </div>

      {showAll && (
        <p className="text-[11px] text-on-surface-variant/40 mt-3 flex items-center gap-1.5">
          <i className="fa-solid fa-globe text-[9px]" />
          Preview: <a href={storefrontUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{storefrontUrl.replace(/^https?:\/\//, "")}</a>
        </p>
      )}
    </div>
  );
}
