"use client";

import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { useThemeStore } from "@/stores/theme-store";

export type NavItem = {
  id: string;
  label: string;
  icon: IconName;
  href?: string;
  accent?: boolean;
};

type DashboardShellProps = {
  activeId?: string;
  items?: NavItem[];
  onNavigate?: (id: string) => void;
  user?: { name: string; email: string; initials?: string };
  usage?: { used: number; limit: number; plan: string };
  children?: ReactNode;
};

const DEFAULT_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dash" },
  { id: "projects", label: "Projects", icon: "folder" },
  { id: "analysis", label: "New Analysis", icon: "plus", accent: true },
  { id: "trends", label: "Trends", icon: "trend" },
  { id: "integrations", label: "Integrations", icon: "link" },
  { id: "settings", label: "Settings", icon: "gear" },
  { id: "billing", label: "Billing", icon: "card" },
];

export function DashboardShell({
  activeId,
  items = DEFAULT_ITEMS,
  onNavigate,
  user,
  usage,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isDark, toggle } = useThemeStore();

  const initials =
    user?.initials ??
    (user?.name
      ? user.name
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "U");

  const handleNav = (id: string) => {
    onNavigate?.(id);
    setMobileOpen(false);
    setUserMenuOpen(false);
  };

  const isActive = (id: string) => activeId === id;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--pagebg)" }}>
      <div
        className={`overlay ${mobileOpen ? "show" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <div className="mobile-bar">
        <button
          className="btn btn-outline"
          style={{ padding: 6 }}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <Icon name="menu" size={20} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="logo" size={24} />
          <span style={{ fontWeight: 700 }}>ReviewPulse</span>
        </div>
        <div
          onClick={() => setUserMenuOpen((v) => !v)}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--navybg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--navy)",
            cursor: "pointer",
          }}
        >
          {initials}
        </div>
      </div>

      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      >
        <div
          onClick={() => handleNav("dashboard")}
          style={{
            padding: "16px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid var(--bd)",
            cursor: "pointer",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <Icon name="logo" size={28} />
          {!collapsed && (
            <span style={{ fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}>
              ReviewPulse
            </span>
          )}
        </div>

        <nav style={{ flex: 1, padding: 8 }} aria-label="Primary">
          {items.map((item) => {
            const active = isActive(item.id);
            const bg = item.accent
              ? "var(--teal)"
              : active
                ? "var(--navybg)"
                : "transparent";
            const color = item.accent ? "#fff" : active ? "var(--navy)" : "var(--tx2)";
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: collapsed ? "10px 0" : "10px 12px",
                  borderRadius: 8,
                  marginBottom: 2,
                  cursor: "pointer",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: bg,
                  color,
                  fontWeight: active || item.accent ? 600 : 400,
                  fontSize: 14,
                  borderLeft:
                    active && !item.accent
                      ? "3px solid var(--teal)"
                      : "3px solid transparent",
                  width: "100%",
                  border: "none",
                  fontFamily: "inherit",
                }}
              >
                <Icon name={item.icon} size={18} color={color} />
                {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            borderTop: "1px solid var(--bd)",
            padding: collapsed ? "12px 8px" : "16px 12px",
          }}
        >
          {!collapsed && usage && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "var(--tx2)",
                  marginBottom: 6,
                }}
              >
                <span>Reviews</span>
                <span style={{ fontWeight: 600 }}>
                  {usage.used}/{usage.limit}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "var(--bd)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "var(--teal)",
                    borderRadius: 3,
                    width: `${Math.min(100, (usage.used / usage.limit) * 100)}%`,
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 4 }}>
                {usage.plan} plan
              </div>
            </div>
          )}

          {user && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  width: "100%",
                  fontFamily: "inherit",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "var(--navybg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--navy)",
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                {!collapsed && (
                  <div style={{ overflow: "hidden", flex: 1, textAlign: "left" }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {user.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--tx3)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user.email}
                    </div>
                  </div>
                )}
                {!collapsed && <Icon name="cD" size={14} color="var(--tx3)" />}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={toggle}
          style={{
            padding: collapsed ? "8px 0" : "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderTop: "1px solid var(--bd)",
            cursor: "pointer",
            color: "var(--tx2)",
            fontSize: 13,
            justifyContent: collapsed ? "center" : "flex-start",
            background: "transparent",
            border: "none",
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "var(--bd)",
            width: "100%",
            fontFamily: "inherit",
          }}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Icon name={isDark ? "sun" : "moon"} size={16} color="var(--tx2)" />
          {!collapsed && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
        </button>

        <button
          className="hide-mobile"
          onClick={() => setCollapsed((v) => !v)}
          style={{
            padding: 8,
            textAlign: "center",
            borderTop: "1px solid var(--bd)",
            cursor: "pointer",
            color: "var(--tx3)",
            background: "transparent",
            border: "none",
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "var(--bd)",
            width: "100%",
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name={collapsed ? "cR" : "cL"} size={16} />
        </button>
      </aside>

      {userMenuOpen && user && (
        <div
          className="card"
          style={{
            position: "fixed",
            bottom: 80,
            left: collapsed ? 72 : 16,
            zIndex: 400,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            overflow: "hidden",
            minWidth: 180,
          }}
        >
          <button
            onClick={() => handleNav("settings")}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              color: "var(--tx2)",
              cursor: "pointer",
              borderBottom: "1px solid var(--bd)",
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              fontFamily: "inherit",
            }}
          >
            Profile
          </button>
          <button
            onClick={() => handleNav("billing")}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              color: "var(--tx2)",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              fontFamily: "inherit",
            }}
          >
            Billing
          </button>
        </div>
      )}

      <main
        className="main-content"
        style={{
          flex: 1,
          padding: "24px 32px",
          overflow: "auto",
          maxWidth: 1200,
        }}
      >
        {children}
      </main>
    </div>
  );
}
