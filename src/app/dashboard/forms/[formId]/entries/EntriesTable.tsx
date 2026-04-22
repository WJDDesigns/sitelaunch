"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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

function flattenValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") {
    // Try to detect stringified competitor analyzer / complex JSON arrays
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.url) {
        // Competitor analyzer entries — show URLs
        return parsed.map((c: { url?: string; analysis?: { title?: string } }) =>
          c.analysis?.title || c.url || ""
        ).filter(Boolean).join(", ");
      }
    } catch { /* not JSON, return as-is */ }
    return val;
  }
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(flattenValue).join("; ");
  if (typeof val === "object") {
    try { return JSON.stringify(val); } catch { return "[object]"; }
  }
  return String(val);
}

export default function EntriesTable({ entries, fieldMap, formName, primaryColor }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
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
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-outline-variant/20 bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 outline-none transition-all"
            style={{ "--tw-ring-color": primaryColor + "66" } as React.CSSProperties}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border-2 border-outline-variant/20 bg-surface-container-lowest text-sm text-on-surface"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}</option>
          ))}
        </select>
        <button
          onClick={exportCSV}
          className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 flex items-center gap-2"
          style={{ backgroundColor: primaryColor, color: "#fff" }}
        >
          <i className="fa-solid fa-file-csv text-xs" />
          Export CSV
        </button>
        <span className="text-xs text-on-surface-variant/50 ml-auto">
          {filtered.length} of {entries.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15">
                <th className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-5 py-3.5">Client</th>
                <th className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-4 py-3.5">Status</th>
                <th className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-4 py-3.5">Submitted</th>
                {fieldMap.slice(0, 3).map((f) => (
                  <th key={f.key} className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-4 py-3.5 hidden lg:table-cell max-w-[200px]">{f.label}</th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {paginatedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-container/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-on-surface">{entry.client_name || "—"}</div>
                    <div className="text-xs text-on-surface-variant/50 mt-0.5">{entry.client_email || "—"}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[entry.status] ?? STATUS_STYLES.draft}`}>
                      {entry.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-on-surface-variant/70 text-xs whitespace-nowrap">
                    {formatDate(entry.submitted_at ?? entry.created_at)}
                  </td>
                  {fieldMap.slice(0, 3).map((f) => (
                    <td key={f.key} className="px-4 py-3.5 text-on-surface-variant/70 text-xs hidden lg:table-cell max-w-[200px] truncate">
                      {flattenValue(entry.data[f.key]) || "—"}
                    </td>
                  ))}
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
            onPageChange={(p) => setPage(p)}
            itemLabel="entries"
          />
        </div>
      </div>
    </div>
  );
}
