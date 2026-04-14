"use client";

import { useEffect } from "react";

interface Props {
  themeMode: string;
}

/**
 * Applies the partner's theme_mode preference to the HTML element
 * for client-facing pages. Overrides the user's personal theme cookie
 * since the partner controls the look of their onboarding portal.
 *
 * Sets data-partner-theme on <html> so ThemeProvider knows not to
 * override this with the user's dashboard theme preference.
 *
 * themeMode: "dark" | "light" | "auto"
 */
export default function ClientThemeScript({ themeMode }: Props) {
  useEffect(() => {
    const html = document.documentElement;
    // Signal to ThemeProvider that a partner theme is active
    html.setAttribute("data-partner-theme", themeMode);

    function apply() {
      let isDark: boolean;
      if (themeMode === "auto") {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      } else {
        isDark = themeMode === "dark";
      }
      html.classList.toggle("dark", isDark);
    }

    apply();

    // Listen for system preference changes when in auto mode
    if (themeMode === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => {
        mq.removeEventListener("change", apply);
        html.removeAttribute("data-partner-theme");
      };
    }

    return () => {
      html.removeAttribute("data-partner-theme");
    };
  }, [themeMode]);

  // Inline script to prevent FOUC — runs before React hydrates.
  // Also sets data-partner-theme so ThemeProvider's mount effect skips.
  const inlineScript = `(function(){try{var m="${themeMode}";var h=document.documentElement;h.setAttribute("data-partner-theme",m);var d=m==="dark"||(m==="auto"&&window.matchMedia("(prefers-color-scheme:dark)").matches);h.classList.toggle("dark",d)}catch(e){}})()`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: inlineScript }}
      suppressHydrationWarning
    />
  );
}
