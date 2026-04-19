import type { Config } from "tailwindcss";

/** Helper: reference a CSS custom-property that holds space-separated RGB values */
function rgb(name: string) {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ── Celestial Editorial palette (CSS-var driven) ── */
        primary: rgb("primary"),
        "on-primary": rgb("on-primary"),
        "primary-container": rgb("primary-container"),
        "on-primary-container": rgb("on-primary-container"),
        "inverse-primary": rgb("inverse-primary"),

        secondary: rgb("secondary"),
        "on-secondary": rgb("on-secondary"),
        "secondary-container": rgb("secondary-container"),
        "on-secondary-container": rgb("on-secondary-container"),

        tertiary: rgb("tertiary"),
        "on-tertiary": rgb("on-tertiary"),
        "tertiary-container": rgb("tertiary-container"),
        "on-tertiary-container": rgb("on-tertiary-container"),

        error: rgb("error"),
        "on-error": rgb("on-error"),
        "error-container": rgb("error-container"),
        "on-error-container": rgb("on-error-container"),

        surface: rgb("surface"),
        "surface-dim": rgb("surface-dim"),
        "surface-bright": rgb("surface-bright"),
        "surface-container-lowest": rgb("surface-container-lowest"),
        "surface-container-low": rgb("surface-container-low"),
        "surface-container": rgb("surface-container"),
        "surface-container-high": rgb("surface-container-high"),
        "surface-container-highest": rgb("surface-container-highest"),
        "surface-variant": rgb("surface-variant"),
        "surface-tint": rgb("surface-tint"),

        "on-surface": rgb("on-surface"),
        "on-surface-variant": rgb("on-surface-variant"),
        "on-background": rgb("on-background"),
        background: rgb("background"),

        outline: rgb("outline"),
        "outline-variant": rgb("outline-variant"),

        "inverse-surface": rgb("inverse-surface"),
        "inverse-on-surface": rgb("inverse-on-surface"),

        /* Legacy brand tokens (keep for compat) */
        brand: {
          50: "#e1e0ff",
          100: "#c0c1ff",
          500: "#696cf8",
          600: "#494bd6",
          700: "#2f2ebe",
        },
      },
      fontFamily: {
        headline: ["var(--font-jakarta)", '"Plus Jakarta Sans"', "sans-serif"],
        body: ["var(--font-inter)", '"Inter"', "sans-serif"],
        label: ["var(--font-inter)", '"Inter"', "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        sm: "0.125rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      animation: {
        "fade-up": "celestial-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "slide-up": "slide-up 0.8s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "glow-pulse": "celestial-glow-pulse 3s ease-in-out infinite",
        "glow-breathe": "glow-breathe 4s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        float: "float 6s ease-in-out infinite",
        "slide-in-right":
          "slide-in-right 0.3s cubic-bezier(0.22,1,0.36,1) both",
      },
      keyframes: {
        "celestial-fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(40px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.92)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "celestial-glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(192,193,255,0)" },
          "50%": { boxShadow: "0 0 30px rgba(192,193,255,0.25)" },
        },
        "glow-breathe": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
