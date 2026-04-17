"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateAccountAction,
  addNoteAction,
  deleteNoteAction,
  exportAccountEntriesAction,
} from "../actions";

interface Account {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface NoteRow {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  author_name: string;
}

interface EntryRow {
  id: string;
  status: string;
  form_name: string;
  submitted_at: string | null;
  created_at: string;
  data_keys: string[];
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-tertiary/10 text-tertiary border border-tertiary/20",
  inactive: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  archived: "bg-surface-container-high text-on-surface-variant/60",
};

const ENTRY_STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  submitted: "bg-primary/10 text-primary border border-primary/20",
  in_review: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  complete: "bg-tertiary/10 text-tertiary border border-tertiary/20",
  archived: "bg-surface-container-high text-on-surface-variant/60",
};

export default function AccountDetail({
  account,
  notes,
  entries,
  currentUserId,
}: {
  account: Account;
  notes: NoteRow[];
  entries: EntryRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, startSave] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Edit fields
  const [editName, setEditName] = useState(account.name ?? "");
  const [editEmail, setEditEmail] = useState(account.email);
  const [editPhone, setEditPhone] = useState(account.phone ?? "");
  const [editCompany, setEditCompany] = useState(account.company ?? "");
  const [editStatus, setEditStatus] = useState(account.status);

  // Notes
  const [noteText, setNoteText] = useState("");
  const [addingNote, startAddNote] = useTransition();

  // Export
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [exporting, startExport] = useTransition();

  function handleSave() {
    setSaveMsg(null);
    startSave(async () => {
      const result = await updateAccountAction(account.id, {
        name: editName,
        email: editEmail,
        phone: editPhone,
        company: editCompany,
        status: editStatus,
      });
      if (result.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setSaveMsg(result.error ?? "Failed to save.");
      }
    });
  }

  function handleAddNote() {
    if (!noteText.trim()) return;
    startAddNote(async () => {
      const result = await addNoteAction(account.id, noteText);
      if (result.ok) {
        setNoteText("");
        router.refresh();
      }
    });
  }

  function handleDeleteNote(noteId: string) {
    startAddNote(async () => {
      await deleteNoteAction(noteId);
      router.refresh();
    });
  }

  function handleExport(all: boolean) {
    startExport(async () => {
      const ids = all ? undefined : Array.from(selectedEntries);
      const result = await exportAccountEntriesAction(account.id, ids);
      if (result.ok && result.csv) {
        const blob = new Blob([result.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename ?? "export.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  function toggleEntry(id: string) {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-8">
      {/* ---- Profile Section ---- */}
      <section className="bg-surface-container border border-outline-variant/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/60">
            <i className="fa-solid fa-user text-[10px] mr-2" />
            Profile
          </h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
            >
              <i className="fa-solid fa-pen text-[10px] mr-1" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {saveMsg && <span className="text-[10px] text-error">{saveMsg}</span>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 text-xs font-bold text-on-primary bg-primary rounded-lg transition-all disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditName(account.name ?? "");
                  setEditEmail(account.email);
                  setEditPhone(account.phone ?? "");
                  setEditCompany(account.company ?? "");
                  setEditStatus(account.status);
                }}
                className="px-3 py-1 text-xs font-bold text-on-surface-variant border border-outline-variant/15 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" value={editName} onChange={setEditName} />
              <Field label="Email" value={editEmail} onChange={setEditEmail} type="email" />
              <Field label="Phone" value={editPhone} onChange={setEditPhone} type="tel" />
              <Field label="Company" value={editCompany} onChange={setEditCompany} />
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1 block">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-container-high border border-outline-variant/15 rounded-lg text-on-surface focus:outline-none focus:border-primary/40"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <ProfileField label="Name" value={account.name} />
              <ProfileField label="Email" value={account.email} />
              <ProfileField label="Phone" value={account.phone} />
              <ProfileField label="Company" value={account.company} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">Status</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full ${STATUS_STYLES[account.status] ?? STATUS_STYLES.active}`}
                >
                  {account.status}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">Created</p>
                <p className="text-sm text-on-surface">{new Date(account.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {account.tags.length > 0 && (
            <div className="pt-2 border-t border-outline-variant/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {account.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---- Notes Section ---- */}
      <section className="bg-surface-container border border-outline-variant/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/60">
            <i className="fa-solid fa-sticky-note text-[10px] mr-2" />
            Notes ({notes.length})
          </h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Add note */}
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
              placeholder="Add a note…"
              className="flex-1 px-3 py-2 text-sm bg-surface-container-high border border-outline-variant/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/40"
            />
            <button
              onClick={handleAddNote}
              disabled={addingNote || !noteText.trim()}
              className="px-4 py-2 text-xs font-bold text-on-primary bg-primary rounded-lg transition-all disabled:opacity-50"
            >
              {addingNote ? "…" : "Add"}
            </button>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <p className="text-sm text-on-surface-variant/40 text-center py-4">No notes yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="group flex items-start gap-3 px-3 py-2.5 rounded-lg bg-surface-container-high/50 border border-outline-variant/5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-on-surface whitespace-pre-wrap">{note.content}</p>
                    <p className="text-[10px] text-on-surface-variant/50 mt-1">
                      {note.author_name} · {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                  {note.created_by === currentUserId && (
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-on-surface-variant/40 hover:text-error transition-all shrink-0 mt-0.5"
                    >
                      <i className="fa-solid fa-trash-can text-[10px]" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---- Entries Section ---- */}
      <section className="bg-surface-container border border-outline-variant/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/60">
            <i className="fa-solid fa-table-list text-[10px] mr-2" />
            Entries ({entries.length})
          </h2>
          <div className="flex items-center gap-2">
            {selectedEntries.size > 0 && (
              <button
                onClick={() => handleExport(false)}
                disabled={exporting}
                className="px-3 py-1.5 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/10 transition-all disabled:opacity-50"
              >
                <i className="fa-solid fa-download text-[10px] mr-1" />
                Export Selected ({selectedEntries.size})
              </button>
            )}
            <button
              onClick={() => handleExport(true)}
              disabled={exporting || entries.length === 0}
              className="px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 hover:text-primary transition-all disabled:opacity-50"
            >
              <i className="fa-solid fa-file-export text-[10px] mr-1" />
              {exporting ? "Exporting…" : "Export All"}
            </button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant/40">
            <i className="fa-solid fa-inbox text-3xl mb-3" />
            <p className="text-sm">No submissions from this account yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/5">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-primary/[0.03] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedEntries.has(entry.id)}
                  onChange={() => toggleEntry(entry.id)}
                  className="shrink-0 rounded border-outline-variant/30 text-primary focus:ring-primary/20"
                />
                <Link
                  href={`/dashboard/submissions/${entry.id}`}
                  className="flex-1 min-w-0 flex items-center gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                      {entry.form_name}
                    </p>
                    <p className="text-[11px] text-on-surface-variant/50">
                      {entry.data_keys.length} fields · {entry.submitted_at ? new Date(entry.submitted_at).toLocaleDateString() : new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full ${ENTRY_STATUS_STYLES[entry.status] ?? ENTRY_STATUS_STYLES.draft}`}
                  >
                    {entry.status.replace("_", " ")}
                  </span>
                  <i className="fa-solid fa-chevron-right text-[10px] text-on-surface-variant/30 group-hover:text-primary transition-colors shrink-0" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---- Helper components ---- */

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-surface-container-high border border-outline-variant/15 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/40"
      />
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">{label}</p>
      <p className="text-sm text-on-surface">{value || "—"}</p>
    </div>
  );
}
