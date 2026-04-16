"use client";

import { useState } from "react";
import AnnouncementForm from "./AnnouncementForm";
import type { AnnouncementRow, AnnouncementType } from "./actions";

const TYPE_STYLES: Record<AnnouncementType, string> = {
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  success: "bg-tertiary/10 text-tertiary border-tertiary/20",
  urgent: "bg-error/10 text-error border-error/20",
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Everyone",
  partners: "Partners",
  agency_owners: "Agency owners",
  superadmins: "Superadmins",
};

interface Props {
  announcements: AnnouncementRow[];
}

export default function AnnouncementList({ announcements }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (announcements.length === 0) {
    return (
      <div className="text-center py-12">
        <i className="fa-solid fa-bullhorn text-3xl text-on-surface-variant/20 mb-3" />
        <p className="text-sm text-on-surface-variant/60">No announcements yet. Create your first one above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((a) => {
        if (editingId === a.id) {
          return (
            <div key={a.id} className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
              <AnnouncementForm existing={a} onCancel={() => setEditingId(null)} />
            </div>
          );
        }

        const isExpired = a.expires_at && new Date(a.expires_at) < new Date();
        const isScheduled = a.scheduled_at && new Date(a.scheduled_at) > new Date();

        return (
          <div
            key={a.id}
            className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:border-primary/20 ${
              a.is_active && !isExpired ? "border-outline-variant/15" : "border-outline-variant/10 opacity-50"
            }`}
            onClick={() => setEditingId(a.id)}
          >
            {/* Icon */}
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${TYPE_STYLES[a.type]}`}>
              <i className={`fa-solid ${a.icon} text-sm`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-on-surface truncate">{a.title}</span>
                {!a.is_active && (
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant/50">
                    Inactive
                  </span>
                )}
                {isScheduled && (
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                    Scheduled
                  </span>
                )}
                {isExpired && (
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant/50">
                    Expired
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant/60 truncate">{a.message}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] text-on-surface-variant/40">
                  <i className="fa-solid fa-users text-[8px] mr-1" />
                  {AUDIENCE_LABELS[a.audience] ?? a.audience}
                </span>
                <span className="text-[10px] text-on-surface-variant/40">
                  <i className="fa-solid fa-calendar text-[8px] mr-1" />
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
                {a.scheduled_at && (
                  <span className="text-[10px] text-on-surface-variant/40">
                    <i className="fa-solid fa-clock text-[8px] mr-1" />
                    Starts {new Date(a.scheduled_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Edit hint */}
            <i className="fa-solid fa-pen text-[10px] text-on-surface-variant/30 mt-1 shrink-0" />
          </div>
        );
      })}
    </div>
  );
}
