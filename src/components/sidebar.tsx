"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppLogo from "./mtc-logo";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "OPS CENTER",
    exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/dashboard/maps",
    label: "TACTICAL MAPS",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    ),
  },
  {
    href: "/dashboard/briefings",
    label: "BRIEFINGS",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="0" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="7" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    href: "/dashboard/parties",
    label: "PARTY FINDER",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <aside className="w-16 shrink-0 bg-bg-surface border-r border-border flex flex-col items-center py-4 gap-1">
      {/* Logo */}
      <Link href="/dashboard" className="mb-4 mt-1" aria-label="UEE ATAK Home">
        <AppLogo size="sm" />
      </Link>

      {/* Divider */}
      <div className="w-8 h-px bg-border mb-2" />

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={[
                "relative w-10 h-10 flex items-center justify-center transition-all duration-150",
                active
                  ? "text-accent bg-accent/10 border border-accent/30"
                  : "text-text-dim hover:text-text-primary hover:bg-bg-elevated",
              ].join(" ")}
            >
              {item.icon}
              {/* Active indicator */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="w-8 h-px bg-border mb-2" />

      {/* Settings */}
      <Link
        href="/dashboard/settings"
        title="SETTINGS"
        className="w-10 h-10 flex items-center justify-center text-text-dim hover:text-text-primary hover:bg-bg-elevated transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </Link>
    </aside>
  );
}
