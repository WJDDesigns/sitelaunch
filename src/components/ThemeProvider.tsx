"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "auto";
export type PaletteId = "celestial" | "ocean" | "ember" | "forest" | "rose";

export const PALETTES: { id: PaletteId; label: string; swatch: string; swatchDark: string }[] = [
  { id: "celestial", label: "Celestial", swatch: "#696cf8", swatchDark: "#c0c1ff" },
  { id: "ocean", label: "Ocean", swatch: "#3877ea", swatchDark: "#a8c8ff" },
  { id: "ember", label: "Ember", swatch: "#cf5818", swatchDark: "#ffb786" },
  { id: "forest", label: "Forest", swatch: "#2e7d32", swatchDark: "#8ce08c" },
  { id: "rose", label: "Rose", swatch: "#b03060", swatchDark: "#ffaace" },
];

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  palette: PaletteId;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: PaletteId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  resolved: "dark",
  palette: "celestial",
  setMode: () => {},
  setPalette: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "auto") return getSystemTheme();
  return mode;
}

/** Returns true when a partner-controlled theme is active (client-facing /s/ pages). */
function hasPartnerTheme(): boolean {
  return typeof document !== "undefined" && document.documentElement.hasAttribute("data-partner-theme");
}

function applyTheme(resolved: "light" | "dark") {
  // Never override the partner's theme on client-facing pages
  if (hasPartnerTheme()) return;

  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  // Update meta theme-color for browser chrome
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0b1326" : "#fbf8ff");
  }
}

function applyPalette(palette: PaletteId) {
  if (hasPartnerTheme()) return;
  const root = document.documentElement;
  if (palette === "celestial") {
    root.removeAttribute("data-palette");
  } else {
    root.setAttribute("data-palette", palette);
  }
}

export default function ThemeProvider({
  children,
  defaultMode = "dark",
}: {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
}) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [resolved, setResolved] = useState<"light" | "dark">(resolveTheme(defaultMode));
  const [palette, setPaletteState] = useState<PaletteId>("celestial");

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    const r = resolveTheme(newMode);
    setResolved(r);
    applyTheme(r);
    // Persist to cookie so server components can read it
    document.cookie = `theme=${newMode};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
  }, []);

  const setPalette = useCallback((p: PaletteId) => {
    setPaletteState(p);
    applyPalette(p);
    document.cookie = `palette=${p};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
  }, []);

  // On mount: read saved preference
  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const savedTheme = cookies.find((c) => c.startsWith("theme="))?.split("=")[1] as ThemeMode | undefined;
    const savedPalette = cookies.find((c) => c.startsWith("palette="))?.split("=")[1] as PaletteId | undefined;

    const initial = savedTheme || defaultMode;
    setModeState(initial);
    const r = resolveTheme(initial);
    setResolved(r);
    applyTheme(r);

    if (savedPalette && PALETTES.some((p) => p.id === savedPalette)) {
      setPaletteState(savedPalette);
      applyPalette(savedPalette);
    }
  }, [defaultMode]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function handler() {
      const r = getSystemTheme();
      setResolved(r);
      applyTheme(r);
    }
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, palette, setMode, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}
