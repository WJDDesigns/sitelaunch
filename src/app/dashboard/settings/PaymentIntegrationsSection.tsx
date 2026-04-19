"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const PAYMENT_PROVIDERS = [
  {
    id: "stripe",
    name: "Stripe",
    icon: "fa-brands fa-stripe",
    color: "text-[#635bff]",
    description: "Accept credit cards, Apple Pay, Google Pay & more",
    url: "https://dashboard.stripe.com/apikeys",
    urlLabel: "Dashboard",
    /** Stripe supports OAuth Connect -- no manual key needed */
    oauth: true,
    oauthUrl: "/api/stripe/connect",
  },
  {
    id: "paypal",
    name: "PayPal",
    icon: "fa-brands fa-paypal",
    color: "text-[#003087]",
    description: "Accept PayPal balance, credit & debit cards",
    url: "https://developer.paypal.com/dashboard/applications/live",
    urlLabel: "Get Client ID",
    oauth: false,
  },
  {
    id: "square",
    name: "Square",
    icon: "fa-solid fa-square",
    color: "text-[#006aff]",
    description: "In-person and online payments, invoicing",
    url: "https://developer.squareup.com/apps",
    urlLabel: "Get Application ID",
    oauth: false,
  },
] as const;

interface PaymentIntegration {
  id: string;
  provider: string;
  connected_at: string;
  account_email?: string;
  stripe_account_id?: string;
}

export default function PaymentIntegrationsSection({
  integrations,
}: {
  integrations: PaymentIntegration[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const connectedMap = new Map(integrations.map((i) => [i.provider, i]));

  async function handleConnect(provider: string) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/payment-integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      if (!res.ok) throw new Error("Failed");
      setApiKey("");
      setEditingProvider(null);
      startTransition(() => {
        router.refresh();
        setMsg(`${provider} connected successfully.`);
      });
    } catch {
      setMsg("Failed to connect. Check your API key and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect(provider: string) {
    const name = PAYMENT_PROVIDERS.find((p) => p.id === provider)?.name ?? provider;
    if (!confirm(`Disconnect ${name}? Payment fields using this provider will stop working.`)) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/payment-integrations", {
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
        Payments
      </h2>
      <p className="text-sm text-on-surface-variant/60 mb-6">
        Connect a payment provider to collect payments through your forms.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PAYMENT_PROVIDERS.map((provider) => {
          const integration = connectedMap.get(provider.id);
          const isConnected = !!integration;
          const isEditing = editingProvider === provider.id;

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
                      {integration?.account_email && (
                        <span className="normal-case tracking-normal font-normal text-on-surface-variant/50 ml-1">
                          ({integration.account_email})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* OAuth providers (Stripe Connect) */}
              {provider.oauth && !isConnected && (
                <div className="space-y-2">
                  <a
                    href={provider.oauthUrl}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90"
                    style={{ backgroundColor: "#635bff" }}
                  >
                    <i className="fa-brands fa-stripe text-base" />
                    Connect with Stripe
                  </a>
                  <p className="text-[10px] text-on-surface-variant/40 text-center">
                    Secure OAuth connection. No API keys needed.
                  </p>
                </div>
              )}

              {/* OAuth providers -- connected state */}
              {provider.oauth && isConnected && (
                <div className="space-y-2">
                  <a
                    href={provider.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                    {provider.urlLabel}
                  </a>
                  <button
                    onClick={() => handleDisconnect(provider.id)}
                    disabled={pending || saving}
                    className="w-full px-4 py-2 text-xs font-bold text-error/70 border border-error/15 rounded-lg hover:bg-error/5 hover:text-error transition-all disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {/* Non-OAuth providers -- API key flow */}
              {!provider.oauth && isEditing && (
                <div className="space-y-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`${provider.name} API key...`}
                    className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConnect(provider.id)}
                      disabled={!apiKey || saving}
                      className="flex-1 px-3 py-2 text-xs font-bold text-on-primary bg-primary rounded-lg disabled:opacity-40"
                    >
                      {saving ? "Connecting..." : "Connect"}
                    </button>
                    <button
                      onClick={() => { setEditingProvider(null); setApiKey(""); }}
                      className="px-3 py-2 text-xs font-bold text-on-surface-variant border border-outline-variant/15 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!provider.oauth && !isEditing && (
                <div className="space-y-2">
                  <a
                    href={provider.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                    {provider.urlLabel}
                  </a>
                  {isConnected ? (
                    <button
                      onClick={() => handleDisconnect(provider.id)}
                      disabled={pending || saving}
                      className="w-full px-4 py-2 text-xs font-bold text-error/70 border border-error/15 rounded-lg hover:bg-error/5 hover:text-error transition-all disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingProvider(provider.id)}
                      className="w-full px-4 py-2 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-all"
                    >
                      Connect {provider.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {msg && (
        <p className={`text-xs font-medium mt-4 ${msg.includes("Failed") ? "text-error" : "text-tertiary"}`}>
          {msg}
        </p>
      )}
    </section>
  );
}
