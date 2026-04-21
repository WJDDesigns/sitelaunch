"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  INTEGRATIONS,
  CATEGORIES,
  getCategoryCounts,
  type IntegrationDef,
  type IntegrationCategory,
} from "@/lib/integrations/catalogue";

/* ── Types ────────────────────────────────────────────────────────── */

interface ConnectedIntegration {
  id: string;
  provider: string;
  table: string;
  account_email?: string | null;
  model_preference?: string | null;
  stripe_account_id?: string | null;
  connected_at: string;
}

interface Props {
  connected: ConnectedIntegration[];
}

/* ── Component ────────────────────────────────────────────────────── */

export default function IntegrationsGrid({ connected }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | "all" | "popular">("popular");
  const [search, setSearch] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, Record<string, string>>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  /* Show toast on OAuth redirect */
  useEffect(() => {
    const connectedParam = searchParams.get("connected");
    const errorParam = searchParams.get("error");
    if (connectedParam) {
      const label = connectedParam.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      setToast({ text: `${label} connected successfully!`, ok: true });
      router.replace("/dashboard/integrations", { scroll: false });
    } else if (errorParam) {
      const label = errorParam.replace(/_/g, " ");
      setToast({ text: `Connection failed: ${label}`, ok: false });
      router.replace("/dashboard/integrations", { scroll: false });
    }
  }, [searchParams, router]);

  /* Auto-dismiss toast */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const categoryCounts = useMemo(() => getCategoryCounts(), []);

  /* Build a lookup: providerKey+table -> connected record */
  const connectedMap = useMemo(() => {
    const m = new Map<string, ConnectedIntegration>();
    for (const c of connected) {
      m.set(`${c.provider}::${c.table}`, c);
    }
    return m;
  }, [connected]);

  function isConnected(def: IntegrationDef) {
    if (!def.providerKey || !def.table) return false;
    return connectedMap.has(`${def.providerKey}::${def.table}`);
  }

  function getConnected(def: IntegrationDef) {
    if (!def.providerKey || !def.table) return null;
    return connectedMap.get(`${def.providerKey}::${def.table}`) ?? null;
  }

  /* Filter integrations */
  const filtered = useMemo(() => {
    let items = INTEGRATIONS;

    if (activeCategory === "popular") {
      items = items.filter((i) => i.popular);
    } else if (activeCategory !== "all") {
      items = items.filter((i) => i.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.category.replace(/_/g, " ").includes(q),
      );
    }

    // Sort: available first, then alphabetical
    return items.sort((a, b) => {
      if (a.status !== b.status) return a.status === "available" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [activeCategory, search]);

  /* ── Connection handlers ────────────────────────────────────────── */

  function getForm(id: string) {
    return formState[id] ?? {};
  }

  function updateForm(id: string, key: string, value: string) {
    setFormState((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  async function handleConnect(def: IntegrationDef) {
    // OAuth -- redirect
    if (def.connectionType === "oauth" && def.connectUrl) {
      window.location.href = def.connectUrl;
      return;
    }

    const form = getForm(def.id);
    setMsg(null);

    // Determine the API endpoint and payload based on table
    if (def.table === "ai_integrations") {
      if (!form.apiKey?.trim()) { setMsg({ id: def.id, text: "Enter an API key.", ok: false }); return; }
      try {
        const res = await fetch("/api/ai-integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: def.providerKey,
            apiKey: form.apiKey.trim(),
            modelPreference: form.modelPreference || undefined,
          }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as { error?: string }).error ?? "Failed"); }
        setConnectingId(null);
        setFormState((prev) => { const next = { ...prev }; delete next[def.id]; return next; });
        startTransition(() => { router.refresh(); setMsg({ id: def.id, text: "Connected!", ok: true }); });
      } catch (err) {
        setMsg({ id: def.id, text: err instanceof Error ? err.message : "Failed", ok: false });
      }
      return;
    }

    if (def.table === "payment_integrations") {
      if (!form.apiKey?.trim()) { setMsg({ id: def.id, text: "Enter an API key.", ok: false }); return; }
      try {
        const res = await fetch("/api/payment-integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: def.providerKey, apiKey: form.apiKey.trim() }),
        });
        if (!res.ok) throw new Error("Failed");
        setConnectingId(null);
        setFormState((prev) => { const next = { ...prev }; delete next[def.id]; return next; });
        startTransition(() => { router.refresh(); setMsg({ id: def.id, text: "Connected!", ok: true }); });
      } catch {
        setMsg({ id: def.id, text: "Failed to connect. Check your API key.", ok: false });
      }
      return;
    }

    if (def.table === "captcha_integrations") {
      if (!form.siteKey?.trim() || !form.secretKey?.trim()) {
        setMsg({ id: def.id, text: "Enter both site key and secret key.", ok: false }); return;
      }
      try {
        const res = await fetch("/api/captcha-integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: def.providerKey, siteKey: form.siteKey.trim(), secretKey: form.secretKey.trim() }),
        });
        if (!res.ok) throw new Error("Failed");
        setConnectingId(null);
        setFormState((prev) => { const next = { ...prev }; delete next[def.id]; return next; });
        startTransition(() => { router.refresh(); setMsg({ id: def.id, text: "Connected!", ok: true }); });
      } catch {
        setMsg({ id: def.id, text: "Failed to connect.", ok: false });
      }
      return;
    }

    if (def.table === "geocoding_integrations") {
      if (def.connectionType === "none") {
        // OpenStreetMap -- no setup needed, connect with empty key
        try {
          const res = await fetch("/api/geocoding-integrations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider: def.providerKey }),
          });
          if (!res.ok) throw new Error("Failed");
          setConnectingId(null);
          startTransition(() => { router.refresh(); setMsg({ id: def.id, text: "Connected!", ok: true }); });
        } catch {
          setMsg({ id: def.id, text: "Failed to connect.", ok: false });
        }
        return;
      }
      if (!form.apiKey?.trim()) { setMsg({ id: def.id, text: "Enter an API key.", ok: false }); return; }
      try {
        const res = await fetch("/api/geocoding-integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: def.providerKey, apiKey: form.apiKey.trim() }),
        });
        if (!res.ok) throw new Error("Failed");
        setConnectingId(null);
        setFormState((prev) => { const next = { ...prev }; delete next[def.id]; return next; });
        startTransition(() => { router.refresh(); setMsg({ id: def.id, text: "Connected!", ok: true }); });
      } catch {
        setMsg({ id: def.id, text: "Failed to connect.", ok: false });
      }
    }
  }

  async function handleDisconnect(def: IntegrationDef) {
    if (!confirm(`Disconnect ${def.name}? Features using this integration will stop working.`)) return;
    setMsg(null);

    try {
      if (def.table === "cloud_integrations") {
        const res = await fetch(`/api/integrations/${def.providerKey}/disconnect`, { method: "POST" });
        if (!res.ok) throw new Error("Failed");
      } else if (def.table === "ai_integrations") {
        const res = await fetch("/api/ai-integrations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: def.providerKey }),
        });
        if (!res.ok) throw new Error("Failed");
      } else if (def.table === "payment_integrations") {
        const res = await fetch("/api/payment-integrations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: def.providerKey }),
        });
        if (!res.ok) throw new Error("Failed");
      } else if (def.table === "captcha_integrations") {
        const res = await fetch("/api/captcha-integrations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: def.providerKey }),
        });
        if (!res.ok) throw new Error("Failed");
      } else if (def.table === "geocoding_integrations") {
        const res = await fetch("/api/geocoding-integrations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: def.providerKey }),
        });
        if (!res.ok) throw new Error("Failed");
      } else if (def.table === "sheets_connections") {
        const res = await fetch("/api/sheets/disconnect", { method: "POST" });
        if (!res.ok) throw new Error("Failed");
      }
      startTransition(() => {
        router.refresh();
        setMsg({ id: def.id, text: `${def.name} disconnected.`, ok: true });
      });
    } catch {
      setMsg({ id: def.id, text: "Failed to disconnect.", ok: false });
    }
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 relative">
      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border transition-all animate-in slide-in-from-top-2 fade-in duration-300 ${
          toast.ok
            ? "bg-tertiary/10 border-tertiary/20 text-tertiary"
            : "bg-error/10 border-error/20 text-error"
        }`}>
          <i className={`fa-solid ${toast.ok ? "fa-circle-check" : "fa-circle-xmark"}`} />
          <span className="text-sm font-medium">{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        </div>
      )}

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className="lg:w-56 xl:w-64 shrink-0">
        <nav className="space-y-0.5 lg:sticky lg:top-8">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] ?? 0;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id as typeof activeCategory); setSearch(""); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-on-surface-variant/70 hover:bg-surface-container-high/50 hover:text-on-surface"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <i className={`${cat.icon} text-xs w-4 text-center ${isActive ? "text-primary" : "text-on-surface-variant/40"}`} />
                  <span className="truncate">{cat.label}</span>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-primary/15 text-primary" : "text-on-surface-variant/40"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Search bar */}
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all integrations..."
            className="w-full pl-11 pr-4 py-3 text-sm bg-surface-container-lowest border border-outline-variant/15 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 focus:border-primary/30 outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface transition-colors"
            >
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-on-surface-variant/50 font-medium">
            {filtered.length} integration{filtered.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </p>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <i className="fa-solid fa-plug text-3xl text-on-surface-variant/20 mb-3" />
            <p className="text-sm text-on-surface-variant/50">No integrations found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((def) => {
              const conn = getConnected(def);
              const connected = isConnected(def);
              const isExpanded = connectingId === def.id;
              const isComingSoon = def.status === "coming_soon";
              const isAutomation = def.id === "zapier" || def.id === "make";
              const form = getForm(def.id);
              const cardMsg = msg?.id === def.id ? msg : null;

              return (
                <div
                  key={def.id}
                  className={`rounded-xl border p-5 transition-all ${
                    connected
                      ? "border-tertiary/20 bg-tertiary/[0.03]"
                      : isComingSoon
                        ? "border-outline-variant/8 bg-surface-container-lowest/20 opacity-75"
                        : "border-outline-variant/10 bg-surface-container-lowest/30 hover:border-primary/20"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      connected ? "bg-tertiary/10" : isComingSoon ? "bg-surface-container-high/30" : "bg-surface-container-high/50"
                    }`}>
                      <i className={`${def.icon} text-lg ${
                        connected ? def.color : isComingSoon ? "text-on-surface-variant/25" : "text-on-surface-variant/40"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-on-surface truncate">{def.name}</h3>
                        {isComingSoon && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40 bg-surface-container-high px-1.5 py-0.5 rounded-full shrink-0">
                            Soon
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-on-surface-variant/60 mt-0.5 leading-relaxed">{def.description}</p>
                      {connected && (
                        <p className="text-[10px] text-tertiary font-semibold uppercase tracking-widest mt-1.5">
                          <i className="fa-solid fa-circle-check text-[8px] mr-1" />
                          Connected
                          {conn?.account_email && (
                            <span className="normal-case tracking-normal font-normal text-on-surface-variant/50 ml-1">
                              ({conn.account_email})
                            </span>
                          )}
                        </p>
                      )}
                      {connected && conn?.model_preference && (
                        <p className="text-[10px] text-on-surface-variant/50 mt-0.5">
                          Model: {conn.model_preference}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {/* Coming soon -- no actions */}
                    {isComingSoon && (
                      <div className="px-3 py-2 text-center text-[11px] text-on-surface-variant/40 bg-surface-container-high/30 rounded-lg">
                        Coming soon -- we&apos;re building native support.
                      </div>
                    )}

                    {/* Automation (Zapier/Make) -- link to Send To */}
                    {isAutomation && !isComingSoon && (
                      <div className="px-3 py-2 text-center text-[11px] text-on-surface-variant/60 bg-surface-container-high/30 rounded-lg">
                        <i className="fa-solid fa-paper-plane text-[9px] mr-1.5 text-primary/60" />
                        Configure in the <span className="font-bold text-primary">Send To</span> tab on each form.
                      </div>
                    )}

                    {/* Connected -- show disconnect */}
                    {connected && !isAutomation && (
                      <>
                        {def.apiKeyUrl && (
                          <a
                            href={def.apiKeyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-[11px] font-medium text-on-surface-variant/60 hover:text-primary transition-colors"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                            {def.apiKeyLabel ?? "Dashboard"}
                          </a>
                        )}
                        <button
                          onClick={() => handleDisconnect(def)}
                          disabled={pending}
                          className="w-full px-4 py-2 text-xs font-bold text-error/70 border border-error/15 rounded-lg hover:bg-error/5 hover:text-error transition-all disabled:opacity-50"
                        >
                          Disconnect
                        </button>
                      </>
                    )}

                    {/* Not connected + OAuth -- show connect button */}
                    {!connected && !isComingSoon && !isAutomation && def.connectionType === "oauth" && def.connectUrl && (
                      <>
                        <a
                          href={def.connectUrl}
                          className="block w-full px-4 py-2 text-xs font-bold text-center text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-all"
                        >
                          Connect {def.name}
                        </a>
                      </>
                    )}

                    {/* Not connected + API key -- show expand/form */}
                    {!connected && !isComingSoon && !isAutomation && def.connectionType === "api_key" && (
                      <>
                        {!isExpanded ? (
                          <button
                            onClick={() => { setConnectingId(def.id); setMsg(null); }}
                            className="w-full px-4 py-2 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-all"
                          >
                            Connect {def.name}
                          </button>
                        ) : (
                          <div className="space-y-2.5 pt-1">
                            {def.apiKeyUrl && (
                              <a
                                href={def.apiKeyUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                              >
                                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                                {def.apiKeyLabel ?? "Get API key"}
                              </a>
                            )}

                            {/* Extra fields (captcha site key / secret key) */}
                            {def.extraFields?.map((f) => (
                              <div key={f.key} className="relative">
                                <label className="block text-[10px] font-bold text-on-surface-variant/60 mb-1 uppercase tracking-widest">{f.label}</label>
                                <input
                                  type={f.type === "password" && !showKey[`${def.id}_${f.key}`] ? "password" : "text"}
                                  placeholder={f.placeholder}
                                  value={form[f.key] ?? ""}
                                  onChange={(e) => updateForm(def.id, f.key, e.target.value)}
                                  className="w-full px-3 py-2 text-xs bg-surface-container-high/30 border border-outline-variant/10 rounded-lg text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 font-mono"
                                />
                              </div>
                            ))}

                            {/* Standard API key input (if no extra fields) */}
                            {!def.extraFields?.length && (
                              <div className="relative">
                                <input
                                  type={showKey[def.id] ? "text" : "password"}
                                  placeholder="API Key"
                                  value={form.apiKey ?? ""}
                                  onChange={(e) => updateForm(def.id, "apiKey", e.target.value)}
                                  className="w-full px-3 py-2 pr-9 text-xs bg-surface-container-high/30 border border-outline-variant/10 rounded-lg text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowKey((p) => ({ ...p, [def.id]: !p[def.id] }))}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant/70 transition-colors"
                                >
                                  <i className={`fa-solid ${showKey[def.id] ? "fa-eye-slash" : "fa-eye"} text-[10px]`} />
                                </button>
                              </div>
                            )}

                            {/* Model selector for AI */}
                            {def.models && (
                              <select
                                value={form.modelPreference ?? ""}
                                onChange={(e) => updateForm(def.id, "modelPreference", e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-surface-container-high/30 border border-outline-variant/10 rounded-lg text-on-surface focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
                              >
                                <option value="">Default model</option>
                                {def.models.map((m) => (
                                  <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                              </select>
                            )}

                            {cardMsg && (
                              <p className={`text-[11px] font-medium ${cardMsg.ok ? "text-tertiary" : "text-error"}`}>
                                {cardMsg.text}
                              </p>
                            )}

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConnect(def)}
                                disabled={pending}
                                className="flex-1 px-3 py-2 text-xs font-bold text-on-primary bg-primary rounded-lg disabled:opacity-40 transition-all"
                              >
                                Connect
                              </button>
                              <button
                                onClick={() => { setConnectingId(null); setMsg(null); }}
                                className="px-3 py-2 text-xs font-bold text-on-surface-variant border border-outline-variant/15 rounded-lg hover:border-primary/20 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Not connected + no setup (OSM) */}
                    {!connected && !isComingSoon && !isAutomation && def.connectionType === "none" && def.table && (
                      <button
                        onClick={() => handleConnect(def)}
                        disabled={pending}
                        className="w-full px-4 py-2 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-all disabled:opacity-50"
                      >
                        Enable {def.name}
                      </button>
                    )}

                    {/* Status message for this card */}
                    {cardMsg && !isExpanded && (
                      <p className={`text-[11px] font-medium ${cardMsg.ok ? "text-tertiary" : "text-error"}`}>
                        {cardMsg.text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
