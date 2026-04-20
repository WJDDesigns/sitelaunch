"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameFormAction, setDefaultFormAction, deleteFormAction, updateThemeModeAction, updateLayoutStyleAction } from "../form-actions";
import type { LayoutStyle } from "../form-actions";
import { updateFormPartnersAction } from "./assignment-actions";

interface Partner {
  id: string;
  name: string;
}

interface Props {
  formId: string;
  formName: string;
  formSlug: string;
  isDefault: boolean;
  partners: Partner[];
  assignedPartnerIds: string[];
  storefrontHost: string;
  themeMode: "dark" | "light" | "auto";
  layoutStyle: LayoutStyle;
}

export default function FormSettingsPanel({
  formId,
  formName,
  formSlug,
  isDefault,
  partners,
  assignedPartnerIds,
  storefrontHost,
  themeMode: initialThemeMode,
  layoutStyle: initialLayoutStyle,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(formName);
  const [msg, setMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPartners, setSelectedPartners] = useState<Set<string>>(new Set(assignedPartnerIds));

  // Theme state
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "auto">(initialThemeMode);
  const [themeMsg, setThemeMsg] = useState<string | null>(null);

  // Layout style state
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>(initialLayoutStyle);
  const [layoutMsg, setLayoutMsg] = useState<string | null>(null);

  function handleLayoutChange(style: LayoutStyle) {
    setLayoutStyle(style);
    setLayoutMsg(null);
    startTransition(async () => {
      const result = await updateLayoutStyleAction(formId, style);
      setLayoutMsg(result.ok ? "Layout updated!" : (result.error ?? "Failed."));
      if (result.ok) router.refresh();
    });
  }

  function handleThemeChange(mode: "dark" | "light" | "auto") {
    setThemeMode(mode);
    setThemeMsg(null);
    startTransition(async () => {
      const result = await updateThemeModeAction(mode);
      setThemeMsg(result.ok ? "Theme updated!" : (result.error ?? "Failed."));
      if (result.ok) router.refresh();
    });
  }

  function handleRename() {
    if (!name.trim() || name === formName) return;
    setMsg(null);
    startTransition(async () => {
      const result = await renameFormAction(formId, name.trim());
      setMsg(result.ok ? "Saved!" : (result.error ?? "Failed."));
      if (result.ok) router.refresh();
    });
  }

  function handleSetDefault() {
    setMsg(null);
    startTransition(async () => {
      const result = await setDefaultFormAction(formId);
      setMsg(result.ok ? "Set as default!" : (result.error ?? "Failed."));
      if (result.ok) router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${formName}"? This cannot be undone.`)) return;
    setMsg(null);
    startTransition(async () => {
      const result = await deleteFormAction(formId);
      if (result.ok) {
        router.push("/dashboard/form");
      } else {
        setMsg(result.error ?? "Failed.");
      }
    });
  }

  function togglePartner(partnerId: string) {
    setSelectedPartners((prev) => {
      const next = new Set(prev);
      if (next.has(partnerId)) next.delete(partnerId);
      else next.add(partnerId);
      return next;
    });
  }

  function handleSavePartners() {
    setMsg(null);
    startTransition(async () => {
      const result = await updateFormPartnersAction(formId, Array.from(selectedPartners));
      setMsg(result.ok ? "Partner assignments saved!" : (result.error ?? "Failed."));
      if (result.ok) router.refresh();
    });
  }


  const formUrl = isDefault
    ? `https://${storefrontHost}`
    : `https://${storefrontHost}/f/${formSlug}`;

  const partnersChanged = (() => {
    const orig = new Set(assignedPartnerIds);
    if (orig.size !== selectedPartners.size) return true;
    for (const id of selectedPartners) if (!orig.has(id)) return true;
    return false;
  })();

  return (
    <>
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="w-8 h-8 flex items-center justify-center text-on-surface-variant/60 border border-outline-variant/15 rounded-lg hover:border-primary/30 hover:text-primary transition-all"
        title="Form settings"
      >
        <i className="fa-solid fa-gear text-sm" />
      </button>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div className="bg-surface-container rounded-2xl border border-outline-variant/15 p-6 w-full max-w-lg shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface">Form settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-on-surface-variant/60 hover:text-on-surface transition-colors" aria-label="Close settings">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            {/* Name */}
            <label className="block">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Form name</span>
              <div className="flex gap-2 mt-1.5">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none"
                />
                <button
                  onClick={handleRename}
                  disabled={pending || !name.trim() || name === formName}
                  className="px-4 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-sm disabled:opacity-50 transition-all"
                >
                  Save
                </button>
              </div>
            </label>

            {/* Public URL */}
            <div>
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Public URL</span>
              <div className="mt-1.5 px-4 py-2.5 text-sm bg-surface-container-lowest rounded-xl text-on-surface-variant font-mono break-all">
                {formUrl}
              </div>
            </div>

            {/* Theme mode */}
            <div>
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Client form theme</span>
              <p className="text-xs text-on-surface-variant/60 mt-0.5 mb-2">
                Controls the default appearance of your client-facing forms.
              </p>
              <div className="flex gap-2">
                {([
                  { value: "dark" as const, icon: "fa-moon", label: "Dark" },
                  { value: "light" as const, icon: "fa-sun", label: "Light" },
                  { value: "auto" as const, icon: "fa-circle-half-stroke", label: "Auto" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleThemeChange(opt.value)}
                    disabled={pending}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      themeMode === opt.value
                        ? "bg-primary text-on-primary shadow-md"
                        : "bg-surface-container-lowest text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-high/50"
                    } disabled:opacity-50`}
                  >
                    <i className={`fa-solid ${opt.icon} text-xs`} />
                    {opt.label}
                  </button>
                ))}
              </div>
              {themeMsg && (
                <p className={`text-xs font-medium mt-2 ${themeMsg.includes("!") ? "text-tertiary" : "text-error"}`}>{themeMsg}</p>
              )}
            </div>

            {/* Layout style */}
            <div>
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Form layout</span>
              <p className="text-xs text-on-surface-variant/60 mt-0.5 mb-2">
                Controls how the form steps and navigation are displayed to clients.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "default" as LayoutStyle, icon: "fa-sidebar", label: "Sidebar", desc: "Side navigation with step list" },
                  { value: "top-nav" as LayoutStyle, icon: "fa-window-maximize", label: "Top Nav", desc: "Horizontal step bar at the top" },
                  { value: "no-nav" as LayoutStyle, icon: "fa-expand", label: "No Nav", desc: "Clean, distraction-free layout" },
                  { value: "conversation" as LayoutStyle, icon: "fa-comments", label: "Conversation", desc: "One question at a time" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleLayoutChange(opt.value)}
                    disabled={pending}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-xl text-center transition-all ${
                      layoutStyle === opt.value
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                        : "bg-surface-container-lowest text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-high/50"
                    } disabled:opacity-50`}
                  >
                    <i className={`fa-solid ${opt.icon} text-base`} />
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className="text-[10px] text-on-surface-variant/50 leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
              {layoutMsg && (
                <p className={`text-xs font-medium mt-2 ${layoutMsg.includes("!") ? "text-tertiary" : "text-error"}`}>{layoutMsg}</p>
              )}
            </div>

            {/* Default toggle */}
            {!isDefault && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-on-surface">Set as default form</span>
                  <p className="text-xs text-on-surface-variant/60">The default form is shown when clients visit your main portal URL.</p>
                </div>
                <button
                  onClick={handleSetDefault}
                  disabled={pending}
                  className="px-4 py-2 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 disabled:opacity-50 transition-all"
                >
                  Make default
                </button>
              </div>
            )}

            {/* Partner assignments */}
            {partners.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Assign to partners</span>
                <p className="text-xs text-on-surface-variant/60 mt-0.5 mb-2">
                  Select which partners should use this form for their onboarding portal.
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {partners.map((p) => (
                    <label key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-high/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedPartners.has(p.id)}
                        onChange={() => togglePartner(p.id)}
                        className="w-4 h-4 rounded border-outline-variant/30 text-primary focus:ring-primary/40"
                      />
                      <span className="text-sm text-on-surface">{p.name}</span>
                    </label>
                  ))}
                </div>
                {partnersChanged && (
                  <button
                    onClick={handleSavePartners}
                    disabled={pending}
                    className="mt-3 px-4 py-2 bg-primary text-on-primary font-bold rounded-lg text-xs disabled:opacity-50 transition-all"
                  >
                    {pending ? "Saving..." : "Save assignments"}
                  </button>
                )}
              </div>
            )}

            {/* Status message */}
            {msg && (
              <p className={`text-xs font-medium ${msg.includes("!") ? "text-tertiary" : "text-error"}`}>{msg}</p>
            )}

            {/* Delete */}
            {!isDefault && (
              <div className="pt-3 border-t border-outline-variant/10">
                <button
                  onClick={handleDelete}
                  disabled={pending}
                  className="text-xs font-bold text-error/70 hover:text-error transition-colors disabled:opacity-50"
                >
                  <i className="fa-solid fa-trash text-[10px] mr-1.5" />
                  Delete this form
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
