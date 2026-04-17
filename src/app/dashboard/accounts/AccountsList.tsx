"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAccountAction } from "./actions";

interface AccountRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  submission_count: number;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-tertiary/10 text-tertiary border border-tertiary/20",
  inactive: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  archived: "bg-surface-container-high text-on-surface-variant/60",
};

export default function AccountsList({ accounts }: { accounts: AccountRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortCol, setSortCol] = useState<"name" | "email" | "entries" | "date" | "status">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, startCreate] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  // New account form state
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCompany, setNewCompany] = useState("");

  function handleSort(col: typeof sortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "date" ? "desc" : "asc");
    }
  }

  const filtered = useMemo(() => {
    const list = accounts.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (a.name ?? "").toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.company ?? "").toLowerCase().includes(q) ||
          (a.phone ?? "").toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortCol) {
        case "name":
          return (a.name ?? "").localeCompare(b.name ?? "") * dir;
        case "email":
          return a.email.localeCompare(b.email) * dir;
        case "entries":
          return (a.submission_count - b.submission_count) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "date":
        default:
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
    });

    return list;
  }, [accounts, search, statusFilter, sortCol, sortDir]);

  function handleCreateAccount() {
    if (!newEmail.trim()) return;
    setCreateError(null);
    startCreate(async () => {
      const result = await createAccountAction({
        email: newEmail,
        name: newName || undefined,
        phone: newPhone || undefined,
        company: newCompany || undefined,
      });
      if (result.ok) {
        setShowCreate(false);
        setNewEmail("");
        setNewName("");
        setNewPhone("");
        setNewCompany("");
        router.refresh();
      } else {
        setCreateError(result.error ?? "Failed to create account.");
      }
    });
  }

  const SortIcon = ({ col }: { col: typeof sortCol }) => (
    <i
      className={`fa-solid ${sortCol === col ? (sortDir === "asc" ? "fa-sort-up" : "fa-sort-down") : "fa-sort"} text-[8px] ml-1 opacity-40`}
    />
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-on-surface-variant/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface-container border border-outline-variant/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/40"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-surface-container border border-outline-variant/15 rounded-lg px-3 py-2 text-on-surface-variant focus:outline-none focus:border-primary/40"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-on-primary bg-primary rounded-lg hover:shadow-[0_0_12px_rgba(100,120,255,0.3)] transition-all ml-auto"
        >
          <i className="fa-solid fa-plus text-[10px]" />
          New Account
        </button>
      </div>

      {/* Create account inline form */}
      {showCreate && (
        <div className="bg-surface-container border border-outline-variant/15 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-on-surface">Create New Account</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1 block">
                Email *
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full px-3 py-2 text-sm bg-surface-container-high border border-outline-variant/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/40"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1 block">
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 text-sm bg-surface-container-high border border-outline-variant/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/40"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1 block">
                Phone
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 text-sm bg-surface-container-high border border-outline-variant/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/40"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1 block">
                Company
              </label>
              <input
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 text-sm bg-surface-container-high border border-outline-variant/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/40"
              />
            </div>
          </div>
          {createError && (
            <p className="text-xs text-error">{createError}</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCreateAccount}
              disabled={creating || !newEmail.trim()}
              className="px-4 py-2 text-xs font-bold text-on-primary bg-primary rounded-lg hover:shadow-[0_0_12px_rgba(100,120,255,0.3)] transition-all disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Account"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant border border-outline-variant/15 rounded-lg hover:bg-surface-container-high transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-on-surface-variant/60">
        <span>{filtered.length} account{filtered.length !== 1 ? "s" : ""}</span>
        <span>{accounts.filter((a) => a.status === "active").length} active</span>
        <span>{accounts.reduce((sum, a) => sum + a.submission_count, 0)} total entries</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <i className="fa-solid fa-users text-4xl text-on-surface-variant/20 mb-4" />
          <p className="text-on-surface-variant/60 text-sm">
            {accounts.length === 0
              ? "No accounts yet. Accounts are automatically created when clients submit forms, or you can create one manually."
              : "No accounts match your filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low/50 text-left">
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 cursor-pointer hover:text-on-surface transition-colors"
                  onClick={() => handleSort("name")}
                >
                  Name <SortIcon col="name" />
                </th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 cursor-pointer hover:text-on-surface transition-colors hidden sm:table-cell"
                  onClick={() => handleSort("email")}
                >
                  Email <SortIcon col="email" />
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 hidden md:table-cell">
                  Company
                </th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 cursor-pointer hover:text-on-surface transition-colors"
                  onClick={() => handleSort("status")}
                >
                  Status <SortIcon col="status" />
                </th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 cursor-pointer hover:text-on-surface transition-colors text-center"
                  onClick={() => handleSort("entries")}
                >
                  Entries <SortIcon col="entries" />
                </th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 cursor-pointer hover:text-on-surface transition-colors hidden lg:table-cell"
                  onClick={() => handleSort("date")}
                >
                  Created <SortIcon col="date" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="group hover:bg-primary/[0.03] transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/accounts/${a.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {(a.name ?? a.email)?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                          {a.name || a.email}
                        </p>
                        <p className="text-[11px] text-on-surface-variant/50 truncate sm:hidden">
                          {a.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant/70 truncate max-w-[200px] hidden sm:table-cell">
                    {a.email}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant/70 truncate max-w-[150px] hidden md:table-cell">
                    {a.company || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full ${STATUS_STYLES[a.status] ?? STATUS_STYLES.active}`}
                    >
                      <i className={`fa-solid ${a.status === "active" ? "fa-circle-check" : a.status === "inactive" ? "fa-circle-pause" : "fa-archive"} text-[7px]`} />
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-on-surface-variant/70">{a.submission_count}</span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant/50 text-xs hidden lg:table-cell">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
