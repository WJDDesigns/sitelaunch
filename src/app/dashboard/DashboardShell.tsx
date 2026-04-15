"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SidebarNav from "./SidebarNav";
import ThemeToggle from "@/components/ThemeToggle";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";

const STORAGE_KEY = "sl-sidebar-collapsed";

interface Props {
  /** Sidebar display name */
  sidebarName: string;
  /** Sidebar tier / role label */
  sidebarLabel: string;
  /** Whether the user is superadmin */
  isAdmin: boolean;
  /** Whether the user is a partner member */
  isPartnerMember: boolean;
  /** Whether the Partners link should show */
  showPartners: boolean;
  /** Account name for partners link */
  accountName: string | null;
  /** Workspace nav items */
  workspaceItems: { href: string; label: string; icon: string }[];
  /** Admin nav items */
  adminItems: { href: string; label: string; icon: string }[];
  /** User display name */
  userName: string;
  /** User email */
  userEmail: string;
  /** Usage line like "5 / 100 submissions" */
  usageLine: string | null;
  /** Usage ratio 0-1 */
  usageRatio: number;
  /** Whether usage bar should show */
  showUsageBar: boolean;
  /** Offset from top when impersonation banner is showing */
  hasImpersonation: boolean;
  children: React.ReactNode;
}

export default function DashboardShell({
  sidebarName,
  sidebarLabel,
  isAdmin,
  isPartnerMember,
  showPartners,
  accountName,
  workspaceItems,
  adminItems,
  userName,
  userEmail,
  usageLine,
  usageRatio,
  showUsageBar,
  hasImpersonation,
  children,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch { /* SSR / privacy mode */ }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  }

  const sidebarWidth = collapsed ? "w-[68px]" : "w-64";
  const mainMargin = collapsed ? "md:ml-[68px]" : "md:ml-64";
  const topStyle = hasImpersonation ? { top: "40px", height: "calc(100vh - 40px)" } : undefined;

  return (
    <div className="flex flex-1">
      {/* Sidebar */}
      <aside
        className={`hidden md:flex ${sidebarWidth} shrink-0 flex-col h-screen fixed left-0 border-r border-on-surface/[0.06] bg-background/80 backdrop-blur-xl z-40 transition-all duration-300`}
        style={topStyle}
      >
        {/* Logo + collapse toggle */}
        <div className={`flex items-center ${collapsed ? "justify-center px-2" : "px-6"} py-6 mb-2`}>
          <Link href="/" className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <SiteLaunchLogo className="h-10 w-auto text-primary shrink-0" ringClassName="text-on-surface/60" />
            {!collapsed && (
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-on-surface font-headline tracking-tight truncate">
                  {sidebarName}
                </h2>
                <p className="text-[10px] text-primary/60 uppercase tracking-widest font-semibold">
                  {sidebarLabel}
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Nav */}
        <SidebarNav
          isAdmin={isAdmin}
          isPartnerMember={isPartnerMember}
          showPartners={showPartners}
          accountName={accountName}
          workspaceItems={workspaceItems}
          adminItems={adminItems}
          collapsed={collapsed}
        />

        {/* Usage meter */}
        {usageLine && !collapsed && (
          <div className="px-4 py-3 mx-3 mb-2 rounded-xl bg-surface-container-low/60 border border-outline-variant/[0.06]">
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-1 font-label">
              Usage
            </div>
            <div className="text-xs text-on-surface">{usageLine}</div>
            {showUsageBar && (
              <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-primary to-inverse-primary transition-all rounded-full"
                  style={{ width: `${Math.round(usageRatio * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Theme toggle */}
        {!collapsed && (
          <div className="px-3 mb-2">
            <ThemeToggle />
          </div>
        )}

        {/* Collapse toggle button */}
        <div className={`px-3 mb-2 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={toggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-on-surface-variant/40 hover:text-primary hover:bg-primary/5 transition-all duration-200"
          >
            <i className={`fa-solid ${collapsed ? "fa-angles-right" : "fa-angles-left"} text-xs`} />
            {!collapsed && <span className="text-[10px] font-bold uppercase tracking-widest">Collapse</span>}
          </button>
        </div>

        {/* User footer */}
        <div className="border-t border-on-surface/[0.06] px-3 py-4 mt-auto">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/10 flex items-center justify-center text-[10px] font-bold text-primary ring-1 ring-primary/10">
                {(userName || userEmail).slice(0, 1).toUpperCase()}
              </div>
              <form action="/auth/signout" method="post">
                <button className="text-on-surface-variant/40 hover:text-primary transition-colors" title="Sign out">
                  <i className="fa-solid fa-right-from-bracket text-xs" />
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/10 flex items-center justify-center text-[10px] font-bold text-primary ring-1 ring-primary/10 shrink-0">
                  {(userName || userEmail).slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">{userName || userEmail}</p>
                  <p className="text-[10px] text-on-surface-variant/50 truncate">{userEmail}</p>
                </div>
              </div>
              <form action="/auth/signout" method="post" className="px-3 mt-1">
                <button className="text-xs text-on-surface-variant/40 hover:text-primary transition-colors duration-300 uppercase tracking-widest">
                  Sign out
                </button>
              </form>
            </>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className={`flex-1 ${mainMargin} min-h-screen transition-all duration-300`}>
        {children}
      </main>
    </div>
  );
}
