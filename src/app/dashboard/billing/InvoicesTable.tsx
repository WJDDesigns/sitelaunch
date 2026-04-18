"use client";

import { useState, useMemo } from "react";

export interface Invoice {
  id: string;
  status: string;
  amount_paid: number;
  currency: string;
  invoice_url: string | null;
  invoice_pdf: string | null;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
}

type StatusFilter = "all" | "paid" | "open" | "draft" | "void" | "uncollectible";

export default function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const statuses = useMemo(() => {
    const s = new Set(invoices.map((i) => i.status));
    return Array.from(s).sort();
  }, [invoices]);

  const filtered = useMemo(() => {
    let list = [...invoices];
    if (statusFilter !== "all") {
      list = list.filter((i) => i.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.id.toLowerCase().includes(q) ||
          `$${(i.amount_paid / 100).toFixed(2)}`.includes(q) ||
          i.currency.toLowerCase().includes(q) ||
          (i.paid_at && new Date(i.paid_at).toLocaleDateString().includes(q)),
      );
    }
    list.sort((a, b) => {
      const da = a.paid_at ? new Date(a.paid_at).getTime() : 0;
      const db = b.paid_at ? new Date(b.paid_at).getTime() : 0;
      return sortDir === "desc" ? db - da : da - db;
    });
    return list;
  }, [invoices, statusFilter, search, sortDir]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      paid: "bg-tertiary/10 text-tertiary border-tertiary/20",
      open: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      draft: "bg-surface-container-high text-on-surface-variant/60 border-outline-variant/15",
      void: "bg-error/10 text-error border-error/20",
      uncollectible: "bg-error/10 text-error border-error/20",
    };
    return map[status] ?? map.draft;
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-bold font-headline text-on-surface">Invoices</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-on-surface-variant/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="w-full sm:w-48 pl-8 pr-3 py-2 text-xs rounded-lg bg-surface-container border border-outline-variant/10 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/30 transition-colors"
            />
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 text-xs rounded-lg bg-surface-container border border-outline-variant/10 text-on-surface focus:outline-none focus:border-primary/30 transition-colors appearance-none cursor-pointer pr-7"
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant/40">
          <i className="fa-solid fa-file-invoice text-3xl mb-3 block opacity-40" />
          <p className="text-sm">
            {invoices.length === 0 ? "No invoices yet" : "No invoices match your filters"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/10">
                <th
                  className="text-left px-3 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold cursor-pointer select-none hover:text-on-surface-variant transition-colors"
                  onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                >
                  Date
                  <i
                    className={`fa-solid fa-chevron-${sortDir === "desc" ? "down" : "up"} text-[8px] ml-1.5 opacity-60`}
                  />
                </th>
                <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">
                  Amount
                </th>
                <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">
                  Period
                </th>
                <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">
                  Status
                </th>
                <th className="text-right px-3 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/[0.06]">
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-primary/[0.02] transition-colors group"
                >
                  <td className="px-3 py-3.5 text-on-surface font-medium whitespace-nowrap">
                    {formatDate(inv.paid_at)}
                  </td>
                  <td className="px-3 py-3.5 text-on-surface whitespace-nowrap">
                    ${(inv.amount_paid / 100).toFixed(2)}{" "}
                    <span className="text-on-surface-variant/50 text-xs">
                      {inv.currency.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-on-surface-variant/70 text-xs whitespace-nowrap">
                    {inv.period_start && inv.period_end
                      ? `${formatDate(inv.period_start)} - ${formatDate(inv.period_end)}`
                      : "-"}
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusBadge(inv.status)}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.invoice_url && (
                        <a
                          href={inv.invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </a>
                      )}
                      {inv.invoice_pdf && (
                        <a
                          href={inv.invoice_pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-on-surface-variant/60 hover:text-primary transition-colors"
                          title="Download PDF"
                        >
                          <i className="fa-solid fa-file-pdf text-[11px]" />
                          <span className="hidden sm:inline">PDF</span>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-4 pt-3 border-t border-outline-variant/[0.06] flex items-center justify-between text-xs text-on-surface-variant/50">
          <span>
            Showing {filtered.length} of {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </section>
  );
}
