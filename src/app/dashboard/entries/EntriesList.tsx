"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Pagination from "@/components/Pagination";
import SmartOverviewBox from "../forms/[formId]/entries/SmartOverviewBox";

const PAGE_SIZE = 25;
import {
  deleteSubmissionAction,
  bulkDeleteSubmissionsAction,
  bulkUpdateStatusAction,
  updateSubmissionStatusAction,
} from "../submissions/actions";

interface SubmissionRow {
  id: string;
  status: string;
  client_name: string | null;
  client_email: string | null;
  submitted_at: string | null;
  created_at: string;
  partner_form_id: string | null;
  form_slug: string | null;
  form_name: string | null;
}

interface FormOption {
  id: string;
  slug: string;
  name: string;
}

interface CachedOverview {
  overview: string;
  generatedAt: string;
  entryCount: number;
}

interface Props {
  submissions: SubmissionRow[];
  forms: FormOption[];
  isSuperadmin: boolean;
  showSmartOverview?: boolean;
  overviewMap?: Record<string, CachedOverview>;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  submitted: "bg-primary/10 text-primary border border-primary/20",
  in_review: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  complete: "bg-tertiary/10 text-tertiary border border-tertiary/20",
  archived: "bg-surface-container-high text-on-surface-variant/60",
};

const STATUSES = ["draft", "submitted", "in_review", "complete", "archived"] as const;

/* ── Column definitions for global entries ─────────────── */
interface ColumnDef {
  id: string;
  label: string;
}

const GLOBAL_COLUMNS: ColumnDef[] = [
  { id: "client", label: "Client" },
  { id: "form", label: "Form" },
  { id: "status", label: "Status" },
  { id: "date", label: "Date" },
  { id: "created_at", label: "Created" },
  { id: "entry_id", label: "Entry ID" },
];

const DEFAULT_GLOBAL_COLS = ["client", "form", "status", "date"];

/* ── Column Customizer ─────────────────────────────────── */
function ColumnCustomizer({
  allColumns,
  activeIds,
  onUpdate,
}: {
  allColumns: ColumnDef[];
  activeIds: string[];
  onUpdate: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  const activeSet = new Set(activeIds);
  const inactive = allColumns.filter((c) => !activeSet.has(c.id));
  const active = activeIds.map((id) => allColumns.find((c) => c.id === id)!).filter(Boolean);

  const addColumn = (id: string) => onUpdate([...activeIds, id]);
  const removeColumn = (id: string) => onUpdate(activeIds.filter((i) => i !== id));
  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...activeIds];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onUpdate(next);
  };
  const moveDown = (idx: number) => {
    if (idx >= activeIds.length - 1) return;
    const next = [...activeIds];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onUpdate(next);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...activeIds];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    onUpdate(next);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
          open
            ? "bg-primary/10 text-primary border-primary/30"
            : "text-on-surface-variant/50 border-outline-variant/20 hover:bg-surface-container-high hover:text-on-surface-variant"
        }`}
        title="Customize columns"
      >
        <i className="fa-solid fa-table-columns text-xs" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant/10">
            <h3 className="text-sm font-bold text-on-surface">Customize Columns</h3>
            <p className="text-[11px] text-on-surface-variant/50 mt-0.5">Click to add/remove. Drag to reorder.</p>
          </div>

          <div className="flex divide-x divide-outline-variant/10 max-h-[300px]">
            {/* Available */}
            <div className="w-1/2 p-3 overflow-y-auto">
              <div className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-2">Available</div>
              {inactive.length === 0 ? (
                <p className="text-[11px] text-on-surface-variant/30 italic py-4 text-center">All columns active</p>
              ) : (
                <div className="space-y-1">
                  {inactive.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => addColumn(col.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-on-surface-variant/70 hover:bg-primary/5 hover:text-primary transition-colors group text-left"
                    >
                      <i className="fa-solid fa-plus text-[8px] opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                      <span className="truncate flex-1">{col.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Active */}
            <div className="w-1/2 p-3 overflow-y-auto">
              <div className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-2">Active ({active.length})</div>
              <div className="space-y-1">
                {active.map((col, idx) => (
                  <div
                    key={col.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs transition-colors group ${
                      dragIdx === idx ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-surface-container-high"
                    }`}
                  >
                    <i className="fa-solid fa-grip-vertical text-[8px] text-on-surface-variant/20 cursor-grab" />
                    <span className="truncate flex-1 text-on-surface">{col.label}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveUp(idx)} className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant/40 hover:text-primary hover:bg-primary/5" title="Move up">
                        <i className="fa-solid fa-chevron-up text-[7px]" />
                      </button>
                      <button onClick={() => moveDown(idx)} className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant/40 hover:text-primary hover:bg-primary/5" title="Move down">
                        <i className="fa-solid fa-chevron-down text-[7px]" />
                      </button>
                      <button onClick={() => removeColumn(col.id)} className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/5" title="Remove">
                        <i className="fa-solid fa-xmark text-[8px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 border-t border-outline-variant/10 flex justify-between items-center">
            <button onClick={() => onUpdate(DEFAULT_GLOBAL_COLS)} className="text-[11px] text-on-surface-variant/50 hover:text-primary transition-colors">
              Reset to defaults
            </button>
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary transition-all hover:opacity-90">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EntriesList({ submissions, forms, isSuperadmin, showSmartOverview, overviewMap }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFormId = searchParams.get("form") ?? "";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(["submitted"]));
  const [formFilter, setFormFilter] = useState(initialFormId);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "status">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [page, setPage] = useState(1);
  const [activeCols, setActiveCols] = useState<string[]>(DEFAULT_GLOBAL_COLS);
  const activeColSet = useMemo(() => new Set(activeCols), [activeCols]);

  const filtered = useMemo(() => {
    let list = submissions;
    if (formFilter) list = list.filter((s) => s.partner_form_id === formFilter);
    if (statusFilter.size > 0) list = list.filter((s) => statusFilter.has(s.status));
    if (dateRange !== "all") {
      const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      list = list.filter((s) => new Date(s.submitted_at ?? s.created_at) >= cutoff);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.client_name ?? "").toLowerCase().includes(q) ||
          (s.client_email ?? "").toLowerCase().includes(q),
      );
    }

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") {
        cmp = new Date(a.submitted_at ?? a.created_at).getTime() - new Date(b.submitted_at ?? b.created_at).getTime();
      } else if (sortBy === "name") {
        cmp = (a.client_name ?? "").localeCompare(b.client_name ?? "");
      } else if (sortBy === "status") {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [submissions, formFilter, statusFilter, dateRange, search, sortBy, sortDir]);

  const paginatedEntries = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Reset page when filters reduce results
  useMemo(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > maxPage) setPage(1);
  }, [filtered.length, page]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleStatusFilter = (val: string) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      setPage(1);
      return next;
    });
  };
  const setAllStatuses = () => {
    setStatusFilter(new Set());
    setPage(1);
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      await updateSubmissionStatusAction(id, status as (typeof STATUSES)[number]);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteSubmissionAction(id);
      setConfirmDelete(null);
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
      router.refresh();
    });
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      await bulkDeleteSubmissionsAction(Array.from(selected));
      setSelected(new Set());
      setConfirmBulkDelete(false);
      router.refresh();
    });
  };

  const handleBulkStatus = (status: string) => {
    startTransition(async () => {
      await bulkUpdateStatusAction(Array.from(selected), status as (typeof STATUSES)[number]);
      setSelected(new Set());
      router.refresh();
    });
  };

  const activeFormName = forms.find((f) => f.id === formFilter)?.name;

  const [exporting, setExporting] = useState(false);

  function exportCSV() {
    setExporting(true);
    // Use setTimeout to let React update the button state before generating
    setTimeout(() => {
      const headers = ["Name", "Email", "Form", "Status", "Date"];
      const rows = filtered.map((r) => [
        r.client_name ?? "",
        r.client_email ?? "",
        r.form_name ?? "",
        r.status,
        r.submitted_at ?? r.created_at,
      ]);

      const escape = (s: string) => {
        // Prevent CSV injection
        if (/^[=+\-@]/.test(s)) s = "'" + s;
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = activeFormName ? activeFormName.replace(/[^a-zA-Z0-9]/g, "_") : "all";
      a.download = `entries_${suffix}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      // Show brief "exported" state
      setTimeout(() => setExporting(false), 1500);
    }, 50);
  }

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-xs" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface-container border border-outline-variant/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary/40 focus:outline-none transition-colors"
          />
        </div>

        {/* Form filter */}
        <select
          value={formFilter}
          onChange={(e) => setFormFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-surface-container border border-outline-variant/15 rounded-lg text-on-surface-variant focus:border-primary/40 focus:outline-none transition-colors"
        >
          <option value="">All forms</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={setAllStatuses}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              statusFilter.size === 0
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-on-surface-variant/60 border-outline-variant/20 hover:bg-surface-container-high"
            }`}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                statusFilter.has(s)
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-on-surface-variant/60 border-outline-variant/20 hover:bg-surface-container-high"
              }`}
            >
              {s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center rounded-lg border border-outline-variant/15 overflow-hidden">
          {(["7d", "30d", "90d", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-2.5 py-2 text-xs font-medium transition-colors ${
                dateRange === range
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-on-surface-variant/60 hover:bg-surface-container-high hover:text-on-surface-variant"
              }`}
            >
              {range === "all" ? "All" : range.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Export CSV */}
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0 || exporting}
          className={`px-3 py-2 text-xs font-bold border rounded-lg transition-all disabled:cursor-not-allowed flex items-center gap-1.5 ${
            exporting
              ? "text-tertiary border-tertiary/30 bg-tertiary/5"
              : "text-primary border-primary/20 hover:bg-primary/5 disabled:opacity-40"
          }`}
        >
          <i className={`fa-solid ${exporting ? "fa-circle-check" : "fa-file-csv"} text-[10px]`} />
          {exporting ? `Exported ${filtered.length} rows` : `Export CSV (${filtered.length})`}
        </button>
        <ColumnCustomizer
          allColumns={GLOBAL_COLUMNS}
          activeIds={activeCols}
          onUpdate={setActiveCols}
        />
      </div>

      {/* Active form banner */}
      {activeFormName && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/15 rounded-xl text-sm">
          <i className="fa-solid fa-filter text-primary text-xs" />
          <span className="text-on-surface-variant">Showing entries for</span>
          <span className="font-bold text-primary">{activeFormName}</span>
          <Link
            href={`/dashboard/forms/${formFilter}/entries`}
            className="ml-2 text-xs text-primary/70 hover:text-primary transition-colors underline underline-offset-2"
          >
            Open dedicated view
          </Link>
          <button onClick={() => setFormFilter("")} className="ml-auto text-xs text-on-surface-variant/50 hover:text-error transition-colors">
            <i className="fa-solid fa-xmark" /> Clear
          </button>
        </div>
      )}

      {/* Smart Overview -- shown when filtering to a single form */}
      {showSmartOverview && formFilter && (
        <SmartOverviewBox
          formId={formFilter}
          currentEntryCount={filtered.length}
          cachedOverview={overviewMap?.[formFilter] ?? null}
        />
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-high rounded-xl border border-outline-variant/10">
          <span className="text-xs font-bold text-on-surface">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <select
              onChange={(e) => { if (e.target.value) handleBulkStatus(e.target.value); e.target.value = ""; }}
              className="px-2 py-1 text-xs bg-surface-container border border-outline-variant/15 rounded-lg text-on-surface-variant focus:outline-none"
            >
              <option value="">Set status…</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="px-3 py-1 text-xs font-bold text-error border border-error/20 rounded-lg hover:bg-error/10 transition-all"
            >
              <i className="fa-solid fa-trash text-[10px] mr-1" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      {confirmBulkDelete && (
        <div className="flex items-center gap-3 px-4 py-3 bg-error/10 border border-error/20 rounded-xl">
          <i className="fa-solid fa-triangle-exclamation text-error" />
          <span className="text-sm text-on-surface">Delete {selected.size} entries? This cannot be undone.</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setConfirmBulkDelete(false)} className="px-3 py-1 text-xs font-bold border border-outline-variant/15 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all">Cancel</button>
            <button onClick={handleBulkDelete} disabled={isPending} className="px-3 py-1 text-xs font-bold text-white bg-error rounded-lg hover:bg-error/80 transition-all disabled:opacity-50">
              {isPending ? "Deleting…" : "Confirm Delete"}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-surface-container rounded-2xl p-12 text-center shadow-2xl shadow-black/20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-inbox text-xl text-primary" />
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">No entries yet</h3>
          <p className="text-sm text-on-surface-variant/60 max-w-sm mx-auto">
            {formFilter
              ? "No submissions found for this form. Try clearing the filter."
              : "When clients submit your forms, their entries will appear here."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10 text-left">
                  <th className="pl-4 py-3 w-10">
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll}
                      className="w-3.5 h-3.5 rounded border-outline-variant/30 text-primary focus:ring-primary/30 bg-transparent" />
                  </th>
                  {activeCols.map((col) => {
                    if (col === "client") return (
                      <th key={col} className="py-3 pr-4">
                        <button onClick={() => toggleSort("name")} className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 hover:text-on-surface transition-colors flex items-center gap-1">
                          Client
                          {sortBy === "name" && <i className={`fa-solid fa-chevron-${sortDir === "asc" ? "up" : "down"} text-[8px]`} />}
                        </button>
                      </th>
                    );
                    if (col === "form") return (
                      <th key={col} className="py-3 pr-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Form</span>
                      </th>
                    );
                    if (col === "status") return (
                      <th key={col} className="py-3 pr-4">
                        <button onClick={() => toggleSort("status")} className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 hover:text-on-surface transition-colors flex items-center gap-1">
                          Status
                          {sortBy === "status" && <i className={`fa-solid fa-chevron-${sortDir === "asc" ? "up" : "down"} text-[8px]`} />}
                        </button>
                      </th>
                    );
                    if (col === "date") return (
                      <th key={col} className="py-3 pr-4">
                        <button onClick={() => toggleSort("date")} className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 hover:text-on-surface transition-colors flex items-center gap-1">
                          Date
                          {sortBy === "date" && <i className={`fa-solid fa-chevron-${sortDir === "asc" ? "up" : "down"} text-[8px]`} />}
                        </button>
                      </th>
                    );
                    if (col === "created_at") return (
                      <th key={col} className="py-3 pr-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Created</span>
                      </th>
                    );
                    if (col === "entry_id") return (
                      <th key={col} className="py-3 pr-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Entry ID</span>
                      </th>
                    );
                    return null;
                  })}
                  <th className="py-3 pr-4 w-20">
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-outline-variant/[0.04] hover:bg-surface-container-high/40 transition-colors group"
                  >
                    <td className="pl-4 py-3">
                      <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleOne(row.id)}
                        className="w-3.5 h-3.5 rounded border-outline-variant/30 text-primary focus:ring-primary/30 bg-transparent" />
                    </td>
                    {activeColSet.has("client") && (
                      <td className="py-3 pr-4">
                        <Link href={`/dashboard/submissions/${row.id}`} className="block group/link">
                          <div className="font-medium text-on-surface group-hover/link:text-primary transition-colors truncate max-w-[200px]">
                            {row.client_name || "Unnamed"}
                          </div>
                          <div className="text-xs text-on-surface-variant/50 truncate max-w-[200px]">
                            {row.client_email || "No email"}
                          </div>
                        </Link>
                      </td>
                    )}
                    {activeColSet.has("form") && (
                      <td className="py-3 pr-4">
                        <span className="text-xs text-on-surface-variant/60 truncate max-w-[140px] block">
                          {row.form_name ?? "—"}
                        </span>
                      </td>
                    )}
                    {activeColSet.has("status") && (
                      <td className="py-3 pr-4">
                        <select
                          value={row.status}
                          onChange={(e) => handleStatusChange(row.id, e.target.value)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full appearance-none cursor-pointer focus:outline-none ${STATUS_STYLES[row.status] ?? STATUS_STYLES.draft}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s.replace("_", " ")}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {activeColSet.has("date") && (
                      <td className="py-3 pr-4">
                        <span className="text-xs text-on-surface-variant/60">{fmtDate(row.submitted_at ?? row.created_at)}</span>
                      </td>
                    )}
                    {activeColSet.has("created_at") && (
                      <td className="py-3 pr-4">
                        <span className="text-xs text-on-surface-variant/60">{fmtDate(row.created_at)}</span>
                      </td>
                    )}
                    {activeColSet.has("entry_id") && (
                      <td className="py-3 pr-4">
                        <span className="text-[10px] font-mono text-on-surface-variant/50">{row.id.slice(0, 8)}…</span>
                      </td>
                    )}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        {confirmDelete === row.id ? (
                          <>
                            <button onClick={() => handleDelete(row.id)} disabled={isPending}
                              className="px-2 py-1 text-[10px] font-bold text-white bg-error rounded-lg hover:bg-error/80 transition-all disabled:opacity-50">
                              {isPending ? "…" : "Yes"}
                            </button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 text-[10px] font-bold border border-outline-variant/15 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all">
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <a href={`/dashboard/submissions/${row.id}/pdf`} target="_blank" rel="noreferrer"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant/40 hover:text-primary hover:bg-primary/5 transition-all"
                              title="Export PDF">
                              <i className="fa-solid fa-file-pdf text-[10px]" />
                            </a>
                            <Link href={`/dashboard/submissions/${row.id}`}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant/40 hover:text-primary hover:bg-primary/5 transition-all"
                              title="View entry">
                              <i className="fa-solid fa-arrow-right text-[10px]" />
                            </Link>
                            <button onClick={() => setConfirmDelete(row.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant/40 hover:text-error hover:bg-error/5 transition-all"
                              title="Delete">
                              <i className="fa-solid fa-trash text-[10px]" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with pagination */}
          <div className="px-4 py-3 border-t border-outline-variant/[0.06]">
            <Pagination
              currentPage={page}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setPage(p)}
              itemLabel="entries"
            />
          </div>
        </div>
      )}
    </div>
  );
}
