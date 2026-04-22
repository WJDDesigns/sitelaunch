"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { FormSchema } from "@/lib/forms";
import { updateFormNotificationSettingsAction } from "./form-actions";
import {
  saveWebhookAction,
  deleteWebhookAction,
  testWebhookAction,
  getWebhookDeliveries,
} from "./webhook-actions";
import {
  createSheetsFeedAction,
  updateSheetsFeedAction,
  deleteSheetsFeedAction,
} from "./sheets-actions";
import {
  createFormNotification,
  updateFormNotification,
  deleteFormNotification,
  duplicateFormNotification,
} from "./notification-actions";
import type { FormNotification, NotificationCondition } from "./notification-actions";

/* ── Types ─────────────────────────────────────────────────────────── */

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

interface SheetsFeed {
  id: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  sheet_name: string;
  field_map: { fieldId: string; column: string }[] | null;
  is_enabled: boolean;
}

const PROVIDERS = [
  { id: "zapier", label: "Zapier", icon: "fa-bolt", color: "text-orange-400", desc: "Connect to 7,000+ apps via Zapier." },
  { id: "make", label: "Make", icon: "fa-gear", color: "text-purple-400", desc: "Connect to Make (Integromat) scenarios." },
  { id: "custom", label: "Custom", icon: "fa-code", color: "text-blue-400", desc: "POST to any URL with HMAC signing." },
];

const OPERATORS = [
  { value: "equals", label: "is" },
  { value: "not_equals", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "not_empty", label: "is not empty" },
  { value: "is_empty", label: "is empty" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
];

type SendToTab = "notifications" | "confirmations" | "integrations";

/* ── Component ─────────────────────────────────────────────────────── */

export default function FormSendToPanel({
  formId,
  schema,
  initialWebhooks,
  initialSheetsFeeds,
  hasSheetsConnection,
  initialNotifications,
  confirmPageHeading: initialConfirmHeading,
  confirmPageBody: initialConfirmBody,
  redirectUrl: initialRedirectUrl,
}: {
  formId: string;
  schema: FormSchema;
  initialWebhooks: Webhook[];
  initialSheetsFeeds: SheetsFeed[];
  hasSheetsConnection: boolean;
  initialNotifications: FormNotification[];
  confirmPageHeading: string;
  confirmPageBody: string;
  redirectUrl: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SendToTab>("notifications");

  /* ── All form fields for conditions + merge tags ───────────────── */
  const allFields = schema.steps.flatMap((s) =>
    s.fields
      .filter((f) => f.type !== "heading")
      .map((f) => ({ id: f.id, label: f.label, type: f.type, stepTitle: s.title })),
  );

  const mergeTags = [
    { tag: "{all_fields}", label: "All Fields", desc: "Table of all submitted data" },
    { tag: "{client_name}", label: "Client Name", desc: "Submitter's name" },
    { tag: "{client_email}", label: "Client Email", desc: "Submitter's email" },
    { tag: "{partner_name}", label: "Partner Name", desc: "Your company name" },
    { tag: "{submission_link}", label: "Submission Link", desc: "Link to entry in dashboard" },
    ...allFields.map((f) => ({
      tag: `{field:${f.id}}`,
      label: f.label,
      desc: `${f.stepTitle} -- ${f.type ?? "text"}`,
    })),
  ];

  /* ── Tab bar ─────────────────────────────────────────────────────── */
  const TABS: { id: SendToTab; label: string; icon: string }[] = [
    { id: "notifications", label: "Email Notifications", icon: "fa-envelope" },
    { id: "confirmations", label: "Confirmations", icon: "fa-circle-check" },
    { id: "integrations", label: "Integrations", icon: "fa-plug" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold font-headline text-on-surface">Send To</h2>
          <p className="text-sm text-on-surface-variant/60 mt-1">
            Configure email notifications, confirmation pages, and integrations.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-surface-container-lowest rounded-xl p-1 border border-outline-variant/10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-surface-container-high/30"
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-[10px]`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "notifications" && (
          <NotificationsTab
            formId={formId}
            initialNotifications={initialNotifications}
            allFields={allFields}
            mergeTags={mergeTags}
            router={router}
          />
        )}
        {activeTab === "confirmations" && (
          <ConfirmationsTab
            formId={formId}
            initialConfirmHeading={initialConfirmHeading}
            initialConfirmBody={initialConfirmBody}
            initialRedirectUrl={initialRedirectUrl}
            router={router}
          />
        )}
        {activeTab === "integrations" && (
          <IntegrationsTab
            formId={formId}
            schema={schema}
            initialWebhooks={initialWebhooks}
            initialSheetsFeeds={initialSheetsFeeds}
            hasSheetsConnection={hasSheetsConnection}
            allFields={allFields}
            router={router}
          />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * NOTIFICATIONS TAB -- Accordion notification cards
 * ═════════════════════════════════════════════════════════════════════ */

function NotificationsTab({
  formId,
  initialNotifications,
  allFields,
  mergeTags,
  router,
}: {
  formId: string;
  initialNotifications: FormNotification[];
  allFields: { id: string; label: string; type: string; stepTitle: string }[];
  mergeTags: { tag: string; label: string; desc: string }[];
  router: ReturnType<typeof useRouter>;
}) {
  const [notifications, setNotifications] = useState<FormNotification[]>(initialNotifications);
  const [expandedId, setExpandedId] = useState<string | null>(
    initialNotifications.length > 0 ? initialNotifications[0].id : null,
  );
  const [creating, startCreate] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function flashMsg(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 3000);
  }

  function handleAdd() {
    startCreate(async () => {
      const result = await createFormNotification(formId, "New Notification");
      if (result.ok && result.id) {
        const newNotif: FormNotification = {
          id: result.id,
          name: "New Notification",
          is_enabled: true,
          to_emails: [],
          bcc_emails: [],
          reply_to: null,
          email_subject: null,
          email_body: null,
          conditions: null,
          sort_order: notifications.length,
        };
        setNotifications((prev) => [...prev, newNotif]);
        setExpandedId(result.id);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant/60">
            Add email notifications that fire when this form is submitted. Use conditions to route emails based on field values.
          </p>
        </div>
      </div>

      {/* Notification cards */}
      {notifications.map((notif) => (
        <NotificationCard
          key={notif.id}
          formId={formId}
          notification={notif}
          isExpanded={expandedId === notif.id}
          onToggleExpand={() => setExpandedId(expandedId === notif.id ? null : notif.id)}
          allFields={allFields}
          mergeTags={mergeTags}
          onUpdate={(updated) => {
            setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          }}
          onDelete={() => {
            setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
            if (expandedId === notif.id) setExpandedId(null);
          }}
          onDuplicate={(newNotif) => {
            setNotifications((prev) => [...prev, newNotif]);
            setExpandedId(newNotif.id);
          }}
          onFlash={flashMsg}
        />
      ))}

      {/* Add button */}
      <button
        onClick={handleAdd}
        disabled={creating}
        className="w-full glass-panel rounded-xl border border-dashed border-outline-variant/20 p-4 hover:border-primary/30 transition-all group text-left disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <i className="fa-solid fa-plus text-on-surface-variant/40 group-hover:text-primary text-sm transition-colors" />
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">Add Notification</p>
            <p className="text-[11px] text-on-surface-variant/40">Create a new email notification for this form.</p>
          </div>
        </div>
      </button>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="glass-panel rounded-xl border border-outline-variant/15 p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <i className="fa-solid fa-envelope text-primary text-lg" />
          </div>
          <p className="text-sm font-bold text-on-surface mb-1">No notifications yet</p>
          <p className="text-xs text-on-surface-variant/50">
            Click "Add Notification" to create your first email notification. A default admin notification is a great starting point.
          </p>
        </div>
      )}

      {msg && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          msg.includes("Saved") || msg.includes("Deleted") || msg.includes("Duplicated")
            ? "bg-tertiary/10 border-tertiary/20 text-tertiary"
            : "bg-error/10 border-error/20 text-error"
        }`}>
          <i className={`fa-solid ${msg.includes("Saved") || msg.includes("Deleted") || msg.includes("Duplicated") ? "fa-circle-check" : "fa-circle-xmark"} mr-2`} />
          {msg}
        </div>
      )}
    </div>
  );
}

/* ── Single notification accordion card ─────────────────────────── */

function NotificationCard({
  formId,
  notification: initialNotif,
  isExpanded,
  onToggleExpand,
  allFields,
  mergeTags,
  onUpdate,
  onDelete,
  onDuplicate,
  onFlash,
}: {
  formId: string;
  notification: FormNotification;
  isExpanded: boolean;
  onToggleExpand: () => void;
  allFields: { id: string; label: string; type: string; stepTitle: string }[];
  mergeTags: { tag: string; label: string; desc: string }[];
  onUpdate: (n: FormNotification) => void;
  onDelete: () => void;
  onDuplicate: (n: FormNotification) => void;
  onFlash: (msg: string) => void;
}) {
  const [notif, setNotif] = useState(initialNotif);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [duplicating, startDuplicate] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagTarget, setTagTarget] = useState<"subject" | "body">("body");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    startSave(async () => {
      const result = await updateFormNotification(formId, notif.id, {
        name: notif.name,
        is_enabled: notif.is_enabled,
        to_emails: notif.to_emails,
        bcc_emails: notif.bcc_emails,
        reply_to: notif.reply_to,
        email_subject: notif.email_subject,
        email_body: notif.email_body,
        conditions: notif.conditions,
      });
      if (result.ok) {
        onUpdate(notif);
        onFlash("Saved!");
      } else {
        onFlash(result.error ?? "Failed to save.");
      }
    });
  }

  function handleToggleEnabled() {
    const updated = { ...notif, is_enabled: !notif.is_enabled };
    setNotif(updated);
    startSave(async () => {
      const result = await updateFormNotification(formId, notif.id, { is_enabled: updated.is_enabled });
      if (result.ok) onUpdate(updated);
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteFormNotification(formId, notif.id);
      if (result.ok) {
        onDelete();
        onFlash("Deleted!");
      }
    });
  }

  function handleDuplicate() {
    startDuplicate(async () => {
      const result = await duplicateFormNotification(formId, notif.id);
      if (result.ok && result.id) {
        onDuplicate({
          ...notif,
          id: result.id,
          name: `${notif.name} (copy)`,
          is_enabled: false,
          sort_order: notif.sort_order + 1,
        });
        onFlash("Duplicated!");
      }
    });
  }

  const insertTag = useCallback((tag: string) => {
    const ref = tagTarget === "body" ? bodyRef : subjectRef;
    const setter = (val: string) => {
      if (tagTarget === "body") {
        setNotif((prev) => ({ ...prev, email_body: val }));
      } else {
        setNotif((prev) => ({ ...prev, email_subject: val }));
      }
    };

    const el = ref.current;
    if (el) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? start;
      const newVal = el.value.slice(0, start) + tag + el.value.slice(end);
      setter(newVal);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + tag.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      setter((tagTarget === "body" ? notif.email_body ?? "" : notif.email_subject ?? "") + tag);
    }
    setShowTagPicker(false);
  }, [tagTarget, notif.email_body, notif.email_subject]);

  // Condition helpers
  const hasConditions = !!notif.conditions?.fieldId;

  function addCondition() {
    if (!notif.conditions?.fieldId) {
      setNotif({
        ...notif,
        conditions: {
          fieldId: allFields[0]?.id ?? "",
          operator: "not_empty",
          combinator: "and",
        },
      });
    }
  }

  function removeConditions() {
    setNotif({ ...notif, conditions: null });
  }

  function updatePrimaryCondition(updates: Partial<NotificationCondition>) {
    setNotif({
      ...notif,
      conditions: { ...notif.conditions!, ...updates },
    });
  }

  function addExtraCondition() {
    const existing = notif.conditions?.extraConditions ?? [];
    setNotif({
      ...notif,
      conditions: {
        ...notif.conditions!,
        extraConditions: [...existing, { fieldId: allFields[0]?.id ?? "", operator: "not_empty" }],
      },
    });
  }

  function updateExtraCondition(idx: number, updates: Partial<{ fieldId: string; operator: string; value?: string }>) {
    const existing = [...(notif.conditions?.extraConditions ?? [])];
    existing[idx] = { ...existing[idx], ...updates };
    setNotif({
      ...notif,
      conditions: { ...notif.conditions!, extraConditions: existing },
    });
  }

  function removeExtraCondition(idx: number) {
    const existing = [...(notif.conditions?.extraConditions ?? [])];
    existing.splice(idx, 1);
    setNotif({
      ...notif,
      conditions: { ...notif.conditions!, extraConditions: existing },
    });
  }

  const needsValue = (op: string) => !["not_empty", "is_empty"].includes(op);

  return (
    <div className={`glass-panel rounded-2xl border overflow-hidden transition-all ${
      notif.is_enabled ? "border-outline-variant/15" : "border-outline-variant/10 opacity-70"
    }`}>
      {/* Collapsed header */}
      <div
        className="px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-surface-container-high/20 transition-colors"
        onClick={onToggleExpand}
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          notif.is_enabled ? "bg-primary/10" : "bg-surface-container-highest"
        }`}>
          <i className={`fa-solid fa-envelope text-xs ${notif.is_enabled ? "text-primary" : "text-on-surface-variant/40"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-on-surface truncate">{notif.name}</span>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
              notif.is_enabled ? "text-tertiary bg-tertiary/10" : "text-on-surface-variant/40 bg-surface-container-high"
            }`}>
              {notif.is_enabled ? "Active" : "Off"}
            </span>
            {hasConditions && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                Conditional
              </span>
            )}
          </div>
          <p className="text-[11px] text-on-surface-variant/40 truncate mt-0.5">
            {notif.to_emails.length > 0 ? notif.to_emails.join(", ") : "No recipients configured"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Enable/disable toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleEnabled(); }}
            className={`relative w-9 h-5 rounded-full transition-colors ${notif.is_enabled ? "bg-primary" : "bg-surface-container-highest"}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${notif.is_enabled ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
          <i className={`fa-solid fa-chevron-${isExpanded ? "up" : "down"} text-[10px] text-on-surface-variant/40`} />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-outline-variant/10 px-5 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-widest">Notification Name</label>
            <input
              value={notif.name}
              onChange={(e) => setNotif({ ...notif, name: e.target.value })}
              className="w-full mt-1.5 px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none"
              placeholder="e.g. Admin Notification, Sales Team Alert"
            />
          </div>

          {/* Recipients */}
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-widest">Send To</span>
              <p className="text-[11px] text-on-surface-variant/40 mt-0.5 mb-1.5">
                Comma-separated emails. Leave empty to use your default partner email.
              </p>
              <input
                value={notif.to_emails.join(", ")}
                onChange={(e) => setNotif({ ...notif, to_emails: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="e.g. team@agency.com, lead@agency.com"
                className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-widest">BCC</span>
              <input
                value={notif.bcc_emails.join(", ")}
                onChange={(e) => setNotif({ ...notif, bcc_emails: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="e.g. records@agency.com"
                className="w-full mt-1.5 px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-widest">Reply-To</span>
              <input
                value={notif.reply_to ?? ""}
                onChange={(e) => setNotif({ ...notif, reply_to: e.target.value || null })}
                placeholder="e.g. support@agency.com"
                className="w-full mt-1.5 px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none"
              />
            </label>
          </div>

          {/* Email Template */}
          <div className="border-t border-outline-variant/10 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-widest">Email Template</h4>
              <p className="text-[11px] text-on-surface-variant/40">Leave blank for default</p>
            </div>

            {/* Subject */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-on-surface">Subject</label>
                <button
                  onClick={() => { setTagTarget("subject"); setShowTagPicker(!showTagPicker || tagTarget !== "subject"); }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-primary/70 hover:text-primary hover:bg-primary/5 rounded transition-all"
                >
                  <i className="fa-solid fa-code text-[9px]" />
                  Insert Tag
                </button>
              </div>
              <input
                ref={subjectRef}
                value={notif.email_subject ?? ""}
                onChange={(e) => setNotif({ ...notif, email_subject: e.target.value || null })}
                placeholder="New submission -- {client_name} -- {partner_name}"
                className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none font-mono text-[13px]"
              />
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-on-surface">Body</label>
                <button
                  onClick={() => { setTagTarget("body"); setShowTagPicker(!showTagPicker || tagTarget !== "body"); }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-primary/70 hover:text-primary hover:bg-primary/5 rounded transition-all"
                >
                  <i className="fa-solid fa-code text-[9px]" />
                  Insert Tag
                </button>
              </div>
              <textarea
                ref={bodyRef}
                value={notif.email_body ?? ""}
                onChange={(e) => setNotif({ ...notif, email_body: e.target.value || null })}
                placeholder={"{client_name} submitted their form.\n\nClient email: {client_email}\n\n{all_fields}"}
                rows={5}
                className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none resize-none font-mono text-[13px] leading-relaxed"
              />
              <p className="text-[11px] text-on-surface-variant/40 mt-1">
                Use merge tags to insert dynamic data. <span className="font-mono text-[10px] text-primary/50">{"{all_fields}"}</span> inserts a table of all submitted data.
              </p>
            </div>

            {/* Tag picker */}
            {showTagPicker && (
              <div className="rounded-xl border border-outline-variant/15 bg-surface-container overflow-hidden shadow-xl shadow-black/20">
                <div className="px-3 py-2 border-b border-outline-variant/10 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Merge Tags</span>
                  <button onClick={() => setShowTagPicker(false)} className="text-on-surface-variant/40 hover:text-on-surface text-xs">
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-outline-variant/5">
                  {mergeTags.map((t) => (
                    <button
                      key={t.tag}
                      onClick={() => insertTag(t.tag)}
                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-primary/5 transition-colors text-left"
                    >
                      <code className="text-[11px] font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded shrink-0">{t.tag}</code>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-on-surface truncate">{t.label}</p>
                        <p className="text-[10px] text-on-surface-variant/40 truncate">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reset link */}
            {(notif.email_subject || notif.email_body) && (
              <button
                onClick={() => setNotif({ ...notif, email_subject: null, email_body: null })}
                className="text-[11px] font-medium text-on-surface-variant/50 hover:text-error transition-colors"
              >
                <i className="fa-solid fa-rotate-left text-[9px] mr-1" />
                Reset to default template
              </button>
            )}
          </div>

          {/* Conditional Logic */}
          <div className="border-t border-outline-variant/10 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-widest">Conditional Logic</h4>
                <p className="text-[11px] text-on-surface-variant/40 mt-0.5">
                  {hasConditions ? "This notification only sends when conditions are met." : "Send this notification for every submission."}
                </p>
              </div>
              {hasConditions ? (
                <button onClick={removeConditions} className="px-3 py-1.5 text-[10px] font-bold text-error/70 border border-error/15 rounded-lg hover:text-error hover:border-error/30 transition-all">
                  Remove
                </button>
              ) : (
                <button onClick={addCondition} className="px-3 py-1.5 text-[10px] font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/10 transition-all">
                  <i className="fa-solid fa-plus text-[9px] mr-1" />
                  Add Conditions
                </button>
              )}
            </div>

            {hasConditions && notif.conditions && (
              <div className="space-y-3 bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10">
                {/* Combinator */}
                {(notif.conditions.extraConditions?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] text-on-surface-variant/50">Match</span>
                    <select
                      value={notif.conditions.combinator ?? "and"}
                      onChange={(e) => updatePrimaryCondition({ combinator: e.target.value as "and" | "or" })}
                      className="px-2 py-1 text-[11px] font-bold bg-surface-container border border-outline-variant/15 rounded text-on-surface"
                    >
                      <option value="and">ALL conditions (AND)</option>
                      <option value="or">ANY condition (OR)</option>
                    </select>
                  </div>
                )}

                {/* Primary condition */}
                <ConditionRow
                  condition={{ fieldId: notif.conditions.fieldId, operator: notif.conditions.operator, value: notif.conditions.value }}
                  allFields={allFields}
                  onChange={(c) => updatePrimaryCondition({ fieldId: c.fieldId, operator: c.operator as NotificationCondition["operator"], value: c.value })}
                  onRemove={removeConditions}
                  isOnly={!(notif.conditions.extraConditions?.length)}
                />

                {/* Extra conditions */}
                {notif.conditions.extraConditions?.map((cond, idx) => (
                  <ConditionRow
                    key={idx}
                    condition={cond}
                    allFields={allFields}
                    onChange={(c) => updateExtraCondition(idx, c)}
                    onRemove={() => removeExtraCondition(idx)}
                    isOnly={false}
                  />
                ))}

                <button
                  onClick={addExtraCondition}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-primary/70 hover:text-primary transition-colors"
                >
                  <i className="fa-solid fa-plus text-[9px]" />
                  Add condition
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDuplicate}
                disabled={duplicating}
                className="px-3 py-1.5 text-[10px] font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 hover:text-primary transition-all disabled:opacity-50"
              >
                <i className="fa-solid fa-copy text-[9px] mr-1" />
                Duplicate
              </button>
              {confirmDel ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-error font-bold">Delete?</span>
                  <button onClick={handleDelete} disabled={deleting} className="px-2 py-1 text-[10px] font-bold bg-error text-on-error rounded disabled:opacity-50">
                    {deleting ? "..." : "Yes"}
                  </button>
                  <button onClick={() => setConfirmDel(false)} className="text-[10px] text-on-surface-variant/50 hover:text-on-surface">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDel(true)}
                  className="px-3 py-1.5 text-[10px] font-bold text-error/60 border border-error/15 rounded-lg hover:text-error hover:border-error/30 transition-all"
                >
                  <i className="fa-solid fa-trash text-[9px] mr-1" />
                  Delete
                </button>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-xs font-bold bg-primary text-on-primary rounded-lg hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Notification"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Condition row ──────────────────────────────────────────────── */

function ConditionRow({
  condition,
  allFields,
  onChange,
  onRemove,
  isOnly,
}: {
  condition: { fieldId: string; operator: string; value?: string };
  allFields: { id: string; label: string; type: string; stepTitle: string }[];
  onChange: (c: { fieldId: string; operator: string; value?: string }) => void;
  onRemove: () => void;
  isOnly: boolean;
}) {
  const needsValue = !["not_empty", "is_empty"].includes(condition.operator);
  const selectedField = allFields.find((f) => f.id === condition.fieldId);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={condition.fieldId}
        onChange={(e) => onChange({ ...condition, fieldId: e.target.value })}
        className="flex-1 min-w-[140px] px-2.5 py-2 text-xs bg-surface-container border border-outline-variant/15 rounded-lg text-on-surface"
      >
        {allFields.map((f) => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>

      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        className="px-2.5 py-2 text-xs bg-surface-container border border-outline-variant/15 rounded-lg text-on-surface"
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {needsValue && (
        selectedField && selectedField.type === "select" || selectedField?.type === "radio" ? (
          <input
            value={condition.value ?? ""}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            placeholder="value"
            className="flex-1 min-w-[100px] px-2.5 py-2 text-xs bg-surface-container border border-outline-variant/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40"
          />
        ) : (
          <input
            value={condition.value ?? ""}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            placeholder="value"
            className="flex-1 min-w-[100px] px-2.5 py-2 text-xs bg-surface-container border border-outline-variant/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40"
          />
        )
      )}

      <button onClick={onRemove} className="text-on-surface-variant/30 hover:text-error transition-colors shrink-0">
        <i className="fa-solid fa-xmark text-xs" />
      </button>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════
 * CONFIRMATIONS TAB
 * ═════════════════════════════════════════════════════════════════════ */

function ConfirmationsTab({
  formId,
  initialConfirmHeading,
  initialConfirmBody,
  initialRedirectUrl,
  router,
}: {
  formId: string;
  initialConfirmHeading: string;
  initialConfirmBody: string;
  initialRedirectUrl: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [confirmHeading, setConfirmHeading] = useState(initialConfirmHeading);
  const [confirmBody, setConfirmBody] = useState(initialConfirmBody);
  const [redirectUrl, setRedirectUrl] = useState(initialRedirectUrl);
  const [saving, startSave] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleSave() {
    setMsg(null);
    startSave(async () => {
      const result = await updateFormNotificationSettingsAction(formId, {
        notificationEmails: [],
        notificationBcc: [],
        confirmPageHeading: confirmHeading,
        confirmPageBody: confirmBody,
        redirectUrl,
      });
      setMsg(result.ok ? "Saved!" : (result.error ?? "Failed."));
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-primary/60 text-sm" />
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Confirmation Page
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-on-surface-variant/60">
            What the client sees after submitting the form. You can show a custom confirmation page or redirect them to an external URL.
          </p>

          <label className="block">
            <span className="text-xs font-medium text-on-surface">Redirect URL</span>
            <p className="text-[11px] text-on-surface-variant/40 mt-0.5 mb-1.5">
              Redirect clients to a custom URL instead of the confirmation page.
            </p>
            <input
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://youragency.com/thank-you"
              className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none"
            />
          </label>

          <div className="border-t border-outline-variant/10 pt-4">
            <p className="text-[11px] text-on-surface-variant/40 mb-3">
              If no redirect URL is set, clients see the built-in confirmation page with these customizable fields:
            </p>

            <label className="block mb-4">
              <span className="text-xs font-medium text-on-surface">Confirmation heading</span>
              <input
                value={confirmHeading}
                onChange={(e) => setConfirmHeading(e.target.value)}
                placeholder="Thank you for your submission!"
                className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none mt-1.5"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-on-surface">Confirmation body</span>
              <textarea
                value={confirmBody}
                onChange={(e) => setConfirmBody(e.target.value)}
                placeholder="We'll review your information and get back to you shortly."
                rows={3}
                className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none resize-none mt-1.5"
              />
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-xs font-bold bg-primary text-on-primary rounded-lg hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Confirmation Settings"}
            </button>
            {msg && (
              <span className={`text-xs font-medium ${msg === "Saved!" ? "text-tertiary" : "text-error"}`}>{msg}</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════
 * INTEGRATIONS TAB -- Webhooks + Google Sheets
 * ═════════════════════════════════════════════════════════════════════ */

function IntegrationsTab({
  formId,
  schema,
  initialWebhooks,
  initialSheetsFeeds,
  hasSheetsConnection,
  allFields,
  router,
}: {
  formId: string;
  schema: FormSchema;
  initialWebhooks: Webhook[];
  initialSheetsFeeds: SheetsFeed[];
  hasSheetsConnection: boolean;
  allFields: { id: string; label: string; type: string; stepTitle: string }[];
  router: ReturnType<typeof useRouter>;
}) {
  /* ── Webhook state ───────────────────────────────────────────────── */
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks);
  const [editing, setEditing] = useState<Partial<Webhook> | null>(null);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [showDeliveries, setShowDeliveries] = useState<string | null>(null);
  const [whError, setWhError] = useState<string | null>(null);

  /* ── Sheets feed state ────────────────────────────────────────────── */
  const [sheetsFeeds, setSheetsFeeds] = useState<SheetsFeed[]>(initialSheetsFeeds);
  const [sheetsAdding, startSheetsAdd] = useTransition();
  const [sheetsDeleting, startSheetsDelete] = useTransition();
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [sheetsMsg, setSheetsMsg] = useState<string | null>(null);
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [newSheetMode, setNewSheetMode] = useState<"create" | "existing">("create");
  const [newSheetTitle, setNewSheetTitle] = useState("");
  const [existingSheetUrl, setExistingSheetUrl] = useState("");

  function extractSpreadsheetId(url: string): string | null {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  function handleAddSheetsFeed() {
    setSheetsError(null);
    setSheetsMsg(null);

    if (newSheetMode === "create") {
      if (!newSheetTitle.trim()) { setSheetsError("Enter a spreadsheet title."); return; }
      const headers = ["Submitted At", ...schema.steps.flatMap((s) => s.fields.map((f) => f.label))];
      startSheetsAdd(async () => {
        const result = await createSheetsFeedAction(formId, {
          createNew: true,
          newTitle: newSheetTitle.trim(),
          headers,
        });
        if (result.ok) {
          setSheetsFeeds((prev) => [
            ...prev,
            {
              id: result.id!,
              spreadsheet_id: extractSpreadsheetId(result.spreadsheetUrl ?? "") ?? "",
              spreadsheet_name: newSheetTitle.trim(),
              sheet_name: "Submissions",
              field_map: null,
              is_enabled: true,
            },
          ]);
          setNewSheetTitle("");
          setShowNewSheet(false);
          setSheetsMsg("Spreadsheet created and linked!");
        } else {
          setSheetsError(result.error ?? "Failed to create spreadsheet.");
        }
      });
    } else {
      const spreadsheetId = extractSpreadsheetId(existingSheetUrl);
      if (!spreadsheetId) { setSheetsError("Paste a valid Google Sheets URL."); return; }
      startSheetsAdd(async () => {
        const result = await createSheetsFeedAction(formId, {
          spreadsheetId,
          spreadsheetName: "Linked Sheet",
        });
        if (result.ok) {
          setSheetsFeeds((prev) => [
            ...prev,
            {
              id: result.id!,
              spreadsheet_id: spreadsheetId,
              spreadsheet_name: "Linked Sheet",
              sheet_name: "Sheet1",
              field_map: null,
              is_enabled: true,
            },
          ]);
          setExistingSheetUrl("");
          setShowNewSheet(false);
          setSheetsMsg("Sheet linked!");
        } else {
          setSheetsError(result.error ?? "Failed to link spreadsheet.");
        }
      });
    }
  }

  function handleDeleteSheetsFeed(feedId: string) {
    startSheetsDelete(async () => {
      const result = await deleteSheetsFeedAction(feedId, formId);
      if (result.ok) {
        setSheetsFeeds((prev) => prev.filter((f) => f.id !== feedId));
      }
    });
  }

  function handleToggleSheetsFeed(feedId: string, enabled: boolean) {
    startSheetsAdd(async () => {
      const result = await updateSheetsFeedAction(feedId, formId, { isEnabled: enabled });
      if (result.ok) {
        setSheetsFeeds((prev) => prev.map((f) => f.id === feedId ? { ...f, is_enabled: enabled } : f));
      }
    });
  }

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
    setWhError(null);
    setTestResult(null);
  }

  function handleEdit(wh: Webhook) {
    setEditing({ ...wh });
    setWhError(null);
    setTestResult(null);
  }

  function handleSave() {
    if (!editing) return;
    setWhError(null);
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
        if (editing.id) {
          setWebhooks((prev) =>
            prev.map((w) => w.id === editing.id ? { ...w, ...editing, id: w.id } as Webhook : w),
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
        setWhError(result.error ?? "Failed to save.");
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
      setTestResult(result.ok
        ? { ok: true, msg: `Success (${result.statusCode})` }
        : { ok: false, msg: result.error ?? `Failed (${result.statusCode})` });
    });
  }

  async function handleViewDeliveries(webhookId: string) {
    if (showDeliveries === webhookId) { setShowDeliveries(null); return; }
    setShowDeliveries(webhookId);
    setDeliveries(await getWebhookDeliveries(webhookId));
  }

  function toggleFieldMapping() {
    if (!editing) return;
    setEditing(editing.field_map
      ? { ...editing, field_map: null }
      : { ...editing, field_map: allFields.map((f) => ({ fieldId: f.id, key: f.id })) });
  }

  function updateMapping(fieldId: string, key: string) {
    if (!editing?.field_map) return;
    setEditing({ ...editing, field_map: editing.field_map.map((m) => m.fieldId === fieldId ? { ...m, key } : m) });
  }

  function removeMapping(fieldId: string) {
    if (!editing?.field_map) return;
    setEditing({ ...editing, field_map: editing.field_map.filter((m) => m.fieldId !== fieldId) });
  }

  function addMapping(fieldId: string) {
    if (!editing) return;
    const existing = editing.field_map ?? [];
    if (existing.some((m) => m.fieldId === fieldId)) return;
    setEditing({ ...editing, field_map: [...existing, { fieldId, key: fieldId }] });
  }

  return (
    <div className="space-y-8">
      {/* ── Google Sheets ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-table text-emerald-400 text-sm" />
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Google Sheets
          </h3>
        </div>

        {!hasSheetsConnection ? (
          <div className="glass-panel rounded-xl border border-outline-variant/15 p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-table text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-on-surface mb-1">Connect Google Sheets</p>
                <p className="text-xs text-on-surface-variant/60 leading-relaxed mb-3">
                  Automatically sync every submission to a Google Spreadsheet in real time.
                  Connect your Google account first from the Integrations page.
                </p>
                <a
                  href="/dashboard/integrations"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all"
                >
                  <i className="fa-solid fa-plug text-[10px]" />
                  Go to Integrations
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            {sheetsFeeds.length > 0 && (
              <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
                <div className="divide-y divide-outline-variant/5">
                  {sheetsFeeds.map((feed) => (
                    <div key={feed.id} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-table text-emerald-400 text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-on-surface truncate">{feed.spreadsheet_name || "Linked Sheet"}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                            feed.is_enabled ? "text-tertiary bg-tertiary/10" : "text-on-surface-variant/40 bg-surface-container-high"
                          }`}>{feed.is_enabled ? "Active" : "Off"}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant/40 truncate mt-0.5">
                          Tab: {feed.sheet_name} -- {feed.field_map ? `${feed.field_map.length} mapped fields` : "All fields (auto)"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a href={`https://docs.google.com/spreadsheets/d/${feed.spreadsheet_id}`} target="_blank" rel="noopener noreferrer"
                          className="px-2.5 py-1.5 text-[10px] font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-emerald-400/30 hover:text-emerald-400 transition-all">
                          <i className="fa-solid fa-arrow-up-right-from-square text-[9px] mr-1" />Open
                        </a>
                        <button onClick={() => handleToggleSheetsFeed(feed.id, !feed.is_enabled)}
                          className={`px-2.5 py-1.5 text-[10px] font-bold border rounded-lg transition-all ${
                            feed.is_enabled ? "text-on-surface-variant border-outline-variant/20 hover:border-orange-400/30 hover:text-orange-400" : "text-primary border-primary/20 hover:bg-primary/10"
                          }`}>{feed.is_enabled ? "Pause" : "Resume"}</button>
                        <button onClick={() => handleDeleteSheetsFeed(feed.id)} disabled={sheetsDeleting}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-error border border-error/20 rounded-lg hover:bg-error/10 transition-all disabled:opacity-50">
                          <i className="fa-solid fa-trash text-[9px]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sheetsMsg && (
              <div className="rounded-xl border bg-tertiary/10 border-tertiary/20 px-4 py-3 text-sm font-medium text-tertiary">
                <i className="fa-solid fa-circle-check mr-2" />{sheetsMsg}
              </div>
            )}
            {sheetsError && (
              <div className="rounded-xl border bg-error/10 border-error/20 px-4 py-3 text-sm font-medium text-error">
                <i className="fa-solid fa-circle-xmark mr-2" />{sheetsError}
              </div>
            )}

            {!showNewSheet ? (
              <button
                onClick={() => { setShowNewSheet(true); setSheetsError(null); setSheetsMsg(null); }}
                className="glass-panel rounded-xl border border-dashed border-outline-variant/20 p-4 w-full hover:border-emerald-400/30 transition-all group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                    <i className="fa-solid fa-plus text-on-surface-variant/40 group-hover:text-emerald-400 text-sm transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Add Google Sheet</p>
                    <p className="text-[11px] text-on-surface-variant/40">Create a new spreadsheet or link an existing one.</p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
                <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Add Google Sheet</h4>
                  <button onClick={() => { setShowNewSheet(false); setSheetsError(null); }} className="text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors">Cancel</button>
                </div>
                <div className="p-5 space-y-5">
                  <div className="flex gap-2">
                    <button onClick={() => setNewSheetMode("create")}
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                        newSheetMode === "create" ? "bg-emerald-500/10 text-emerald-400 border-emerald-400/20" : "text-on-surface-variant/60 border-outline-variant/15 hover:border-emerald-400/30"
                      }`}><i className="fa-solid fa-file-circle-plus text-[11px]" />Create New</button>
                    <button onClick={() => setNewSheetMode("existing")}
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                        newSheetMode === "existing" ? "bg-emerald-500/10 text-emerald-400 border-emerald-400/20" : "text-on-surface-variant/60 border-outline-variant/15 hover:border-emerald-400/30"
                      }`}><i className="fa-solid fa-link text-[11px]" />Link Existing</button>
                  </div>
                  {newSheetMode === "create" ? (
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant/60 mb-1.5">Spreadsheet Title</label>
                      <input value={newSheetTitle} onChange={(e) => setNewSheetTitle(e.target.value)}
                        placeholder={`${schema.steps[0]?.title ?? "Form"} Submissions`}
                        className="block w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-emerald-400/40 outline-none" />
                      <p className="text-[11px] text-on-surface-variant/40 mt-1.5">A new Google Sheet will be created with column headers matching your form fields.</p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant/60 mb-1.5">Spreadsheet URL</label>
                      <input value={existingSheetUrl} onChange={(e) => setExistingSheetUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="block w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-emerald-400/40 outline-none font-mono" />
                      <p className="text-[11px] text-on-surface-variant/40 mt-1.5">Paste the full URL. Submissions will be appended as new rows to Sheet1.</p>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button onClick={() => { setShowNewSheet(false); setSheetsError(null); }}
                      className="px-4 py-2 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-emerald-400/30 transition-all">Cancel</button>
                    <button onClick={handleAddSheetsFeed} disabled={sheetsAdding}
                      className="px-5 py-2 text-xs font-bold bg-emerald-500 text-white rounded-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-60">
                      {sheetsAdding ? "Working..." : newSheetMode === "create" ? "Create & Link" : "Link Sheet"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {sheetsFeeds.length === 0 && !showNewSheet && (
              <div className="glass-panel rounded-xl border border-outline-variant/15 p-5">
                <p className="text-xs text-on-surface-variant/60 leading-relaxed">Link a Google Sheet to automatically sync every submission as a new row.</p>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Webhooks ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-bolt text-primary/60 text-sm" />
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Webhook Feeds</h3>
        </div>

        {!editing && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button key={p.id} onClick={() => handleNew(p.id)}
                className="glass-panel rounded-xl border border-outline-variant/15 p-4 hover:border-primary/30 transition-all group text-left">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center">
                    <i className={`fa-solid ${p.icon} ${p.color}`} />
                  </div>
                  <span className="text-sm font-bold text-on-surface">{p.label}</span>
                </div>
                <p className="text-[11px] text-on-surface-variant/60">{p.desc}</p>
                <span className="text-xs text-primary font-bold mt-2 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                  Add <i className="fa-solid fa-plus text-[10px] ml-1" />
                </span>
              </button>
            ))}
          </div>
        )}

        {!editing && webhooks.length > 0 && (
          <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
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
                            wh.is_enabled ? "text-tertiary bg-tertiary/10" : "text-on-surface-variant/40 bg-surface-container-high"
                          }`}>{wh.is_enabled ? "Active" : "Off"}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant/40 truncate mt-0.5">{wh.webhook_url}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => handleTest(wh.id)} disabled={testing}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 hover:text-primary transition-all disabled:opacity-50">
                          <i className="fa-solid fa-paper-plane text-[9px] mr-1" />Test</button>
                        <button onClick={() => handleViewDeliveries(wh.id)}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 hover:text-primary transition-all">
                          <i className="fa-solid fa-list text-[9px] mr-1" />Log</button>
                        <button onClick={() => handleEdit(wh)}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/10 transition-all">Edit</button>
                        <button onClick={() => handleDelete(wh.id)} disabled={deleting}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-error border border-error/20 rounded-lg hover:bg-error/10 transition-all disabled:opacity-50">
                          <i className="fa-solid fa-trash text-[9px]" /></button>
                      </div>
                    </div>

                    {showDeliveries === wh.id && (
                      <div className="px-5 pb-4">
                        <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 overflow-hidden">
                          <div className="px-4 py-2 border-b border-outline-variant/10">
                            <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Recent Deliveries</span>
                          </div>
                          {deliveries.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-on-surface-variant/40">No deliveries yet.</div>
                          ) : (
                            <div className="divide-y divide-outline-variant/5">
                              {deliveries.map((d) => (
                                <div key={d.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${d.status === "success" ? "bg-tertiary" : "bg-error"}`} />
                                  <span className="font-medium text-on-surface">{d.status === "success" ? "OK" : "Failed"}{d.status_code && ` (${d.status_code})`}</span>
                                  {d.duration_ms != null && <span className="text-on-surface-variant/40">{d.duration_ms}ms</span>}
                                  {d.error_message && <span className="text-error/60 truncate flex-1">{d.error_message}</span>}
                                  <span className="text-on-surface-variant/30 shrink-0">{new Date(d.created_at).toLocaleString()}</span>
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
          </div>
        )}

        {testResult && (
          <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            testResult.ok ? "bg-tertiary/10 border-tertiary/20 text-tertiary" : "bg-error/10 border-error/20 text-error"
          }`}>
            <i className={`fa-solid ${testResult.ok ? "fa-circle-check" : "fa-circle-xmark"} mr-2`} />{testResult.msg}
          </div>
        )}

        {editing && (
          <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{editing.id ? "Edit Webhook" : "New Webhook"}</h4>
              <button onClick={() => { setEditing(null); setWhError(null); }} className="text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors">Cancel</button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex gap-2">
                {PROVIDERS.map((p) => (
                  <button key={p.id} onClick={() => setEditing({ ...editing, provider: p.id })}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                      editing.provider === p.id ? "bg-primary/10 text-primary border-primary/20" : "text-on-surface-variant/60 border-outline-variant/15 hover:border-primary/30"
                    }`}><i className={`fa-solid ${p.icon} ${editing.provider === p.id ? "text-primary" : p.color}`} />{p.label}</button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant/60 mb-1.5">Name</label>
                <input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="block w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none"
                  placeholder="e.g. Send to Slack via Zapier" />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant/60 mb-1.5">Webhook URL</label>
                <input value={editing.webhook_url ?? ""} onChange={(e) => setEditing({ ...editing, webhook_url: e.target.value })}
                  className="block w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none font-mono"
                  placeholder={editing.provider === "make" ? "https://hook.us1.make.com/..." : "https://hooks.zapier.com/hooks/catch/..."} />
                <p className="text-[11px] text-on-surface-variant/40 mt-1.5">
                  {editing.provider === "zapier" && 'Create a Zap with "Webhooks by Zapier" as the trigger, choose "Catch Hook", and paste the URL here.'}
                  {editing.provider === "make" && 'Add a "Custom Webhook" module in Make and paste the webhook URL here.'}
                  {editing.provider === "custom" && "Enter any HTTPS endpoint that accepts POST requests with JSON."}
                </p>
              </div>
              {editing.provider === "custom" && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant/60 mb-1.5">Signing Secret <span className="font-normal text-on-surface-variant/40">(optional)</span></label>
                  <input value={editing.signing_secret ?? ""} onChange={(e) => setEditing({ ...editing, signing_secret: e.target.value })}
                    className="block w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none font-mono"
                    placeholder="whsec_..." />
                  <p className="text-[11px] text-on-surface-variant/40 mt-1.5">Payload signed with HMAC-SHA256 in the X-Linqme-Signature header.</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">Enabled</p>
                  <p className="text-[11px] text-on-surface-variant/40">Submissions won&apos;t fire this webhook when disabled.</p>
                </div>
                <button onClick={() => setEditing({ ...editing, is_enabled: !editing.is_enabled })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${editing.is_enabled ? "bg-primary" : "bg-surface-container-highest"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editing.is_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Field mapping */}
              <div className="border-t border-outline-variant/10 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Field Mapping</p>
                    <p className="text-[11px] text-on-surface-variant/40">
                      {editing.field_map ? "Choose which fields to send and customize key names." : "All form fields will be sent. Enable mapping to customize."}
                    </p>
                  </div>
                  <button onClick={toggleFieldMapping}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                      editing.field_map ? "bg-primary/10 text-primary border-primary/20" : "text-on-surface-variant/60 border-outline-variant/15 hover:border-primary/30"
                    }`}>{editing.field_map ? "Send All Fields" : "Customize Fields"}</button>
                </div>
                {editing.field_map && (
                  <div className="space-y-2">
                    {editing.field_map.map((m) => {
                      const field = allFields.find((f) => f.id === m.fieldId);
                      return (
                        <div key={m.fieldId} className="flex items-center gap-2 bg-surface-container-lowest rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-on-surface truncate">{field?.label ?? m.fieldId}</p>
                            <p className="text-[10px] text-on-surface-variant/40">{field?.stepTitle}</p>
                          </div>
                          <i className="fa-solid fa-arrow-right text-[9px] text-on-surface-variant/30 shrink-0" />
                          <input value={m.key} onChange={(e) => updateMapping(m.fieldId, e.target.value)}
                            className="w-36 px-2 py-1.5 text-xs bg-surface-container border-0 rounded text-on-surface font-mono focus:ring-1 focus:ring-primary/40 outline-none" placeholder="key_name" />
                          <button onClick={() => removeMapping(m.fieldId)} className="text-on-surface-variant/30 hover:text-error transition-colors shrink-0">
                            <i className="fa-solid fa-xmark text-xs" />
                          </button>
                        </div>
                      );
                    })}
                    {allFields.filter((f) => !editing.field_map?.some((m) => m.fieldId === f.id)).length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest mb-1.5">Available Fields</p>
                        <div className="flex flex-wrap gap-1.5">
                          {allFields.filter((f) => !editing.field_map?.some((m) => m.fieldId === f.id)).map((f) => (
                            <button key={f.id} onClick={() => addMapping(f.id)}
                              className="px-2.5 py-1 text-[10px] text-on-surface-variant/60 bg-surface-container-highest rounded-full hover:text-primary hover:bg-primary/10 transition-all">
                              <i className="fa-solid fa-plus text-[8px] mr-1" />{f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {whError && (
                <div className="rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-xs text-error font-medium">{whError}</div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={() => { setEditing(null); setWhError(null); }}
                  className="px-4 py-2 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 transition-all">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-primary text-on-primary rounded-lg hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all disabled:opacity-60">
                  {saving ? "Saving..." : editing.id ? "Update Webhook" : "Add Webhook"}
                </button>
              </div>
            </div>
          </div>
        )}

        {!editing && webhooks.length === 0 && (
          <div className="glass-panel rounded-xl border border-outline-variant/15 p-5">
            <p className="text-xs text-on-surface-variant/60 leading-relaxed">
              Add a webhook to automatically send submission data to Zapier, Make, or any custom endpoint.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
