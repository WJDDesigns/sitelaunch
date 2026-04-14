"use client";

import { useState, useTransition } from "react";
import { verifyDomainAction, type DomainCheckResult } from "./domain-actions";

interface Props {
  partnerId: string;
  currentDomain: string | null;
  saveAction: (formData: FormData) => Promise<void>;
  cnameTarget?: string;
}

const INPUT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none transition-all duration-200";

const STATUS_STYLES: Record<
  DomainCheckResult["status"],
  { icon: string; color: string; bg: string; border: string }
> = {
  verified: {
    icon: "fa-circle-check",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  pending: {
    icon: "fa-clock",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  misconfigured: {
    icon: "fa-triangle-exclamation",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  error: {
    icon: "fa-circle-xmark",
    color: "text-error",
    bg: "bg-error/10",
    border: "border-error/20",
  },
};

const SITELAUNCH_CNAME = "cname.mysitelaunch.com";

export default function DomainSetup({
  partnerId,
  currentDomain,
  saveAction,
  cnameTarget = SITELAUNCH_CNAME,
}: Props) {
  const [domain, setDomain] = useState(currentDomain ?? "");
  const [result, setResult] = useState<DomainCheckResult | null>(null);
  const [verifyPending, startVerifyTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const hasDomain = !!currentDomain;
  const domainChanged = domain.trim().toLowerCase() !== (currentDomain ?? "").toLowerCase();

  function handleSave() {
    setSaveMsg(null);
    setResult(null);
    const fd = new FormData();
    fd.set("custom_domain", domain.trim());
    startSaveTransition(async () => {
      try {
        await saveAction(fd);
        setSaveMsg("Domain saved!");
      } catch (e: unknown) {
        setSaveMsg(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

  function handleRemove() {
    setSaveMsg(null);
    setResult(null);
    setDomain("");
    const fd = new FormData();
    fd.set("custom_domain", "");
    startSaveTransition(async () => {
      try {
        await saveAction(fd);
        setSaveMsg("Domain removed.");
      } catch (e: unknown) {
        setSaveMsg(e instanceof Error ? e.message : "Failed to remove.");
      }
    });
  }

  function handleVerify() {
    if (!currentDomain) return;
    startVerifyTransition(async () => {
      const res = await verifyDomainAction(partnerId, currentDomain);
      setResult(res);
    });
  }

  const style = result ? STATUS_STYLES[result.status] : null;

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/15 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          <i className="fa-solid fa-globe mr-2 text-primary/60" />
          Custom Domain
        </h2>
        {hasDomain && (
          <span className="text-xs font-mono text-on-surface-variant/60">{currentDomain}</span>
        )}
      </div>

      {/* Domain input */}
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
            Domain
          </span>
          <span className="block text-xs text-on-surface-variant/60 mt-0.5 mb-1.5">
            Use a subdomain like <span className="font-mono">onboard.yourdomain.com</span> for your client portal.
          </span>
          <input
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              setSaveMsg(null);
            }}
            className={INPUT_CLS}
            placeholder="onboard.yourdomain.com"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={savePending || !domain.trim() || !domainChanged}
            className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] disabled:opacity-50 transition-all"
          >
            {savePending ? "Saving..." : domainChanged ? "Save domain" : "Saved"}
          </button>
          {hasDomain && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={savePending}
              className="px-4 py-2.5 text-sm font-bold text-error/70 hover:text-error transition-colors"
            >
              Remove
            </button>
          )}
          {saveMsg && (
            <span className={`text-xs font-medium ${saveMsg.includes("saved") || saveMsg.includes("removed") ? "text-tertiary" : "text-error"}`}>
              {saveMsg}
            </span>
          )}
        </div>
      </div>

      {/* Setup instructions — shown only when a domain is set */}
      {hasDomain && (
        <>
          <div className="border-t border-outline-variant/10 pt-5 space-y-4">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              To use <span className="font-semibold text-on-surface">{currentDomain}</span> as your
              onboarding portal, configure a CNAME record with your DNS provider.
            </p>

            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <div>
                  <p className="text-on-surface font-medium">Log in to your DNS provider</p>
                  <p className="text-on-surface-variant/60 text-xs mt-0.5">
                    This is typically where you registered your domain (GoDaddy, Cloudflare, Namecheap, etc.)
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <div>
                  <p className="text-on-surface font-medium">Add a CNAME record</p>
                  <div className="mt-2 rounded-xl bg-surface-container-lowest border border-outline-variant/10 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-outline-variant/10">
                          <th className="text-left px-4 py-2 text-on-surface-variant/60 font-semibold uppercase tracking-widest">Type</th>
                          <th className="text-left px-4 py-2 text-on-surface-variant/60 font-semibold uppercase tracking-widest">Name / Host</th>
                          <th className="text-left px-4 py-2 text-on-surface-variant/60 font-semibold uppercase tracking-widest">Value / Target</th>
                          <th className="text-left px-4 py-2 text-on-surface-variant/60 font-semibold uppercase tracking-widest">TTL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-2.5 font-mono text-on-surface font-bold">CNAME</td>
                          <td className="px-4 py-2.5 font-mono text-on-surface">{currentDomain.split(".")[0]}</td>
                          <td className="px-4 py-2.5 font-mono text-primary font-bold">{cnameTarget}</td>
                          <td className="px-4 py-2.5 font-mono text-on-surface-variant/60">Auto / 300</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-on-surface-variant/60 text-xs mt-1.5">
                    If your provider asks for a hostname, enter <span className="font-mono text-on-surface">{currentDomain.split(".")[0]}</span>.
                    If using Cloudflare, set the proxy status to <span className="font-semibold text-on-surface">DNS only</span> (grey cloud).
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <div>
                  <p className="text-on-surface font-medium">Verify your domain</p>
                  <p className="text-on-surface-variant/60 text-xs mt-0.5">
                    DNS changes can take anywhere from a few minutes to 48 hours to propagate. Click below to check the status.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Verify button + result */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifyPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm hover:bg-surface-container-highest disabled:opacity-50 transition-all"
            >
              {verifyPending ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-xs" />
                  Checking DNS...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-magnifying-glass text-xs text-primary" />
                  Verify DNS configuration
                </>
              )}
            </button>

            {result && style && (
              <div className={`flex items-start gap-3 px-4 py-3 rounded-xl ${style.bg} border ${style.border}`}>
                <i className={`fa-solid ${style.icon} ${style.color} mt-0.5`} />
                <div className="text-sm text-on-surface leading-relaxed">
                  {result.message}
                </div>
              </div>
            )}
          </div>

          {/* Troubleshooting tips */}
          <details className="group">
            <summary className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-widest cursor-pointer hover:text-on-surface-variant transition-colors flex items-center gap-2">
              <i className="fa-solid fa-chevron-right text-[10px] group-open:rotate-90 transition-transform" />
              Troubleshooting
            </summary>
            <div className="mt-3 space-y-2 text-xs text-on-surface-variant/80 leading-relaxed pl-5">
              <p>
                <span className="font-semibold text-on-surface-variant">Record not found?</span>{" "}
                DNS propagation can take up to 48 hours. Try again later.
              </p>
              <p>
                <span className="font-semibold text-on-surface-variant">Using Cloudflare?</span>{" "}
                Make sure the CNAME proxy is set to &ldquo;DNS only&rdquo; (grey cloud icon), not &ldquo;Proxied&rdquo; (orange cloud).
              </p>
              <p>
                <span className="font-semibold text-on-surface-variant">Subdomain vs. root?</span>{" "}
                CNAME records work for subdomains (e.g. <span className="font-mono">onboard.example.com</span>).
                For root/apex domains, you may need an ALIAS or ANAME record depending on your provider.
              </p>
              <p>
                <span className="font-semibold text-on-surface-variant">Still stuck?</span>{" "}
                Contact support and we&apos;ll help you get set up.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
