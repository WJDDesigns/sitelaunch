"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PROVIDER_META, ALL_PROVIDERS, type CloudProvider } from "@/lib/cloud/providers";

interface Integration {
  id: string;
  provider: string;
  account_email: string | null;
  connected_at: string;
}

export default function IntegrationsSection({ integrations }: { integrations: Integration[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const connectedMap = new Map(integrations.map((i) => [i.provider, i]));

  async function handleDisconnect(provider: CloudProvider) {
    if (!confirm(`Disconnect ${PROVIDER_META[provider].displayName}? Any form fields targeting this provider will stop syncing.`)) return;
    setDisconnecting(provider);
    setMsg(null);
    try {
      const res = await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      startTransition(() => {
        router.refresh();
        setMsg(`${PROVIDER_META[provider].displayName} disconnected.`);
      });
    } catch {
      setMsg("Failed to disconnect. Please try again.");
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <section className="rounded-2xl border border-outline-variant/[0.08] bg-surface-container/50 shadow-xl shadow-black/10 p-6 md:p-8">
      <h2 className="text-lg font-bold font-headline text-on-surface mb-1">
        Cloud Storage
      </h2>
      <p className="text-sm text-on-surface-variant/60 mb-6">
        Connect your cloud storage so uploaded files are automatically sent to the folder you choose per form field.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ALL_PROVIDERS.map((provider) => {
          const meta = PROVIDER_META[provider];
          const integration = connectedMap.get(provider);
          const isConnected = !!integration;

          return (
            <div
              key={provider}
              className={`rounded-xl border p-5 transition-all ${
                isConnected
                  ? "border-tertiary/20 bg-tertiary/[0.03]"
                  : "border-outline-variant/10 bg-surface-container-lowest/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isConnected ? "bg-tertiary/10" : "bg-surface-container-high/50"
                  }`}>
                    <i className={`${meta.icon} text-lg ${isConnected ? meta.color : "text-on-surface-variant/40"}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">{meta.displayName}</h3>
                    {isConnected && integration.account_email && (
                      <p className="text-xs text-on-surface-variant/60 mt-0.5">{integration.account_email}</p>
                    )}
                    {isConnected && (
                      <p className="text-[10px] text-tertiary font-semibold uppercase tracking-widest mt-1">
                        <i className="fa-solid fa-circle-check text-[8px] mr-1" />
                        Connected
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {isConnected ? (
                  <button
                    onClick={() => handleDisconnect(provider)}
                    disabled={pending || disconnecting === provider}
                    className="w-full px-4 py-2 text-xs font-bold text-error/70 border border-error/15 rounded-lg hover:bg-error/5 hover:text-error transition-all disabled:opacity-50"
                  >
                    {disconnecting === provider ? "Disconnecting..." : "Disconnect"}
                  </button>
                ) : (
                  <a
                    href={`/api/integrations/${provider}/connect`}
                    className="block w-full px-4 py-2 text-xs font-bold text-center text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-all"
                  >
                    Connect {meta.displayName}
                  </a>
                )}
              </div>
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
