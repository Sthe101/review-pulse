"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { useThemeStore } from "@/stores/theme-store";

type LandingLayoutProps = {
  children: ReactNode;
};

export function LandingLayout({ children }: LandingLayoutProps) {
  const { isDark, toggle } = useThemeStore();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav
        className="landing-nav"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--bd)",
          background: "var(--bg2)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <Icon name="logo" size={28} />
          <span style={{ fontWeight: 700, fontSize: 18 }}>ReviewPulse</span>
        </Link>

        <div
          className="nav-links"
          style={{ display: "flex", gap: 24, alignItems: "center", fontSize: 14 }}
        >
          <Link href="/#features" style={{ color: "var(--tx2)", textDecoration: "none" }}>
            Features
          </Link>
          <Link href="/#pricing" style={{ color: "var(--tx2)", textDecoration: "none" }}>
            Pricing
          </Link>
          <button
            onClick={toggle}
            style={{
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              background: "transparent",
              border: "none",
            }}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Icon name={isDark ? "sun" : "moon"} size={18} color="var(--tx2)" />
          </button>
          <Link
            href="/login"
            style={{
              color: "var(--navy)",
              cursor: "pointer",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Log In
          </Link>
          <Link href="/signup" className="btn btn-coral" style={{ textDecoration: "none" }}>
            Get Started Free →
          </Link>
        </div>

        <div className="show-mobile" style={{ display: "none", gap: 8, alignItems: "center" }}>
          <button
            onClick={toggle}
            style={{
              cursor: "pointer",
              padding: 4,
              display: "flex",
              background: "transparent",
              border: "none",
            }}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Icon name={isDark ? "sun" : "moon"} size={18} color="var(--tx2)" />
          </button>
          <Link
            href="/signup"
            className="btn btn-coral"
            style={{ padding: "8px 14px", fontSize: 13, textDecoration: "none" }}
          >
            Get Started →
          </Link>
        </div>
      </nav>

      <main style={{ flex: 1 }}>{children}</main>

      <footer
        style={{
          borderTop: "1px solid var(--bd)",
          padding: "40px 24px",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 32,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icon name="logo" size={24} />
              <span style={{ fontWeight: 700 }}>ReviewPulse</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--tx3)" }}>AI-powered review insights</p>
          </div>
          {(
            [
              ["Product", [["Features", "/#features"], ["Pricing", "/#pricing"]]],
              ["Company", [["About", "/about"], ["Blog", "/blog"]]],
              ["Legal", [["Privacy", "/privacy"], ["Terms", "/terms"]]],
            ] as const
          ).map(([title, links]) => (
            <div key={title}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>{title}</div>
              {links.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--tx3)",
                    marginBottom: 8,
                    textDecoration: "none",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: "1px solid var(--bd)",
            marginTop: 32,
            paddingTop: 16,
            fontSize: 12,
            color: "var(--tx3)",
          }}
        >
          © 2026 ReviewPulse. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
