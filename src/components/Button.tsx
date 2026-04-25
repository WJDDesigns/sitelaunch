import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  loading?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:shadow-[0_0_20px_rgba(105,108,248,0.3)] disabled:opacity-50",
  secondary:
    "bg-surface-container-high text-on-surface border border-outline-variant/20 hover:border-primary/30 hover:text-primary disabled:opacity-50",
  danger:
    "bg-error-container/20 text-error border border-error/20 hover:bg-error-container/40 disabled:opacity-50",
  ghost:
    "text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[0.04] disabled:opacity-50",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3 text-sm rounded-xl gap-2.5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      icon,
      iconRight,
      loading,
      disabled,
      children,
      className = "",
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-bold transition-all duration-200 shrink-0 ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
        {...rest}
      >
        {loading ? (
          <i className="fa-solid fa-spinner animate-spin text-xs" />
        ) : icon ? (
          <i className={`fa-solid ${icon} text-xs`} />
        ) : null}
        {children}
        {iconRight && !loading && (
          <i className={`fa-solid ${iconRight} text-xs`} />
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
