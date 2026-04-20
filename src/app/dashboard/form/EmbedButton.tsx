"use client";

import { useState } from "react";
import EmbedDialog from "./EmbedDialog";

interface Props {
  formUrl: string;
  formName: string;
}

export default function EmbedButton({ formUrl, formName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-2 flex items-center justify-center text-xs font-bold text-on-surface-variant/60 border border-outline-variant/15 rounded-lg hover:border-primary/30 hover:text-primary transition-all"
        title="Embed form"
      >
        <i className="fa-solid fa-code text-[10px] sm:mr-1.5" />
        <span className="hidden sm:inline">Embed</span>
      </button>

      {open && (
        <EmbedDialog
          formUrl={formUrl}
          formName={formName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
