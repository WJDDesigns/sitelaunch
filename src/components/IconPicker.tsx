"use client";

import { useState, useMemo } from "react";

/** Curated list of commonly useful Font Awesome icons */
const ICONS = [
  // Communication
  "fa-bullhorn", "fa-bell", "fa-envelope", "fa-comment", "fa-comments", "fa-message",
  // Status / Alerts
  "fa-circle-info", "fa-triangle-exclamation", "fa-circle-check", "fa-circle-xmark",
  "fa-shield-halved", "fa-lock", "fa-unlock",
  // Actions
  "fa-rocket", "fa-bolt", "fa-fire", "fa-star", "fa-heart", "fa-thumbs-up",
  "fa-gift", "fa-trophy", "fa-medal", "fa-award", "fa-crown",
  // Business
  "fa-building", "fa-briefcase", "fa-chart-line", "fa-chart-pie",
  "fa-credit-card", "fa-money-bill-wave", "fa-coins", "fa-piggy-bank",
  // Tech
  "fa-code", "fa-bug", "fa-wrench", "fa-screwdriver-wrench", "fa-gear", "fa-gears",
  "fa-server", "fa-database", "fa-cloud",
  // People
  "fa-user", "fa-users", "fa-user-plus", "fa-user-check", "fa-people-group",
  "fa-handshake", "fa-hands-clapping",
  // Media
  "fa-image", "fa-camera", "fa-video", "fa-music", "fa-palette",
  // Navigation
  "fa-house", "fa-map-pin", "fa-globe", "fa-plane", "fa-car",
  // Calendar / Time
  "fa-calendar", "fa-clock", "fa-hourglass-half", "fa-stopwatch",
  // Objects
  "fa-book", "fa-graduation-cap", "fa-lightbulb", "fa-magnifying-glass",
  "fa-tag", "fa-tags", "fa-bookmark", "fa-flag", "fa-puzzle-piece",
  // Nature
  "fa-sun", "fa-moon", "fa-leaf", "fa-seedling", "fa-tree",
  // Misc
  "fa-wand-magic-sparkles", "fa-sparkles", "fa-hand-sparkles",
  "fa-circle-exclamation", "fa-info", "fa-question",
  "fa-check", "fa-xmark", "fa-plus", "fa-minus",
  "fa-arrow-up", "fa-arrow-right", "fa-arrow-down", "fa-arrow-left",
  "fa-link", "fa-paperclip", "fa-download", "fa-upload",
];

interface Props {
  value: string;
  onChange: (icon: string) => void;
}

export default function IconPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return ICONS;
    const q = search.toLowerCase().replace("fa-", "");
    return ICONS.filter((icon) => icon.replace("fa-", "").includes(q));
  }, [search]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-lowest rounded-xl border-0 text-on-surface hover:ring-1 hover:ring-primary/40 transition-all"
      >
        <i className={`fa-solid ${value || "fa-bullhorn"} text-primary`} />
        <span className="text-xs text-on-surface-variant/60">{value || "fa-bullhorn"}</span>
        <i className="fa-solid fa-chevron-down text-[8px] text-on-surface-variant/40 ml-1" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-surface-container rounded-2xl border border-outline-variant/15 shadow-2xl shadow-black/30 z-50 p-3">
          {/* Search */}
          <div className="relative mb-3">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant/40" />
            <input
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-on-surface-variant/40 border-0 focus:ring-1 focus:ring-primary/40 outline-none"
              autoFocus
            />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
            {filtered.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => {
                  onChange(icon);
                  setOpen(false);
                  setSearch("");
                }}
                title={icon.replace("fa-", "")}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                  value === icon
                    ? "bg-primary text-on-primary"
                    : "hover:bg-primary/10 text-on-surface-variant hover:text-primary"
                }`}
              >
                <i className={`fa-solid ${icon} text-sm`} />
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-xs text-on-surface-variant/60 text-center py-4">No icons found</p>
          )}

          {/* Custom input */}
          <div className="mt-3 pt-3 border-t border-outline-variant/10">
            <label className="flex items-center gap-2">
              <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-widest shrink-0">Custom:</span>
              <input
                type="text"
                placeholder="fa-custom-icon"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 px-2 py-1 text-xs bg-surface-container-lowest rounded-lg text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
