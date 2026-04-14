"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteSubmissionAction,
  bulkDeleteSubmissionsAction,
  bulkUpdateStatusAction,
  updateSubmissionStatusAction,
} from "./actions";

interface SubmissionRow {
  id: string;
  status: string;
  client_name: string | null;
  client_email: string | null;
  submitted_at: string | null;
  created_at: string;
  partner_name: string | null;
  partner_color: string | null;
  partner_logo: string | null;
}

interface Props {
  submissions: SubmissionRow[];
  isSuperadmin: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  submitted: "bg-primary/10 text-primary border border-primary/20",
  in_review: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  complete: "bg-tertiary/10 text-tertiary border border-tertiary/20",
  archived: "bg-surface-container-high text-on-surface-variant/60",
};

const STATUSES = ["draft", "submitted", "in_review", "complete", "archived"] as const;

export default function SubmissionsList({ submissions, isSuperadmin }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pending, startTransition] = useTransition();
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          (s.client_name ?? "").toLowerCase().includes(q) ||
          (s.client_email ?? "").toLowerCase().includes(q) ||
          (s.partner_name ?? "").toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [submissions, search, statusFilter]);

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function doAction(fn: () => Promise<void>, msg: string) {
    setActionMsg(null);
    startTransition(async () => {
      try {
        await fn();
        setActionMsg(msg);
        setSelected(new Set());
        setConfirmDelete(null);
        setConfirmBulkDelete(false);
        router.refresh();
        setTimeout(() => setActionMsg(null), 3000);
      } catch (e) {
        setActionMsg((e as Error).message);
      }
    });
  }

  function handleDeleteOne(id: string) {
    doAction(() => deleteSubmissionAction(id), "Submission deleted.");
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    doAction(() => bulkDeleteSubmissionsAction(ids), `${ids.length} submission${ids.length > 1 ? "s" : ""} deleted.`);
  }

  function handleBulkStatus(status: string) {
    const ids = Array.from(selected);
    doAction(
      () => bulkUpdateStatusAction(ids, status as "draft" | "submitted" | "in_review" | "complete" | "archived"),
      `${ids.length} submission${ids.length > 1 ? "s" : ""} marked as ${status}.`,
    );
  }

  function handleStatusChange(id: string, status: string) {
    doAction(
      () => updateSubmissionStatusAction(id, status as "draft" | "submitted" | "in_review" | "complete" | "archived"),
      "Status updated.",
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant/40" />
          <input
            type="text"
            placeholder="Search by name, email, or partner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none transition-all"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest bg-surface-container-lowest border-0 rounded-xl text-on-surface focus:ring-1 focus:ring-primary/40 outline-none cursor-pointer"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>

        {/* CSV Export */}
        <a
          href="/dashboard/submissions/export"
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-xl hover:border-primary/30 hover:text-primary transition-all"
        >
          <i className="fa-solid fa-file-csv text-xs" />
          Export CSV
        </a>

        {/* Count */}
        <span className="text-xs text-on-surface-variant/50">
          {filtered.length} submission{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Bulk actions bar */}
      {someSelected && (
        <div className="flex items-center gap-3 px-5 py-3 bg-primary/5 border border-primary/15 rounded-xl">
          <span className="text-xs font-bold text-primary">
            {selected.size} selected
          </span>
          <div className="h-4 w-px bg-primary/20" />

          {/* Bulk status change */}
          <select
            onChange={(e) => {
              if (e.target.value) handleBulkStatus(e.target.value);
              e.target.value = "";
            }}
            disabled={pending}
            className="px-3 py-1.5 text-xs font-bold bg-surface-container-lowest border-0 rounded-lg text-on-surface focus:ring-1 focus:ring-primary/40 outline-none cursor-pointer disabled:opacity-50"
            defaultValue=""
          >
            <option value="" disabled>
              Change status...
            </option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                Mark as {s.replace("_", " ")}
              </option>
            ))}
          </select>

          {/* Bulk delete */}
          {confirmBulkDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-error font-bold">Delete {selected.size}?</span>
              <button
                onClick={handleBulkDelete}
                disabled={pending}
                className="px-3 py-1.5 text-xs font-bold bg-error text-on-error rounded-lg disabled:opacity-50"
              >
                {pending ? "Deleting..." : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmBulkDelete(false)}
                className="text-xs text-on-surface-variant/60 hover:text-on-surface"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="px-3 py-1.5 text-xs font-bold text-error/70 hover:text-error transition-colors"
            >
              <i className="fa-solid fa-trash text-[10px] mr-1" />
              Delete
            </button>
          )}

          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Action feedback */}
      {actionMsg && (
        <div className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
          actionMsg.includes("deleted") || actionMsg.includes("updated") || actionMsg.includes("marked")
            ? "bg-tertiary/10 text-tertiary border border-tertiary/20"
            : "bg-error/10 text-error border border-error/20"
        }`}>
          {actionMsg}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-container rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
        {filtered.length === 0 ? (
          <div className="p-8 text-sm text-on-surface-variant text-center">
            {search || statusFilter !== "all"
              ? "No submissions match your filters."
              : "No submissions yet."}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-12 px-5 md:px-8 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant/70 font-bold border-b border-outline-variant/10 gap-2">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-outline-variant/30 text-primary focus:ring-primary/40 cursor-pointer"
                />
              </div>
              <div className="col-span-3">Client</div>
              <div className="col-span-2 hidden md:block">Partner</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 hidden md:block">Received</div>
              <div className="col-span-2" />
            </div>

            {/* Rows */}
            <div className="divide-y divide-outline-variant/5">
              {filtered.map((s) => {
                const when = s.submitted_at || s.created_at;
                const isSelected = selected.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={`grid grid-cols-12 px-5 md:px-8 py-4 items-center transition-colors gap-2 ${
                      isSelected ? "bg-primary/5" : "hover:bg-white/[0.02]"
                    } group`}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(s.id)}
                        className="w-3.5 h-3.5 rounded border-outline-variant/30 text-primary focus:ring-primary/40 cursor-pointer"
                      />
                    </div>

                    {/* Client */}
                    <div className="col-span-3">
                      <p className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors truncate">
                        {s.client_name || "\u2014"}
                      </p>
                      <p className="text-xs text-on-surface-variant/60 truncate">{s.client_email || "no email yet"}</p>
                    </div>

                    {/* Partner */}
                    <div className="col-span-2 hidden md:flex items-center gap-2">
                      {s.partner_logo ? (
                        <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.partner_logo} alt="" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center text-on-primary text-[8px] font-bold shrink-0"
                          style={{ backgroundColor: s.partner_color || "#696cf8" }}
                        >
                          {s.partner_name?.slice(0, 1).toUpperCase() ?? "?"}
                        </div>
                      )}
                      <span className="text-xs text-on-surface truncate">{s.partner_name ?? "\u2014"}</span>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <select
                        value={s.status}
                        onChange={(e) => handleStatusChange(s.id, e.target.value)}
                        disabled={pending}
                        className={`appearance-none px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter cursor-pointer border-0 outline-none disabled:opacity-50 ${
                          STATUS_STYLES[s.status] ?? STATUS_STYLES.draft
                        }`}
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 hidden md:block text-xs text-on-surface">
                      {when ? new Date(when).toLocaleDateString() : "\u2014"}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <a
                        href={`/dashboard/submissions/${s.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        title="Export as PDF"
                        className="text-xs text-on-surface-variant/40 hover:text-primary transition-colors p-1"
                      >
                        <i className="fa-solid fa-file-pdf" />
                      </a>
                      {confirmDelete === s.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteOne(s.id)}
                            disabled={pending}
                            className="text-[10px] font-bold text-error px-2 py-1 rounded bg-error/10 disabled:opacity-50"
                          >
                            {pending ? "..." : "Yes"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-[10px] text-on-surface-variant/60 px-1"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(s.id)}
                          title="Delete"
                          className="text-xs text-on-surface-variant/40 hover:text-error transition-colors p-1"
                        >
                          <i className="fa-solid fa-trash text-[10px]" />
                        </button>
                      )}
                      <Link
                        href={`/dashboard/submissions/${s.id}`}
                        className="text-xs font-bold text-primary hover:underline ml-1"
                      >
                        View <i className="fa-solid fa-arrow-right text-[10px] ml-0.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
