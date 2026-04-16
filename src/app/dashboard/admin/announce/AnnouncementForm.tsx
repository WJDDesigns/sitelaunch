"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import IconPicker from "@/components/IconPicker";
import {
  createAnnouncementAction,
  updateAnnouncementAction,
  deleteAnnouncementAction,
  type AnnouncementType,
  type AnnouncementAudience,
  type AnnouncementRow,
} from "./actions";

const TYPE_OPTIONS: { value: AnnouncementType; label: string; color: string; icon: string }[] = [
  { value: "info", label: "Info", color: "bg-primary/10 text-primary border-primary/20", icon: "fa-circle-info" },
  { value: "warning", label: "Warning", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: "fa-triangle-exclamation" },
  { value: "success", label: "Success", color: "bg-tertiary/10 text-tertiary border-tertiary/20", icon: "fa-circle-check" },
  { value: "urgent", label: "Urgent", color: "bg-error/10 text-error border-error/20", icon: "fa-circle-exclamation" },
];

const AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string; description: string }[] = [
  { value: "all", label: "Everyone", description: "All users see this announcement" },
  { value: "partners", label: "Partners only", description: "Partner owners and members" },
  { value: "agency_owners", label: "Agency owners", description: "Partner owners and superadmins" },
  { value: "superadmins", label: "Superadmins only", description: "Platform administrators only" },
];

interface Props {
  existing?: AnnouncementRow;
  onCancel?: () => void;
}

export default function AnnouncementForm({ existing, onCancel }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(existing?.title ?? "");
  const [message, setMessage] = useState(existing?.message ?? "");
  const [icon, setIcon] = useState(existing?.icon ?? "fa-bullhorn");
  const [type, setType] = useState<AnnouncementType>(existing?.type ?? "info");
  const [audience, setAudience] = useState<AnnouncementAudience>(existing?.audience ?? "all");
  const [scheduleMode, setScheduleMode] = useState<"now" | "scheduled">(
    existing?.scheduled_at ? "scheduled" : "now",
  );
  const [scheduledAt, setScheduledAt] = useState(existing?.scheduled_at?.slice(0, 16) ?? "");
  const [expiresAt, setExpiresAt] = useState(existing?.expires_at?.slice(0, 16) ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSubmit() {
    setMsg(null);
    startTransition(async () => {
      const payload = {
        title,
        message,
        icon,
        type,
        audience,
        scheduledAt: scheduleMode === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      const result = existing
        ? await updateAnnouncementAction(existing.id, { ...payload, isActive: existing.is_active })
        : await createAnnouncementAction(payload);

      if (result.ok) {
        setMsg(existing ? "Updated!" : "Published!");
        if (!existing) {
          // Reset form
          setTitle("");
          setMessage("");
          setIcon("fa-bullhorn");
          setType("info");
          setAudience("all");
          setScheduleMode("now");
          setScheduledAt("");
          setExpiresAt("");
        }
        router.refresh();
      } else {
        setMsg(result.error ?? "Failed.");
      }
    });
  }

  function handleDelete() {
    if (!existing) return;
    startTransition(async () => {
      const result = await deleteAnnouncementAction(existing.id);
      if (result.ok) {
        router.refresh();
        onCancel?.();
      } else {
        setMsg(result.error ?? "Failed.");
      }
    });
  }

  function handleToggleActive() {
    if (!existing) return;
    startTransition(async () => {
      const result = await updateAnnouncementAction(existing.id, {
        title: existing.title,
        message: existing.message,
        icon: existing.icon,
        type: existing.type,
        audience: existing.audience,
        isActive: !existing.is_active,
        scheduledAt: existing.scheduled_at,
        expiresAt: existing.expires_at,
      });
      if (result.ok) router.refresh();
      else setMsg(result.error ?? "Failed.");
    });
  }

  const selectedType = TYPE_OPTIONS.find((t) => t.value === type)!;

  return (
    <div className="space-y-5">
      {/* Preview banner */}
      {title && (
        <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border ${selectedType.color}`}>
          <i className={`fa-solid ${icon} text-sm`} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold">{title}</span>
            {message && <span className="text-sm ml-2 opacity-80">{message}</span>}
          </div>
          <i className="fa-solid fa-xmark text-xs opacity-40" />
        </div>
      )}

      {/* Title */}
      <label className="block">
        <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New feature available!"
          className="mt-1.5 w-full px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none"
        />
      </label>

      {/* Message */}
      <label className="block">
        <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="We've just launched per-form notification settings. Check it out in your form settings!"
          rows={3}
          className="mt-1.5 w-full px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none resize-none"
        />
      </label>

      {/* Icon */}
      <div>
        <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest block mb-1.5">Icon</span>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      {/* Type */}
      <div>
        <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest block mb-2">Style</span>
        <div className="flex gap-2 flex-wrap">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                type === opt.value ? opt.color : "border-outline-variant/15 text-on-surface-variant/60 hover:border-primary/30"
              }`}
            >
              <i className={`fa-solid ${opt.icon} text-[10px]`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audience */}
      <div>
        <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest block mb-2">Audience</span>
        <div className="grid grid-cols-2 gap-2">
          {AUDIENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAudience(opt.value)}
              className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                audience === opt.value
                  ? "border-primary/30 bg-primary/5"
                  : "border-outline-variant/15 hover:border-primary/20"
              }`}
            >
              <span className={`text-xs font-bold block ${audience === opt.value ? "text-primary" : "text-on-surface"}`}>
                {opt.label}
              </span>
              <span className="text-[10px] text-on-surface-variant/60">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div>
        <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest block mb-2">When</span>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setScheduleMode("now")}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
              scheduleMode === "now"
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-outline-variant/15 text-on-surface-variant/60"
            }`}
          >
            <i className="fa-solid fa-bolt text-[10px] mr-1" />
            Publish now
          </button>
          <button
            type="button"
            onClick={() => setScheduleMode("scheduled")}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
              scheduleMode === "scheduled"
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-outline-variant/15 text-on-surface-variant/60"
            }`}
          >
            <i className="fa-solid fa-clock text-[10px] mr-1" />
            Schedule
          </button>
        </div>

        {scheduleMode === "scheduled" && (
          <label className="block mb-3">
            <span className="text-xs font-medium text-on-surface">Start showing at</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-1 w-full px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface focus:ring-1 focus:ring-primary/40 outline-none"
            />
          </label>
        )}

        <label className="block">
          <span className="text-xs font-medium text-on-surface">Auto-expire at <span className="text-on-surface-variant/60">(optional)</span></span>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="mt-1 w-full px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface focus:ring-1 focus:ring-primary/40 outline-none"
          />
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !title.trim() || !message.trim()}
          className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm disabled:opacity-50 transition-all"
        >
          {pending ? "Saving..." : existing ? "Update" : scheduleMode === "now" ? "Publish now" : "Schedule"}
        </button>

        {existing && (
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={pending}
            className="px-4 py-2.5 text-xs font-bold border border-outline-variant/15 rounded-xl hover:border-primary/30 text-on-surface-variant hover:text-primary transition-all disabled:opacity-50"
          >
            {existing.is_active ? "Deactivate" : "Reactivate"}
          </button>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
        )}

        {existing && (
          <div className="ml-auto">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-error font-bold">Delete?</span>
                <button
                  onClick={handleDelete}
                  disabled={pending}
                  className="px-3 py-1.5 text-xs font-bold bg-error text-on-error rounded-lg disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-on-surface-variant/60"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-error/60 hover:text-error transition-colors"
              >
                <i className="fa-solid fa-trash text-[10px] mr-1" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {msg && (
        <p className={`text-xs font-medium ${msg.includes("!") ? "text-tertiary" : "text-error"}`}>{msg}</p>
      )}
    </div>
  );
}
