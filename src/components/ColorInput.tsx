"use client";

import { useState } from "react";

interface Props {
  name: string;
  defaultValue?: string;
}

export default function ColorInput({ name, defaultValue = "#2563eb" }: Props) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer bg-white"
        aria-label={`${name} color picker`}
      />
      <input
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        pattern="#[0-9a-fA-F]{6}"
        className="block px-3 py-2 font-mono text-xs border border-slate-300 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
        style={{ maxWidth: "120px" }}
      />
    </div>
  );
}
