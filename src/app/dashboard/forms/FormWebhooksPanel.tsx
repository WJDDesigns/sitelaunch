"use client";

import { useState, useTransition } from "react";
import type { FormSchema } from "@/lib/forms";
import {
  saveWebhookAction,
  deleteWebhookAction,
  testWebhookAction,
  getWebhookDeliveries,
} from "./webhook-actions";

interface FieldMapping {
  fieldId: string;
  key: string;
}

interface Webhook {
  id: string;
  name: string;
  provider: string;
  webhook_url: string;
  is_enabled: boolean;
  field_map: FieldMapping[] | null;
  signing_secret: string | null;
  created_at: string;
}

interface Delivery {
  id: string;
  status: string;
  status_code: number | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

const PROVIDERS = [
  { id: "zapier", label: "Zapier", icon: "fa-bolt", color: "text-orange-400" },
  { id: "make", label: "Make", icon: "fa-gear", color: "text-purple-400" },
  { id: "custom", label: "Custom Webhook", icon: "fa-code", color: "text-blue-400" },
];

export default function FormWebhooksPanel({
  formId,
  schema,
  initialWebhooks,
}: {
  formId: string;
  schema: FormSchema;
  initialWebhooks: Webhook[];
}) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks);
  const [editing, setEditing] = useState<Partial<Webhook> | null>(null);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [showDeliveries, setShowDeliveries] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Flatten all form fields for mapping UI
  const allFields = schema.steps.flatMap((s) =>
    s.fields.map((f) => ({ id: f.id, label: f.label, stepTitle: s.title })),
  );

  function handleNew(provider: string) {
    const prov = PROVIDERS.find((p) => p.id === provider);
    setEditing({
      provider,
      name: prov?.label ?? "Webhook",
      webhook_url: "",
      is_enabled: true,
      field_map: null,
      signing_secret: null,
    });
    setError(null);
    setTestResult(null);
  }

  function handleEdit(wh: Webhook) {
    setEditing({ ...wh });
    setError(null);
    setTestResult(null);
  }

  function handleSave() {
    if (!editing) return;
    setError(null);
    startSave(async () => {
      const result = await saveWebhookAction(formId, {
        id: editing.id,
        name: editing.name ?? "Webhook",
        provider: editing.provider ?? "zapier",
        webhookUrl: editing.webhook_url ?? "",
        isEnabled: editing.is_enabled ?? true,
        fieldMap: editing.field_map ?? null,
        signingSecret: editing.signing_secret ?? undefined,
      });
      if (result.ok) {
        // Refresh list
        if (editing.id) {
          setWebhooks((prev) =>
            prev.map((w) =>
              w.id === editing.id
                ? { ...w, ...editing, id: w.id } as Webhook
                : w,
            ),
          );
        } else {
          setWebhooks((prev) => [
            ...prev,
            {
              id: result.id!,
              name: editing.name ?? "Webhook",
              provider: editing.provider ?? "zapier",
              webhook_url: editing.webhook_url ?? "",
              is_enabled: editing.is_enabled ?? true,
              field_map: editing.field_map ?? null,
              signing_secret: editing.signing_secret ?? null,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        setEditing(null);
      } else {
        setError(result.error ?? "Failed to save.");
      }
    });
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      const result = await deleteWebhookAction(id, formId);
      if (result.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
        if (editing?.id === id) setEditing(null);
      }
    });
  }

  function handleTest(id: string) {
    setTestResult(null);
    startTest(async () => {
      const result = await testWebhookAction(id);
      if (result.ok) {
        setTestResult({ ok: true, msg: `Success (${result.statusCode})` });
      } else {
        setTestResult({ ok: false, msg: result.error ?? `Failed (${result.statusCode})` });
      }
    });
  }

  async function handleViewDeliveries(webhookId: string) {
    if (showDeliveries === webhookId) {
      setShowDeliveries(null);
      return;
    }
    setShowDeliveries(webhookId);
    const logs = await getWebhookDeliveries(webhookId);
    setDeliveries(logs);
  }

  // Field mapping helpers
  function toggleFieldMapping() {
    if (!editing) return;
    if (editing.field_map) {
      setEditing({ ...editing, field_map: null });
    } else {
      // Initialize with all fields
      setEditing({
        ...editing,
        field_map: allFields.map((f) => ({
          fieldId: f.id,
          key: f.id,
        })),
      });
    }
  }

  function updateMapping(fieldId: string, key: string) {
    if (!editing?.field_map) return;
    setEditing({
      ...editing,
      field_map: editing.field_map.map((m) =>
        m.fieldId === fieldId ? { ...m, key } : m,
      ),
    });
  }

  function removeMapping(fieldId: string) {
    if (!editing?.field_map) return;
    setEditing({
      ...editing,
      field_map: editing.field_map.filter((m) => m.fieldId !== fieldId),
    });
  }

  function addMapping(fieldId: string) {
    if (!editing) return;
    const existing = editing.field_map ?? [];
    if (existing.some((m) => m.fieldId === fieldId)) return;
    setEditing({
      ...editing,
      field_map: [...existing, { fieldId, key: fieldId }],
    });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold font-headline text-on-surface">Webhooks</h2>
          <p className="text-sm text-on-surface-variant/60 mt-1">
            Send submission data to Zapier, Make, or any custom webhook when a form is submitted.
          </p>
        </div>

        {/* Add new webhook */}
        {!editing && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleNew(p.id)}
                className="glass-panel rounded-xl border border-outline-variant/15 p-4 hover:border-primary/30 transition-all group text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center">
                    <i className={`fa-solid ${p.icon} ${p.color}`} />
                  </div>
                  <span className="text-sm font-bold text-on-surface">{p.label}</span>
                </div>
                <p className="text-[11px] text-on-surface-variant/60">
                  {p.id === "zapier" && "Connect to 7,000+ apps via Zapier."}
                  {p.id === "make" && "Connect to Make (Integromat) scenarios."}
                  {p.id === "custom" && "POST to any URL with HMAC signing."}
                </p>
                <span className="text-xs text-primary font-bold mt-2 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                  Add <i className="fa-solid fa-plus text-[10px] ml-1" />
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Existing webhooks list */}
        {!editing && webhooks.length > 0 && (
          <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant/10">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Active Webhooks
              </h3>
            </div>
            <div className="divide-y divide-outline-variant/5">
              {webhooks.map((wh) => {
                const prov = PROVIDERS.find((p) => p.id === wh.provider);
                return (
                  <div key={wh.id}>
                    <div className="px-5 py-4 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
                        <i className={`fa-solid ${prov?.icon ?? "fa-bolt"} ${prov?.color ?? "text-primary"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-on-surface truncate">{wh.name}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                            wh.is_enabled
                              ? "text-tertiary bg-tertiary/10"
                              : "text-on-surface-variant/40 bg-surface-container-high"
                          }`}>
                            {wh.is_enabled ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant/40 truncate mt-0.5">
                          {wh.webhook_url}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleTest(wh.id)}
                          disabled={testing}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 hover:text-primary transition-all disabled:opacity-50"
                          title="Send test"
                        >
                          <i className="fa-solid fa-paper-plane text-[9px] mr-1" />
                          Test
                        </button>
                        <button
                          onClick={() => handleViewDeliveries(wh.id)}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 hover:text-primary transition-all"
                          title="View delivery log"
                        >
                          <i className="fa-solid fa-list text-[9px] mr-1" />
                          Log
                        </button>
                        <button
                          onClick={() => handleEdit(wh)}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/10 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(wh.id)}
                          disabled={deleting}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-error border border-error/20 rounded-lg hover:bg-error/10 transition-all disabled:opacity-50"
                        >
                          <i className="fa-solid fa-trash text-[9px]" />
                        </button>
                      </div>
                    </div>

                    {/* Delivery log */}
                    {showDeliveries === wh.id && (
                      <div className="px-5 pb-4">
                        <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 overflow-hidden">
                          <div className="px-4 py-2 border-b border-outline-variant/10">
                            <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                              Recent Deliveries
                            </span>
                          </div>
                          {deliveries.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-on-surface-variant/40">
                              No deliveries yet. Submit a form or use the Test button.
                            </div>
                          ) : (
                            <div className="divide-y divide-outline-variant/5">
                              {deliveries.map((d) => (
                                <div key={d.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                                    d.status === "success" ? "bg-tertiary" : "bg-error"
                                  }`} />
                                  <span className="font-medium text-on-surface">
                                    {d.status === "success" ? "OK" : "Failed"}
                                    {d.status_code && ` (${d.status_code})`}
                                  </span>
                                  {d.duration_ms != null && (
                                    <span className="text-on-surface-variant/40">{d.duration_ms}ms</span>
                                  )}
                                  {d.error_message && (
                                    <span className="text-error/60 truncate flex-1">{d.error_message}</span>
                                  )}
                                  <span className="text-on-surface-variant/30 shrink-0">
                                    {new Date(d.created_at).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Test result toast */}
        {testResult && (
          <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            testResult.ok
              ? "bg-tertiary/10 border-tertiary/20 text-tertiary"
              : "bg-error/10 border-error/20 text-error"
          }`}>
            <i className={`fa-solid ${testResult.ok ? "fa-circle-check" : "fa-circle-xmark"} mr-2`} />
            {testResult.msg}
          </div>
        )}

        {/* Editor form */}
        {editing && (
          <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {editing.id ? "Edit Webhook" : "New Webhook"}
              </h3>
              <button
                onClick={() => { setEditing(null); setError(null); }}
                className="text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Provider selector */}
              <div className="flex gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setEditing({ ...editing, provider: p.id })}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                      editing.provider === p.id
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "text-on-surface-variant/60 border-outline-variant/15 hover:border-primary/30"
                    }`}
                  >
                    <i className={`fa-solid ${p.icon} ${editing.provider === p.id ? "text-primary" : p.color}`} />
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant/60 mb-1.5">Name</label>
                <input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="block w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none"
                  placeholder="e.g. Send to Slack via Zapier"
                />
              </div>

              {/* Webhook URL */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant/60 mb-1.5">Webhook URL</label>
                <input
                  value={editing.webhook_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, webhook_url: e.target.value })}
                  className="block w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none font-mono"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                />
                {editing.provider === "zapier" && (
                  <p className="text-[11px] text-on-surface-variant/40 mt-1.5">
                    Create a Zap with "Webhooks by Zapier" as the trigger, choose "Catch Hook", and paste the URL here.
                  </p>
                )}
                {editing.provider === "make" && (
                  <p className="text-[11px] text-on-surface-variant/40 mt-1.5">
                    Add a "Custom Webhook" module in Make and paste the webhook URL here.
                  </p>
                )}
              </div>

              {/* Signing secret (custom only) */}
              {editing.provider === "custom" && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant/60 mb-1.5">
                    Signing Secret <span className="font-normal text-on-surface-variant/40">(optional)</span>
                  </label>
                  <input
                    value={editing.signing_secret ?? ""}
                    onChange={(e) => setEditing({ ...editing, signing_secret: e.target.value })}
                    className="block w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none font-mono"
                    placeholder="whsec_..."
                  />
                  <p className="text-[11px] text-on-surface-variant/40 mt-1.5">
                    If provided, linqme will sign the payload with HMAC-SHA256 and include it in the X-Linqme-Signature header.
                  </p>
                </div>
              )}

              {/* Enabled toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">Enabled</p>
                  <p className="text-[11px] text-on-surface-variant/40">When disabled, submissions won&apos;t fire this webhook.</p>
                </div>
                <button
                  onClick={() => setEditing({ ...editing, is_enabled: !editing.is_enabled })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    editing.is_enabled ? "bg-primary" : "bg-surface-container-highest"
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    editing.is_enabled ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>

              {/* Field mapping */}
              <div className="border-t border-outline-variant/10 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Field Mapping</p>
                    <p className="text-[11px] text-on-surface-variant/40">
                      {editing.field_map
                        ? "Choose which fields to send and customize the key names."
                        : "All form fields will be sent. Enable mapping to customize."}
                    </p>
                  </div>
                  <button
                    onClick={toggleFieldMapping}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                      editing.field_map
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "text-on-surface-variant/60 border-outline-variant/15 hover:border-primary/30"
                    }`}
                  >
                    {editing.field_map ? "Send All Fields" : "Customize Fields"}
                  </button>
                </div>

                {editing.field_map && (
                  <div className="space-y-2">
                    {/* Mapped fields */}
                    {editing.field_map.map((m) => {
                      const field = allFields.find((f) => f.id === m.fieldId);
                      return (
                        <div key={m.fieldId} className="flex items-center gap-2 bg-surface-container-lowest rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-on-surface truncate">
                              {field?.label ?? m.fieldId}
                            </p>
                            <p className="text-[10px] text-on-surface-variant/40">{field?.stepTitle}</p>
                          </div>
                          <i className="fa-solid fa-arrow-right text-[9px] text-on-surface-variant/30 shrink-0" />
                          <input
                            value={m.key}
                            onChange={(e) => updateMapping(m.fieldId, e.target.value)}
                            className="w-36 px-2 py-1.5 text-xs bg-surface-container border-0 rounded text-on-surface font-mono focus:ring-1 focus:ring-primary/40 outline-none"
                            placeholder="key_name"
                          />
                          <button
                            onClick={() => removeMapping(m.fieldId)}
                            className="text-on-surface-variant/30 hover:text-error transition-colors shrink-0"
                          >
                            <i className="fa-solid fa-xmark text-xs" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Add unmapped fields */}
                    {allFields.filter((f) => !editing.field_map?.some((m) => m.fieldId === f.id)).length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest mb-1.5">
                          Available Fields
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {allFields
                            .filter((f) => !editing.field_map?.some((m) => m.fieldId === f.id))
                            .map((f) => (
                              <button
                                key={f.id}
                                onClick={() => addMapping(f.id)}
                                className="px-2.5 py-1 text-[10px] text-on-surface-variant/60 bg-surface-container-highest rounded-full hover:text-primary hover:bg-primary/10 transition-all"
                              >
                                <i className="fa-solid fa-plus text-[8px] mr-1" />
                                {f.label}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-xs text-error font-medium">
                  {error}
                </div>
              )}

              {/* Save */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => { setEditing(null); setError(null); }}
                  className="px-4 py-2 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-primary text-on-primary rounded-lg hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all disabled:opacity-60"
                >
                  {saving ? "Saving..." : editing.id ? "Update Webhook" : "Add Webhook"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Help section */}
        {!editing && webhooks.length === 0 && (
          <div className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
            <h3 className="text-sm font-bold text-on-surface mb-3">How it works</h3>
            <div className="space-y-3 text-xs text-on-surface-variant/60 leading-relaxed">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <p>Create a Zap in Zapier (or a scenario in Make) using "Webhooks" as the trigger. Copy the webhook URL.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <p>Click one of the provider cards above and paste the URL. Optionally customize which fields get sent.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <p>Use the Test button to send a sample payload. Then configure your downstream actions in Zapier/Make.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                <p>Every time a client submits this form, linqme will POST the data to your webhook automatically.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
