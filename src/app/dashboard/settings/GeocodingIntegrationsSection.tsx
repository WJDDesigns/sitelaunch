"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const GEOCODING_PROVIDERS = [
  {
    id: "google",
    name: "Google Places",
    icon: "fa-brands fa-google",
    color: "text-[#4285f4]",
    description: "Google Maps Places API for address autocomplete with high accuracy",
    url: "https://console.cloud.google.com/apis/credentials",
    urlLabel: "Get API key",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "AIza...", type: "password" as const },
    ],
  },
  {
    id: "openstreetmap",
    name: "OpenStreetMap (Nominatim)",
    icon: "fa-solid fa-map",
    color: "text-[#7ebc6f]",
    description: "Free, open-source geocoding. No API key required for low-volume use.",
    url: "https://nominatim.org/release-docs/latest/api/Search/",
    urlLabel: "View docs",
    fields: [] as { key: string; label: string; placeholder: string; type: "text" | "password" }[],
  },
] as const;

interface GeocodingIntegration {
  id: string;
  provider: string;
  connected_at: string;
}

export default function GeocodingIntegrationsSection({
  integrations,
  defaultProvider,
}: {
  integrations: GeocodingIntegration[];
  defaultProvider?: "google" | "openstreetmap";
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const connectedMap = new Map(integrations.map((i) => [i.provider, i]));

  async function handleConnect(provider: string) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/geocoding-integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: apiKey || null }),
      });
      if (!res.ok) throw new Error("Failed");
      setApiKey("");
      setEditingProvider(null);
      startTransition(() => {
        router.refresh();
        const name = GEOCODING_PROVIDERS.find((p) => p.id === provider)?.name ?? provider;
        setMsg(`${name} connected successfully.`);
      });
    } catch {
      setMsg("Failed to connect. Check your key and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect(provider: string) {
    const name = GEOCODING_PROVIDERS.find((p) => p.id === provider)?.name ?? provider;
    if (!confirm(`Disconnect ${name}? Address autocomplete fields using this provider will stop working.`)) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/geocoding-integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error("Failed");
      startTransition(() => {
        router.refresh();
        setMsg(`${name} disconnected.`);
      });
    } catch {
      setMsg("Failed to disconnect. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-outline-variant/[0.08] bg-surface-container/50 shadow-xl shadow-black/10 p-6 md:p-8">
      <h2 className="text-lg font-bold font-headline text-on-surface mb-1">
        Address Autocomplete
      </h2>
      <p className="text-sm text-on-surface-variant/60 mb-5">
        Connect a geocoding provider to enable address autocomplete on your forms. OpenStreetMap works out of the box for free. Google Places offers higher accuracy with an API key.
      </p>

      {/* Global default provider selector */}
      <div className="mb-5 p-4 rounded-xl border border-outline-variant/10 bg-surface-container-lowest/30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Default Provider</h3>
            <p className="text-[10px] text-on-surface-variant/50 mt-0.5">
              Used for all address fields unless overridden per field in the form editor.
            </p>
          </div>
          <div className="flex gap-2">
            {(["openstreetmap", "google"] as const).map((p) => {
              const active = (defaultProvider ?? "openstreetmap") === p;
              const meta = { openstreetmap: { icon: "fa-solid fa-map", label: "OpenStreetMap", color: "text-[#7ebc6f]" }, google: { icon: "fa-brands fa-google", label: "Google Places", color: "text-[#4285f4]" } };
              return (
                <button key={p} onClick={async () => {
                  try {
                    const res = await fetch("/api/geocoding-integrations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ defaultProvider: p }) });
                    if (res.ok) { startTransition(() => { router.refresh(); setMsg(`Default provider set to ${meta[p].label}.`); }); }
                  } catch { /* */ }
                }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/15 text-on-surface-variant hover:bg-surface-container"
                  }`}>
                  <i className={`${meta[p].icon} text-sm ${active ? meta[p].color : ""}`} />
                  {meta[p].label}
                  {active && <i className="fa-solid fa-check text-[9px] ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GEOCODING_PROVIDERS.map((provider) => {
          const integration = connectedMap.get(provider.id);
          const isConnected = !!integration;
          const isEditing = editingProvider === provider.id;
          const needsKey = provider.fields.length > 0;

          return (
            <div
              key={provider.id}
              className={`rounded-xl border p-5 transition-all ${
                isConnected
                  ? "border-tertiary/20 bg-tertiary/[0.03]"
                  : "border-outline-variant/10 bg-surface-container-lowest/30"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isConnected ? "bg-tertiary/10" : "bg-surface-container-high/50"
                }`}>
                  <i className={`${provider.icon} text-lg ${isConnected ? provider.color : "text-on-surface-variant/40"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-on-surface">{provider.name}</h3>
                  <p className="text-[10px] text-on-surface-variant/60 mt-0.5">{provider.description}</p>
                  {isConnected && (
                    <p className="text-[10px] text-tertiary font-semibold uppercase tracking-widest mt-1">
                      <i className="fa-solid fa-circle-check text-[8px] mr-1" />
                      Connected
                    </p>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  {needsKey && (
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={provider.fields[0]?.placeholder ?? "API Key"}
                      className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none font-mono"
                      autoFocus
                    />
                  )}
                  {!needsKey && (
                    <p className="text-[10px] text-on-surface-variant/60 px-1 py-2">
                      <i className="fa-solid fa-circle-info mr-1 text-primary/60" />
                      No API key required. OpenStreetMap Nominatim is free for reasonable usage volumes.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConnect(provider.id)}
                      disabled={(needsKey && !apiKey) || saving}
                      className="flex-1 px-3 py-2 text-xs font-bold text-on-primary bg-primary rounded-lg disabled:opacity-40"
                    >
                      {saving ? "Connecting..." : "Enable"}
                    </button>
                    <button
                      onClick={() => { setEditingProvider(null); setApiKey(""); }}
                      className="px-3 py-2 text-xs font-bold text-on-surface-variant border border-outline-variant/15 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => { setEditingProvider(provider.id); setApiKey(""); }}
                        className="flex-1 px-3 py-2 text-xs font-bold text-on-surface-variant border border-outline-variant/15 rounded-lg hover:bg-surface-container-high/50 transition-colors"
                      >
                        <i className="fa-solid fa-pen-to-square mr-1.5 text-[9px]" />
                        Update
                      </button>
                      <button
                        onClick={() => handleDisconnect(provider.id)}
                        disabled={saving}
                        className="px-3 py-2 text-xs font-bold text-error/70 border border-error/15 rounded-lg hover:bg-error/5 transition-colors disabled:opacity-40"
                      >
                        <i className="fa-solid fa-unlink mr-1 text-[9px]" />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditingProvider(provider.id); setApiKey(""); }}
                        className="flex-1 px-3 py-2 text-xs font-bold text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <i className="fa-solid fa-plug mr-1.5 text-[9px]" />
                        Connect
                      </button>
                      <a
                        href={provider.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 text-xs font-bold text-on-surface-variant border border-outline-variant/15 rounded-lg hover:bg-surface-container-high/50 transition-colors"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square mr-1 text-[9px]" />
                        {provider.urlLabel}
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {msg && (
        <p className={`text-xs font-medium mt-4 px-3 py-2 rounded-lg ${msg.includes("Failed") ? "text-error bg-error/5" : "text-tertiary bg-tertiary/5"}`}>
          <i className={`fa-solid ${msg.includes("Failed") ? "fa-circle-exclamation" : "fa-circle-check"} mr-1.5 text-[10px]`} />
          {msg}
        </p>
      )}
    </section>
  );
}
