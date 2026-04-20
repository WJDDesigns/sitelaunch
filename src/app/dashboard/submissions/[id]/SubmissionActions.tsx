"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateSubmissionStatusAction,
  deleteSubmissionAction,
} from "../actions";

const STATUSES = ["draft", "submitted", "in_review", "complete", "archived"] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  submitted: "bg-primary/10 text-primary border border-primary/20",
  in_review: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  complete: "bg-tertiary/10 text-tertiary border border-tertiary/20",
  archived: "bg-surface-container-high text-on-surface-variant/60",
};

interface Props {
  submissionId: string;
  currentStatus: string;
}

export default function SubmissionActions({ submissionId, currentStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (msgTimerRef.current !== null) clearTimeout(msgTimerRef.current);
    };
  }, []);

  function handleStatusChange(status: string) {
    setMsg(null);
    startTransition(async () => {
      try {
        await updateSubmissionStatusAction(
          submissionId,
          status as "draft" | "submitted" | "in_review" | "complete" | "archived",
        );
        setMsg("Status updated.");
        router.refresh();
        if (msgTimerRef.current !== null) clearTimeout(msgTimerRef.current);
        msgTimerRef.current = setTimeout(() => setMsg(null), 3000);
      } catch (e) {
        setMsg((e as Error).message);
      }
    });
  }

  function handleDelete() {
    setMsg(null);
    startTransition(async () => {
      try {
        await deleteSubmissionAction(submissionId);
        router.replace("/dashboard/submissions");
      } catch (e) {
        setMsg((e as Error).message);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status dropdown */}
      <select
        value={currentStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={pending}
        className={`appearance-none px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tighter cursor-pointer border-0 outline-none disabled:opacity-50 ${
          STATUS_STYLES[currentStatus] ?? STATUS_STYLES.draft
        }`}
      >
        {STATUSES.map((st) => (
          <option key={st} value={st}>
            {st.replace("_", " ")}
          </option>
        ))}
      </select>

      {/* PDF export */}
      <a
        href={`/dashboard/submissions/${submissionId}/pdf`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-xl hover:border-primary/30 hover:text-primary transition-all"
      >
        <i className="fa-solid fa-file-pdf text-[10px]" />
        Export PDF
      </a>

      {/* Delete */}
      {confirmDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-error font-bold">Delete this submission?</span>
          <button
            onClick={handleDelete}
            disabled={pending}
            className="px-3 py-1.5 text-xs font-bold bg-error text-on-error rounded-lg disabled:opacity-50"
          >
            {pending ? "Deleting..." : "Confirm"}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs text-on-surface-variant/60 hover:text-on-surface"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-error/70 hover:text-error border border-error/15 rounded-xl hover:border-error/30 transition-all"
        >
          <i className="fa-solid fa-trash text-[10px]" />
          Delete
        </button>
      )}

      {/* Feedback */}
      {msg && (
        <span className={`text-xs font-bold ${
          msg.includes("updated") ? "text-tertiary" : "text-error"
        }`}>
          {msg}
        </span>
      )}
    </div>
  );
}
