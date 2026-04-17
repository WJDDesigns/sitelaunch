"use client";

import { useState, useTransition } from "react";
import { dismissAnnouncementAction } from "@/app/dashboard/admin/announce/actions";

type AnnouncementType = "info" | "warning" | "success" | "urgent";

interface Announcement {
  id: string;
  title: string;
  message: string;
  icon: string;
  type: AnnouncementType;
}

const TYPE_STYLES: Record<AnnouncementType, { bg: string; border: string; text: string; dismiss: string }> = {
  info: {
    bg: "bg-primary/[0.08]",
    border: "border-primary/20",
    text: "text-primary",
    dismiss: "hover:bg-primary/10 text-primary/40 hover:text-primary",
  },
  warning: {
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
    text: "text-amber-400",
    dismiss: "hover:bg-amber-500/10 text-amber-400/40 hover:text-amber-400",
  },
  success: {
    bg: "bg-tertiary/[0.08]",
    border: "border-tertiary/20",
    text: "text-tertiary",
    dismiss: "hover:bg-tertiary/10 text-tertiary/40 hover:text-tertiary",
  },
  urgent: {
    bg: "bg-error/[0.08]",
    border: "border-error/20",
    text: "text-error",
    dismiss: "hover:bg-error/10 text-error/40 hover:text-error",
  },
};

interface Props {
  announcements: Announcement[];
}

export default function AnnouncementBanner({ announcements }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  function handleDismiss(id: string) {
    // Optimistic UI: hide immediately
    setDismissed((prev) => new Set([...prev, id]));
    // Persist dismissal in background
    startTransition(async () => {
      await dismissAnnouncementAction(id);
    });
  }

  return (
    <div className="space-y-0">
      {visible.map((a) => {
        const style = TYPE_STYLES[a.type] ?? TYPE_STYLES.info;
        return (
          <div
            key={a.id}
            className={`flex items-center gap-3 px-5 py-2 ${style.bg} ${style.border} ${style.text} animate-in fade-in slide-in-from-top-2 duration-300`}
          >
            <i className={`fa-solid ${a.icon} text-sm shrink-0`} />
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm font-bold shrink-0">{a.title}</span>
              <span className="text-sm opacity-80 truncate">{a.message}</span>
            </div>
            <button
              onClick={() => handleDismiss(a.id)}
              className={`w-6 h-6 flex items-center justify-center rounded-md transition-all shrink-0 ${style.dismiss}`}
              title="Dismiss"
            >
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
