"use client";

import { useState } from "react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Additional class names applied to the input */
  className?: string;
}

/**
 * Password input with a show/hide toggle button.
 * Accepts the same props as a regular <input />.
 */
export default function PasswordInput({ className = "", ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...rest}
        type={visible ? "text" : "password"}
        className={className}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant/70 transition-colors duration-200"
      >
        <i className={`fa-solid ${visible ? "fa-eye-slash" : "fa-eye"} text-sm`} />
      </button>
    </div>
  );
}
