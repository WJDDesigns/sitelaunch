"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 25;

interface EntryRow {
  id: string;
  status: string;
  client_name: string | null;
  client_email: string | null;
  data: Record<string, unknown>;
  submitted_at: string | null;
  created_at: string;
}

interface FieldMapping {
  key: string;
  label: string;
}

interface ColumnDef {
  id: string;
  label: string;
  type: "system" | "field";
}

interface Props {
  entries: EntryRow[];
  fieldMap: FieldMapping[];
  formName: string;
  primaryColor: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  submitted: "bg-primary/10 text-primary border border-primary/20",
  in_review: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border border-red-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function flattenObject(obj: Record<string, unknown>): string {
  // Name objects: { first, last, middle, prefix, suffix }
  if ("first" in obj || "last" in obj) {
    const parts = [obj.prefix, obj.first, obj.middle, obj.last, obj.suffix]
      .filter((p) => typeof p === "string" && p.trim())
      .map((p) => (p as string).trim());
    if (parts.length > 0) return parts.join(" ");
  }
  // Address objects: { street, street2, city, state, zip, country }
  if ("street" in obj || "city" in obj || "address" in obj) {
    const parts = [obj.street || obj.address, obj.street2, obj.city, obj.state, obj.zip, obj.country]
      .filter((p) => typeof p === "string" && p.trim())
      .map((p) => (p as string).trim());
    if (parts.length > 0) return parts.join(", ");
  }
  // Generic: join all string/number values
  const vals = Object.values(obj)
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map((v) => (typeof v === "object" ? flattenValue(v) : String(v)))
    .filter(Boolean);
  return vals.join(", ") || "";
}

function flattenValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") {
    // Try to parse JSON strings
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.url) {
        // Competitor analyzer entries
        return parsed.map((c: { url?: string; analysis?: { title?: string } }) =>
          c.analysis?.title || c.url || ""
        ).filter(Boolean).join(", ");
      }
      if (Array.isArray(parsed)) return parsed.map(flattenValue).join("; ");
      if (typeof parsed === "object" && parsed !== null) return flattenObject(parsed as Record<string, unknown>);
    } catch { /* not JSON, return as-is */ }
    return val;
  }
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(flattenValue).join("; ");
  if (typeof val === "object") {
    return flattenObject(val as Record<string, unknown>);
  }
  return String(val);
}

/* ── System columns (always available) ────────────────────── */
const SYSTEM_COLUMNS: ColumnDef[] = [
  { id: "_client", label: "Client", type: "system" },
  { id: "_status", label: "Status", type: "system" },
  { id: "_submitted_at", label: "Submitted", type: "system" },
  { id: "_created_at", label: "Created", type: "system" },
  { id: "_entry_id", label: "Entry ID", type: "system" },
];

/* ── Column Customizer Popover ────────────────────────────── */
function ColumnCustomizer({
  allColumns,
  activeIds,
  onUpdate,
  primaryColor,
  defaultIds,
}: {
  allColumns: ColumnDef[];
  activeIds: string[];
  onUpdate: (ids: string[]) => void;
  primaryColor: string;
  defaultIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  // Position the panel when opening
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
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
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
          open
            ? "bg-primary/10 text-primary"
            : "text-on-surface-variant/40 hover:bg-surface-container-high hover:text-on-surface-variant"
        }`}
        title="Customize columns"
      >
        <i className="fa-solid fa-table-columns text-[10px]" />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="w-[420px] bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-2xl overflow-hidden"
          style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
        >
          <div className="px-4 py-3 border-b border-outline-variant/10">
            <h3 className="text-sm font-bold text-on-surface">Customize Columns</h3>
            <p className="text-[11px] text-on-surface-variant/50 mt-0.5">Click to add or remove. Drag to reorder active columns.</p>
          </div>

          <div className="flex divide-x divide-outline-variant/10 max-h-[360px]">
            {/* Inactive (left) */}
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
                      <i className="fa-solid fa-plus text-[8px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: primaryColor }} />
                      <span className="truncate flex-1">{col.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        col.type === "system"
                          ? "bg-surface-container-high text-on-surface-variant/40"
                          : "bg-primary/5 text-primary/40"
                      }`}>
                        {col.type === "system" ? "System" : "Field"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Active (right) */}
            <div className="w-1/2 p-3 overflow-y-auto">
              <div className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-2">
                Active ({active.length})
              </div>
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
                      <button
                        onClick={() => moveUp(idx)}
                        className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant/40 hover:text-primary hover:bg-primary/5"
                        title="Move up"
                      >
                        <i className="fa-solid fa-chevron-up text-[7px]" />
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant/40 hover:text-primary hover:bg-primary/5"
                        title="Move down"
                      >
                        <i className="fa-solid fa-chevron-down text-[7px]" />
                      </button>
                      <button
                        onClick={() => removeColumn(col.id)}
                        className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/5"
                        title="Remove"
                      >
                        <i className="fa-solid fa-xmark text-[8px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 border-t border-outline-variant/10 flex justify-between items-center">
            <button
              onClick={() => onUpdate(defaultIds)}
              className="text-[11px] text-on-surface-variant/50 hover:text-primary transition-colors"
            >
              Reset to defaults
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor, color: "#fff" }}
            >
              Done
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ── Main Component ───────────────────────────────────────── */

export default function EntriesTable({ entries, fieldMap, formName, primaryColor }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Build full column list: system + form fields
  const allColumns = useMemo<ColumnDef[]>(() => [
    ...SYSTEM_COLUMNS,
    ...fieldMap.map((f) => ({ id: `field:${f.key}`, label: f.label, type: "field" as const })),
  ], [fieldMap]);

  // Default active columns: Client, Status, Submitted + first 3 form fields
  const defaultActive = useMemo(() => [
    "_client", "_status", "_submitted_at",
    ...fieldMap.slice(0, 3).map((f) => `field:${f.key}`),
  ], [fieldMap]);

  const [activeColumnIds, setActiveColumnIds] = useState<string[]>(() => {
    // Try to restore from URL param
    const raw = searchParams.get("cols");
    if (raw) {
      const ids = raw.split(",");
      // Validate all IDs exist
      const validIds = new Set(allColumns.map((c) => c.id));
      const valid = ids.filter((id) => validIds.has(id));
      if (valid.length > 0) return valid;
    }
    return defaultActive;
  });

  // Initialize from URL params
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(() => {
    const raw = searchParams.get("status");
    if (!raw) return new Set(["submitted"]);
    if (raw === "all") return new Set<string>();
    return new Set(raw.split(","));
  });
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10) || 1);

  // Sync state changes to URL
  const updateUrl = useCallback(
    (params: { q?: string; status?: string; page?: number; cols?: string }) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (params.q !== undefined) {
        if (params.q) sp.set("q", params.q);
        else sp.delete("q");
      }
      if (params.status !== undefined) {
        if (params.status) sp.set("status", params.status);
        else sp.delete("status");
      }
      if (params.page !== undefined) {
        if (params.page > 1) sp.set("page", String(params.page));
        else sp.delete("page");
      }
      if (params.cols !== undefined) {
        if (params.cols) sp.set("cols", params.cols);
        else sp.delete("cols");
      }
      const qs = sp.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleColumnsUpdate = useCallback((ids: string[]) => {
    setActiveColumnIds(ids);
    // Persist to URL so it survives page reloads
    const isDefault = ids.length === defaultActive.length && ids.every((id, i) => id === defaultActive[i]);
    updateUrl({ cols: isDefault ? "" : ids.join(",") });
  }, [defaultActive, updateUrl]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    updateUrl({ q: val, page: 1 });
  };
  const toggleStatus = (val: string) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      const serialized = next.size === 0 ? "all" : Array.from(next).join(",");
      setPage(1);
      updateUrl({ status: serialized, page: 1 });
      return next;
    });
  };
  const setAllStatuses = () => {
    setStatusFilter(new Set());
    setPage(1);
    updateUrl({ status: "all", page: 1 });
  };
  const handlePageChange = (p: number) => {
    setPage(p);
    updateUrl({ page: p });
  };

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (statusFilter.size > 0 && !statusFilter.has(e.status)) return false;
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = (e.client_name ?? "").toLowerCase().includes(q);
        const emailMatch = (e.client_email ?? "").toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [entries, search, statusFilter]);

  const paginatedEntries = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useMemo(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > maxPage) setPage(1);
  }, [filtered.length, page]);

  const statuses = useMemo(() => {
    const s = new Set(entries.map((e) => e.status));
    return ["all", ...Array.from(s)];
  }, [entries]);

  // Resolve active columns to their defs
  const activeColumns = useMemo(() => {
    const colMap = new Map(allColumns.map((c) => [c.id, c]));
    return activeColumnIds.map((id) => colMap.get(id)).filter(Boolean) as ColumnDef[];
  }, [allColumns, activeColumnIds]);

  /* ── Render cell value for a column ────────── */
  function renderCell(entry: EntryRow, col: ColumnDef) {
    switch (col.id) {
      case "_client":
        return (
          <td key={col.id} className="px-5 py-3.5">
            <div className="font-semibold text-on-surface">{entry.client_name || "—"}</div>
            <div className="text-xs text-on-surface-variant/50 mt-0.5">{entry.client_email || "—"}</div>
          </td>
        );
      case "_status":
        return (
          <td key={col.id} className="px-4 py-3.5">
            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[entry.status] ?? STATUS_STYLES.draft}`}>
              {entry.status.replace(/_/g, " ")}
            </span>
          </td>
        );
      case "_submitted_at":
        return (
          <td key={col.id} className="px-4 py-3.5 text-on-surface-variant/70 text-xs whitespace-nowrap">
            {formatDate(entry.submitted_at ?? entry.created_at)}
          </td>
        );
      case "_created_at":
        return (
          <td key={col.id} className="px-4 py-3.5 text-on-surface-variant/70 text-xs whitespace-nowrap">
            {formatDate(entry.created_at)}
          </td>
        );
      case "_entry_id":
        return (
          <td key={col.id} className="px-4 py-3.5 text-on-surface-variant/50 text-[10px] font-mono">
            {entry.id.slice(0, 8)}…
          </td>
        );
      default: {
        // Form field column — id is "field:<key>"
        const fieldKey = col.id.replace("field:", "");
        return (
          <td key={col.id} className="px-4 py-3.5 text-on-surface-variant/70 text-xs max-w-[200px] truncate">
            {flattenValue(entry.data[fieldKey]) || "—"}
          </td>
        );
      }
    }
  }

  function exportCSV() {
    const headers = ["Name", "Email", "Status", "Submitted At", ...fieldMap.map((f) => f.label)];
    const rows = filtered.map((e) => [
      e.client_name ?? "",
      e.client_email ?? "",
      e.status,
      e.submitted_at ?? e.created_at,
      ...fieldMap.map((f) => flattenValue(e.data[f.key])),
    ]);

    const escape = (s: string) => {
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
    a.download = `${formName.replace(/[^a-zA-Z0-9]/g, "_")}_entries_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 rounded-full bg-surface-container mx-auto mb-4 flex items-center justify-center">
          <i className="fa-solid fa-inbox text-3xl text-on-surface-variant/30" />
        </div>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-1">No entries yet</h2>
        <p className="text-sm text-on-surface-variant/60">
          Submissions will appear here once clients complete this form.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant/40" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-outline-variant/20 bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 outline-none transition-all"
            style={{ "--tw-ring-color": primaryColor + "66" } as React.CSSProperties}
          />
        </div>
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
          {statuses.filter((s) => s !== "all").map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
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
        <button
          onClick={exportCSV}
          className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 flex items-center gap-2"
          style={{ backgroundColor: primaryColor, color: "#fff" }}
        >
          <i className="fa-solid fa-file-csv text-xs" />
          Export CSV
        </button>
        <span className="text-xs text-on-surface-variant/50">
          {filtered.length} of {entries.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15">
                {activeColumns.map((col) => (
                  <th
                    key={col.id}
                    className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-4 py-3.5 first:pl-5 max-w-[200px]"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-16 px-3 py-3.5 text-right">
                  <ColumnCustomizer
                    allColumns={allColumns}
                    activeIds={activeColumnIds}
                    onUpdate={handleColumnsUpdate}
                    primaryColor={primaryColor}
                    defaultIds={defaultActive}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {paginatedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-container/30 transition-colors">
                  {activeColumns.map((col) => renderCell(entry, col))}
                  <td className="px-3 py-3.5">
                    <Link
                      href={`/dashboard/submissions/${entry.id}`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:text-primary hover:bg-primary/5 transition-all"
                    >
                      <i className="fa-solid fa-arrow-right text-[10px]" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-outline-variant/10">
          <Pagination
            currentPage={page}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            itemLabel="entries"
          />
        </div>
      </div>
    </div>
  );
}
