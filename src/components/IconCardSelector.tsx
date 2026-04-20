"use client";

/**
 * IconCardSelector -- renders select/radio/checkbox options as a responsive
 * grid of tappable cards, each showing a Font Awesome icon and a label.
 *
 * Supports both single-select (radio/select) and multi-select (checkbox) modes.
 * Integrates with the existing FieldDef.optionIcons map for icon assignments.
 */

interface Props {
  options: string[];
  /** Map of option label -> Font Awesome icon class */
  optionIcons?: Record<string, string>;
  /** Currently selected value(s). For multi-select, values are joined with "||". */
  value: string;
  /** Whether multiple selections are allowed */
  multi?: boolean;
  /** Max selections for multi-select (0 = unlimited) */
  maxSelections?: number;
  /** Callback with the new value string */
  onChange: (value: string) => void;
  /** Primary/accent color */
  primaryColor: string;
  /** Number of columns in the grid (2-6, default 3) */
  columns?: 2 | 3 | 4 | 5 | 6;
  /** Whether the field is disabled */
  disabled?: boolean;
}

const GRID_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-5",
  6: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6",
};

/** Resolve an icon class to a full Font Awesome class string */
function resolveIconClass(icon: string): string {
  if (
    icon.startsWith("fa-solid") ||
    icon.startsWith("fa-regular") ||
    icon.startsWith("fa-brands") ||
    icon.startsWith("fa-light") ||
    icon.startsWith("fa-thin")
  ) {
    return icon;
  }
  return `fa-solid ${icon}`;
}

export default function IconCardSelector({
  options,
  optionIcons,
  value,
  multi = false,
  maxSelections = 0,
  onChange,
  primaryColor,
  columns = 3,
  disabled = false,
}: Props) {
  const selectedValues = multi
    ? (value ? value.split("||").filter(Boolean) : [])
    : (value ? [value] : []);

  const isSelected = (opt: string) => selectedValues.includes(opt);

  const toggle = (opt: string) => {
    if (disabled) return;

    if (multi) {
      const currently = selectedValues;
      if (currently.includes(opt)) {
        // Deselect
        const next = currently.filter((v) => v !== opt);
        onChange(next.join("||"));
      } else {
        // Check max
        if (maxSelections > 0 && currently.length >= maxSelections) return;
        onChange([...currently, opt].join("||"));
      }
    } else {
      // Single select -- toggle off if already selected, otherwise select
      onChange(isSelected(opt) ? "" : opt);
    }
  };

  const atMax = multi && maxSelections > 0 && selectedValues.length >= maxSelections;

  return (
    <div className={`grid ${GRID_COLS[columns] || GRID_COLS[3]} gap-3`}>
      {options.map((opt) => {
        const selected = isSelected(opt);
        const icon = optionIcons?.[opt];
        const isDisabled = disabled || (atMax && !selected);

        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            disabled={isDisabled}
            className={`
              relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border-2
              transition-all duration-200 cursor-pointer select-none
              ${isDisabled ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"}
            `}
            style={
              selected
                ? {
                    borderColor: primaryColor,
                    backgroundColor: primaryColor + "12",
                    boxShadow: `0 0 0 1px ${primaryColor}40`,
                  }
                : {
                    borderColor: "var(--color-outline-variant)",
                    backgroundColor: "transparent",
                  }
            }
          >
            {/* Checkmark indicator for selected state */}
            {selected && (
              <div
                className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <i className="fa-solid fa-check text-[10px] text-white" />
              </div>
            )}

            {/* Icon */}
            {icon ? (
              <i
                className={`${resolveIconClass(icon)} text-2xl transition-colors duration-200`}
                style={{ color: selected ? primaryColor : "var(--color-on-surface-variant)" }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors duration-200"
                style={{
                  backgroundColor: selected ? primaryColor + "20" : "var(--color-surface-container-highest)",
                  color: selected ? primaryColor : "var(--color-on-surface-variant)",
                }}
              >
                {opt.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Label */}
            <span
              className="text-xs font-medium text-center leading-tight transition-colors duration-200"
              style={{ color: selected ? primaryColor : "var(--color-on-surface)" }}
            >
              {opt}
            </span>
          </button>
        );
      })}
    </div>
  );
}
