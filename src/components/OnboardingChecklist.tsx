import Link from "next/link";
import DismissChecklistButton from "./DismissChecklistButton";

export interface OnboardingChecklistProps {
  hasLogo: boolean;
  hasBrandColors: boolean;
  hasCustomForm: boolean;
  hasSubmissions: boolean;
  hasMfa: boolean;
  dismissed: boolean;
  formShareUrl?: string;
}

const ITEMS = [
  {
    key: "logo",
    label: "Upload your logo",
    href: "/dashboard/settings?tab=branding",
    icon: "fa-image",
  },
  {
    key: "brand",
    label: "Set brand colors",
    href: "/dashboard/settings?tab=branding",
    icon: "fa-palette",
  },
  {
    key: "form",
    label: "Customize your form",
    href: "/dashboard/forms",
    icon: "fa-pen-ruler",
  },
  {
    key: "client",
    label: "Send your form to a client",
    href: "/dashboard/forms",
    icon: "fa-paper-plane",
  },
  {
    key: "mfa",
    label: "Set up MFA",
    href: "/dashboard/settings",
    icon: "fa-shield-halved",
  },
] as const;

type ItemKey = (typeof ITEMS)[number]["key"];

export default function OnboardingChecklist({
  hasLogo,
  hasBrandColors,
  hasCustomForm,
  hasSubmissions,
  hasMfa,
  dismissed,
  formShareUrl,
}: OnboardingChecklistProps) {
  const completionMap: Record<ItemKey, boolean> = {
    logo: hasLogo,
    brand: hasBrandColors,
    form: hasCustomForm,
    client: hasSubmissions,
    mfa: hasMfa,
  };

  const completedCount = Object.values(completionMap).filter(Boolean).length;
  const totalCount = ITEMS.length;
  const allComplete = completedCount === totalCount;

  // Don't render if dismissed or all complete and dismissed
  if (dismissed) return null;

  return (
    <div className="rounded-2xl border border-outline-variant/[0.08] bg-surface-container/50 shadow-xl shadow-black/10 overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="px-6 md:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <i className="fa-solid fa-rocket text-primary text-sm" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-headline text-on-surface tracking-tight">
                Get Started
              </h2>
              <p className="text-xs text-on-surface-variant/60">
                {allComplete
                  ? "You're all set!"
                  : `${completedCount} of ${totalCount} complete`}
              </p>
            </div>
          </div>
          {allComplete && <DismissChecklistButton />}
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1.5 rounded-full bg-primary/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      {allComplete ? (
        <div className="px-6 md:px-8 pb-6 pt-2 text-center">
          <div className="py-4">
            <div className="w-12 h-12 rounded-2xl bg-tertiary/10 flex items-center justify-center mx-auto mb-3">
              <i className="fa-solid fa-circle-check text-tertiary text-xl" />
            </div>
            <p className="text-sm font-semibold text-on-surface">
              Congratulations! Your workspace is fully set up.
            </p>
            <p className="text-xs text-on-surface-variant/60 mt-1">
              You can dismiss this card. It won't appear again.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-6 md:px-8 pb-5 space-y-0.5">
          {ITEMS.map((item, idx) => {
            const done = completionMap[item.key];
            const href =
              item.key === "client" && formShareUrl
                ? formShareUrl
                : item.href;

            return (
              <Link
                key={item.key}
                href={href}
                className="flex items-center gap-3.5 px-3 py-2.5 -mx-3 rounded-xl hover:bg-primary/[0.03] transition-colors duration-200 group"
                style={{
                  animationDelay: `${idx * 60}ms`,
                  animationFillMode: "both",
                }}
              >
                {/* Checkbox */}
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                    done
                      ? "bg-primary text-on-primary"
                      : "border-2 border-outline-variant/20 text-transparent group-hover:border-primary/30"
                  }`}
                >
                  <i className="fa-solid fa-check text-[10px]" />
                </div>

                {/* Icon */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                    done
                      ? "bg-primary/5 text-primary/40"
                      : "bg-surface-container-high/40 text-on-surface-variant/40 group-hover:text-primary/60"
                  }`}
                >
                  <i className={`fa-solid ${item.icon} text-[11px]`} />
                </div>

                {/* Label */}
                <span
                  className={`text-sm font-medium flex-1 transition-colors duration-200 ${
                    done
                      ? "text-on-surface-variant/40 line-through"
                      : "text-on-surface group-hover:text-primary"
                  }`}
                >
                  {item.label}
                </span>

                {/* Arrow */}
                {!done && (
                  <i className="fa-solid fa-arrow-right text-[10px] text-on-surface-variant/20 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all duration-200" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
