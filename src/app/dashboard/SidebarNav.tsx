"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface Props {
  isAdmin: boolean;
  isPartnerMember?: boolean;
  showPartners: boolean;
  accountName: string | null;
  workspaceItems: NavItem[];
  adminItems: NavItem[];
  collapsed?: boolean;
}

export default function SidebarNav({
  isAdmin,
  isPartnerMember,
  showPartners,
  accountName,
  workspaceItems,
  adminItems,
  collapsed,
}: Props) {
  const pathname = usePathname();

  // Auto-detect mode from current path, but allow manual override
  const isOnAdminPage = pathname.startsWith("/dashboard/admin");
  const [mode, setMode] = useState<"workspace" | "admin">(
    isOnAdminPage ? "admin" : "workspace",
  );

  // Sync mode when navigating via links
  useEffect(() => {
    if (pathname.startsWith("/dashboard/admin")) {
      setMode("admin");
    }
  }, [pathname]);

  const items = mode === "admin" ? adminItems : workspaceItems;

  return (
    <nav className="px-3 flex flex-col">
      {/* Mode toggle — only for superadmins */}
      {isAdmin && !collapsed && (
        <div className="mb-3 mx-1">
          <div className="flex bg-surface-container rounded-lg p-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); setMode("workspace"); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                mode === "workspace"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant/50 hover:text-on-surface-variant"
              }`}
            >
              <i className="fa-solid fa-briefcase text-[10px]" />
              Workspace
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMode("admin"); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                mode === "admin"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant/50 hover:text-on-surface-variant"
              }`}
            >
              <i className="fa-solid fa-shield-halved text-[10px]" />
              Admin
            </button>
          </div>
        </div>
      )}
      {isAdmin && collapsed && (
        <div className="mb-3 flex justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); setMode(mode === "workspace" ? "admin" : "workspace"); }}
            title={mode === "workspace" ? "Switch to Admin" : "Switch to Workspace"}
            className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
          >
            <i className={`fa-solid ${mode === "workspace" ? "fa-briefcase" : "fa-shield-halved"} text-xs`} />
          </button>
        </div>
      )}

      {/* Nav items */}
      <div className="space-y-1 flex-1">
        {items.map((item) => {
          const active = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} ${collapsed ? "px-0 mx-auto w-10 h-10" : "px-4"} py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                active
                  ? "bg-primary/10 text-primary shadow-sm shadow-primary/5"
                  : "text-on-surface-variant/60 hover:bg-on-surface/[0.04] hover:text-on-surface"
              }`}
            >
              <i className={`fa-solid ${item.icon} w-5 text-center text-[13px]`} />
              {!collapsed && item.label}
            </Link>
          );
        })}

        {/* Partners link — workspace mode only, hidden for partner_member */}
        {mode === "workspace" && showPartners && !isPartnerMember && (
          <Link
            href="/dashboard/partners"
            title={collapsed ? "Partners" : undefined}
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} ${collapsed ? "px-0 mx-auto w-10 h-10" : "px-4"} py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              pathname.startsWith("/dashboard/partners")
                ? "bg-primary/10 text-primary shadow-sm shadow-primary/5"
                : "text-on-surface-variant/60 hover:bg-on-surface/[0.04] hover:text-on-surface"
            }`}
          >
            <i className="fa-solid fa-handshake w-5 text-center text-[13px]" />
            {!collapsed && "Partners"}
          </Link>
        )}
      </div>
    </nav>
  );
}
