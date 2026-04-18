"use client";

import { useTheme, PALETTES, type PaletteId } from "@/components/ThemeProvider";

export default function DashboardPaletteSection() {
  const { palette, setPalette, resolved } = useTheme();

  return (
    <section className="rounded-2xl border border-outline-variant/[0.08] bg-surface-container/50 shadow-xl shadow-black/10 p-6 md:p-8">
      <h2 className="text-lg font-bold font-headline text-on-surface mb-1">
        Dashboard Color Palette
      </h2>
      <p className="text-sm text-on-surface-variant/60 mb-5">
        Choose a color accent for your dashboard. This only affects your view and works in both light and dark mode.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {PALETTES.map((p) => {
          const isActive = palette === p.id;
          const swatch = resolved === "dark" ? p.swatchDark : p.swatch;
          return (
            <button
              key={p.id}
              onClick={() => setPalette(p.id)}
              className={`relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200 ${
                isActive
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-outline-variant/10 hover:border-primary/30 bg-surface-container-high/30 hover:bg-surface-container-high/60"
              }`}
            >
              {/* Color swatch */}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-8 h-8 rounded-full shadow-inner ring-2 ring-white/10"
                  style={{ backgroundColor: swatch }}
                />
              </div>
              <span className={`text-xs font-bold ${isActive ? "text-primary" : "text-on-surface-variant/70"}`}>
                {p.label}
              </span>

              {/* Active checkmark */}
              {isActive && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <i className="fa-solid fa-check text-on-primary text-[8px]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
