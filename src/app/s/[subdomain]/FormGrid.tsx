"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface FormCard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_default: boolean;
}

interface Props {
  forms: FormCard[];
  primaryColor: string;
}

export default function FormGrid({ forms, primaryColor }: Props) {
  const router = useRouter();
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Stagger-in: flip mounted after first paint
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handleClick(slug: string) {
    setLoadingSlug(slug);
    router.push(`/f/${slug}`);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
      {forms.map((form, i) => {
        const isLoading = loadingSlug === form.slug;
        const isOther = loadingSlug !== null && !isLoading;

        return (
          <button
            key={form.id}
            onClick={() => handleClick(form.slug)}
            disabled={loadingSlug !== null}
            className="group relative bg-surface-container rounded-2xl border border-outline-variant/[0.06] p-6 shadow-lg shadow-black/10 text-left flex flex-col transition-all duration-500 ease-out disabled:cursor-default"
            style={{
              opacity: mounted ? (isOther ? 0.4 : 1) : 0,
              transform: mounted
                ? isLoading
                  ? "scale(0.97)"
                  : isOther
                    ? "scale(0.96)"
                    : "translateY(0)"
                : "translateY(16px)",
              transitionDelay: mounted && !loadingSlug ? `${i * 80}ms` : "0ms",
              borderColor: isLoading ? `${primaryColor}50` : undefined,
              boxShadow: isLoading ? `0 0 30px ${primaryColor}15` : undefined,
            }}
          >
            {/* Hover glow */}
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                boxShadow: `inset 0 0 0 1px ${primaryColor}30, 0 8px 32px ${primaryColor}10`,
              }}
            />

            <div className="flex items-start justify-between gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: primaryColor }}>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <i className="fa-solid fa-file-lines text-lg" style={{ color: primaryColor }} />
                )}
              </div>
            </div>

            <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors font-headline leading-snug">
              {form.name}
            </h3>

            {form.description && (
              <p className="text-xs text-on-surface-variant/60 mt-1.5 line-clamp-2 leading-relaxed">
                {form.description}
              </p>
            )}

            <div className="mt-auto pt-5">
              <span
                className="inline-flex items-center gap-2 text-xs font-bold transition-all duration-300 group-hover:gap-3"
                style={{ color: primaryColor }}
              >
                {isLoading ? "Loading..." : "Get started"}
                <i
                  className="fa-solid fa-arrow-right text-[10px] transition-transform duration-300 group-hover:translate-x-1"
                />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
