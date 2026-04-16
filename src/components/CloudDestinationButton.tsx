"use client";

import { useState, useEffect } from "react";
import { PROVIDER_META, type CloudProvider } from "@/lib/cloud/providers";
import CloudFolderPicker from "./CloudFolderPicker";

interface CloudDestination {
  provider: CloudProvider;
  folderId: string;
  folderPath: string;
}

interface ConnectedProvider {
  id: string;
  provider: string;
  account_email: string | null;
}

interface Props {
  onSelect: (destination: CloudDestination) => void;
}

export default function CloudDestinationButton({ onSelect }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);
  const [connected, setConnected] = useState<ConnectedProvider[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showPicker) return;
    setLoading(true);
    fetch("/api/integrations/connected")
      .then((r) => r.json())
      .then((data) => setConnected(data.integrations ?? []))
      .catch(() => setConnected([]))
      .finally(() => setLoading(false));
  }, [showPicker]);

  function handleProviderSelect(provider: CloudProvider) {
    setSelectedProvider(provider);
  }

  function handleFolderSelect(folderId: string, folderPath: string) {
    if (!selectedProvider) return;
    onSelect({ provider: selectedProvider, folderId, folderPath });
    setShowPicker(false);
    setSelectedProvider(null);
  }

  if (selectedProvider) {
    return (
      <CloudFolderPicker
        provider={selectedProvider}
        onSelect={handleFolderSelect}
        onCancel={() => {
          setSelectedProvider(null);
          setShowPicker(false);
        }}
      />
    );
  }

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-primary border border-dashed border-primary/25 rounded-lg hover:bg-primary/5 hover:border-primary/40 transition-all"
      >
        <i className="fa-solid fa-cloud-arrow-up text-[11px]" />
        Send to cloud storage
      </button>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm" onClick={() => setShowPicker(false)}>
          <div className="bg-surface-container rounded-2xl border border-outline-variant/15 w-full max-w-sm shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-on-surface">Choose a provider</h2>
              <button onClick={() => setShowPicker(false)} className="text-on-surface-variant/60 hover:text-on-surface">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {loading ? (
              <div className="py-6 text-center text-sm text-on-surface-variant/60">
                <i className="fa-solid fa-spinner fa-spin mr-2" />
                Loading...
              </div>
            ) : connected.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-on-surface-variant/60 mb-3">
                  No cloud storage connected yet.
                </p>
                <a
                  href="/dashboard/settings?tab=integrations"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Go to Settings to connect one
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                {connected.map((c) => {
                  const provider = c.provider as CloudProvider;
                  const meta = PROVIDER_META[provider];
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleProviderSelect(provider)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-outline-variant/10 hover:border-primary/20 hover:bg-primary/[0.03] transition-all text-left"
                    >
                      <i className={`${meta.icon} text-lg ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-on-surface">{meta.displayName}</div>
                        {c.account_email && (
                          <div className="text-xs text-on-surface-variant/60 truncate">{c.account_email}</div>
                        )}
                      </div>
                      <i className="fa-solid fa-chevron-right text-[10px] text-on-surface-variant/30" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
