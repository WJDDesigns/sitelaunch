"use client";

import { useState, useTransition } from "react";

interface Props {
  inviteAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}

const INPUT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none transition-all duration-200";

export default function InviteForm({ inviteAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function handleSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const result = await inviteAction(formData);
      if (result.ok) {
        setMsg({ ok: true, text: "Invite sent!" });
      } else {
        setMsg({ ok: false, text: result.error ?? "Failed to send invite." });
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        name="email"
        type="email"
        required
        placeholder="team@example.com"
        className={`${INPUT_CLS} flex-1`}
      />
      <select
        name="role"
        className={`${INPUT_CLS} sm:w-44`}
        defaultValue="partner_member"
      >
        <option value="superadmin">Super Admin</option>
        <option value="partner_owner">Admin</option>
        <option value="partner_member">Support</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl text-sm hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] disabled:opacity-50 transition-all whitespace-nowrap"
      >
        {pending ? (
          <><i className="fa-solid fa-spinner fa-spin text-xs mr-2" />Sending...</>
        ) : (
          <><i className="fa-solid fa-paper-plane text-xs mr-2" />Send Invite</>
        )}
      </button>
      {msg && (
        <div className={`self-center text-xs font-medium ${msg.ok ? "text-tertiary" : "text-error"}`}>
          {msg.text}
        </div>
      )}
    </form>
  );
}
