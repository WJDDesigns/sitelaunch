"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import SidebarNav from "./SidebarNav";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import LinqMeLogo from "@/components/LinqMeLogo";
import NotificationBell from "@/components/NotificationBell";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import AccountSwitcher from "@/components/AccountSwitcher";

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
  /** User avatar URL */
  userAvatarUrl: string | null;
  /** Usage line like "5 / 100 submissions" */
  usageLine: string | null;
  /** Usage ratio 0-1 */
  usageRatio: number;
  /** Whether usage bar should show */
  showUsageBar: boolean;
  /** Offset from top when impersonation banner is showing */
  hasImpersonation: boolean;
  /** All account contexts for context switching */
  accountContexts: { partnerId: string; partnerName: string; partnerSlug: string; role: "partner_owner" | "partner_member"; isOwnAccount: boolean }[];
  /** Currently active partner ID */
  activePartnerId: string | null;
  /** Active announcements to show in top bar */
  announcements: { id: string; title: string; message: string; icon: string; type: "info" | "warning" | "success" | "urgent" }[];
  children: React.ReactNode;
}

const GREETINGS = [
  (name: string) => `Hey, ${name}!`,
  (name: string) => `Welcome back, ${name}!`,
  (name: string) => `Good to see you, ${name}!`,
  (name: string) => `Have a great day, ${name}!`,
  (name: string) => `Let's get it, ${name}!`,
  (name: string) => `Hope you're doing well, ${name}!`,
  (name: string) => `Ready to roll, ${name}?`,
  (name: string) => `Happy building, ${name}!`,
  (name: string) => `What's on the agenda, ${name}?`,
  (name: string) => `Let's make it happen, ${name}!`,
  (name: string) => `You've got this, ${name}!`,
  (name: string) => `Nice to see you, ${name}!`,
  (name: string) => `Keep crushing it, ${name}!`,
  (name: string) => `Looking good today, ${name}!`,
  (name: string) => `What's cooking, ${name}?`,
];

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
  userAvatarUrl,
  usageLine,
  usageRatio,
  showUsageBar,
  hasImpersonation,
  accountContexts,
  activePartnerId,
  announcements,
  children,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [greeting] = useState(() => {
    const firstName = userName.split(" ")[0] || userName;
    const idx = Math.floor(Math.random() * GREETINGS.length);
    return GREETINGS[idx](firstName);
  });
  const pathname = usePathname();
  const { resolved: resolvedTheme } = useTheme();
  const logoVariant = resolvedTheme === "dark" ? "light" : "dark";

  // Close mobile drawer on navigation
  useEffect(() => { setMobileDrawerOpen(false); }, [pathname]);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch { /* SSR / privacy mode */ }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      const res = await fetch("/auth/signout", { method: "POST", redirect: "follow" });
      // The route returns a redirect — follow it manually
      if (res.redirected) {
        window.location.href = res.url;
      } else {
        // Fallback: just go to login
        window.location.href = "/login";
      }
    } catch {
      window.location.href = "/login";
    }
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
        <div className={`flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-5"} py-4 mb-1`}>
            <Link href="/dashboard" className="flex items-center shrink-0" title="Dashboard">
              {collapsed ? (
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <span className="text-sm font-black text-primary tracking-tight">lq</span>
                </div>
              ) : (
                <LinqMeLogo variant={logoVariant} className="h-6 w-auto text-primary shrink-0" />
              )}
            </Link>
            {!collapsed && (
              <span className="text-[10px] text-primary/60 uppercase tracking-widest font-semibold">
                {sidebarLabel}
              </span>
            )}
          </div>

        {/* Scrollable middle section */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
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
        </div>

        {/* Account context switcher */}
        {!collapsed && accountContexts.length >= 2 && activePartnerId && (
          <AccountSwitcher contexts={accountContexts} activePartnerId={activePartnerId} />
        )}

        {/* Usage meter */}
        {usageLine && !collapsed && (
          <div className="px-4 py-3 mx-3 mb-2 rounded-xl bg-surface-container-low/60 border border-outline-variant/[0.06] shrink-0">
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
          <div className="px-3 mb-2 shrink-0">
            <ThemeToggle />
          </div>
        )}

        {/* Collapse toggle button */}
        <div className={`px-3 mb-2 shrink-0 ${collapsed ? "flex justify-center" : ""}`}>
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
              <Link href="/dashboard/settings" title="Profile settings">
                {userAvatarUrl ? (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-primary/10 hover:ring-primary/40 transition-all">
                    <Image src={userAvatarUrl} alt="" fill className="object-cover" sizes="32px" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/10 flex items-center justify-center text-[10px] font-bold text-primary ring-1 ring-primary/10 hover:ring-primary/40 transition-all">
                    {(userName || userEmail).slice(0, 1).toUpperCase()}
                  </div>
                )}
              </Link>
              <button onClick={handleSignOut} className="text-on-surface-variant/40 hover:text-primary transition-colors" title="Sign out">
                <i className="fa-solid fa-right-from-bracket text-xs" />
              </button>
            </div>
          ) : (
            <>
              <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors group/avatar">
                {userAvatarUrl ? (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-primary/10 group-hover/avatar:ring-primary/40 transition-all shrink-0">
                    <Image src={userAvatarUrl} alt="" fill className="object-cover" sizes="32px" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/10 flex items-center justify-center text-[10px] font-bold text-primary ring-1 ring-primary/10 group-hover/avatar:ring-primary/40 transition-all shrink-0">
                    {(userName || userEmail).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">{userName || userEmail}</p>
                  <p className="text-[10px] text-on-surface-variant/50 truncate">{userEmail}</p>
                </div>
              </Link>
              <div className="px-3 mt-1">
                <button onClick={handleSignOut} className="text-xs text-on-surface-variant/40 hover:text-primary transition-colors duration-300 uppercase tracking-widest">
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ── Mobile slide-out drawer ── */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-background border-r border-on-surface/[0.06] flex flex-col overflow-y-auto animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
            style={topStyle}
          >
            {/* Logo + close */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-on-surface/[0.06]">
              <Link href="/dashboard" className="flex items-center shrink-0" onClick={() => setMobileDrawerOpen(false)}>
                <LinqMeLogo variant={logoVariant} className="h-6 w-auto text-primary shrink-0" />
              </Link>
              <button onClick={() => setMobileDrawerOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/60 hover:bg-on-surface/5 transition-colors">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Nav */}
            <div className="flex-1 px-3 py-3" onClick={() => setMobileDrawerOpen(false)}>
              <SidebarNav
                isAdmin={isAdmin}
                isPartnerMember={isPartnerMember}
                showPartners={showPartners}
                accountName={accountName}
                workspaceItems={workspaceItems}
                adminItems={adminItems}
                collapsed={false}
              />
            </div>

            {/* Account switcher */}
            {accountContexts.length >= 2 && activePartnerId && (
              <div onClick={() => setMobileDrawerOpen(false)}>
                <AccountSwitcher contexts={accountContexts} activePartnerId={activePartnerId} />
              </div>
            )}

            {/* Usage meter */}
            {usageLine && (
              <div className="px-4 py-3 mx-3 mb-2 rounded-xl bg-surface-container-low/60 border border-outline-variant/[0.06]">
                <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-1 font-label">Usage</div>
                <div className="text-xs text-on-surface">{usageLine}</div>
                {showUsageBar && (
                  <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-gradient-to-r from-primary to-inverse-primary transition-all rounded-full" style={{ width: `${Math.round(usageRatio * 100)}%` }} />
                  </div>
                )}
              </div>
            )}

            {/* Theme toggle */}
            <div className="px-3 mb-2">
              <ThemeToggle />
            </div>

            {/* User footer */}
            <div className="border-t border-on-surface/[0.06] px-3 py-4 mt-auto">
              <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors" onClick={() => setMobileDrawerOpen(false)}>
                {userAvatarUrl ? (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-primary/10 shrink-0">
                    <Image src={userAvatarUrl} alt="" fill className="object-cover" sizes="32px" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/10 flex items-center justify-center text-[10px] font-bold text-primary ring-1 ring-primary/10 shrink-0">
                    {(userName || userEmail).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">{userName || userEmail}</p>
                  <p className="text-[10px] text-on-surface-variant/50 truncate">{userEmail}</p>
                </div>
              </Link>
              <div className="px-3 mt-1">
                <button onClick={handleSignOut} className="text-xs text-on-surface-variant/40 hover:text-primary transition-colors duration-300 uppercase tracking-widest">
                  Sign out
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/90 backdrop-blur-xl border-t border-on-surface/[0.06]" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-stretch justify-around h-14">
          {(workspaceItems.slice(0, 4)).map((item) => {
            const isActive = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
            // Short labels for mobile tab bar
            const shortLabel = item.label
              .replace("Dashboard", "Home");
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors ${
                  isActive ? "text-primary" : "text-on-surface-variant/50"
                }`}>
                <i className={`fa-solid ${item.icon} text-lg`} />
                <span className="text-[9px] font-semibold leading-none truncate max-w-[56px]">{shortLabel}</span>
              </Link>
            );
          })}
          {/* More / hamburger for full sidebar */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center flex-1 gap-0.5 text-on-surface-variant/50 transition-colors"
          >
            <i className="fa-solid fa-bars text-lg" />
            <span className="text-[9px] font-semibold leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className={`flex-1 ${mainMargin} min-h-screen pb-20 md:pb-0 transition-all duration-300 overflow-x-hidden`}>
        {/* Top bar with announcements + notification */}
        <div className="sticky top-0 z-30 flex items-stretch bg-surface/80 backdrop-blur-md border-b border-on-surface/[0.04] min-h-[44px]">
          {/* Mobile hamburger in top bar */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden shrink-0 px-3 flex items-center text-on-surface-variant/60 hover:text-primary transition-colors"
          >
            <i className="fa-solid fa-bars text-lg" />
          </button>
          {/* Session greeting */}
          <div className="hidden md:flex shrink-0 px-5 items-center">
            <span className="text-sm text-on-surface-variant/60 font-medium truncate">{greeting}</span>
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            {announcements.length > 0 && (
              <AnnouncementBanner announcements={announcements} />
            )}
          </div>
          <div className="shrink-0 px-3 md:px-5 flex items-center">
            <NotificationBell />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
