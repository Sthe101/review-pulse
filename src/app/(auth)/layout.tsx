import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        background: "var(--pagebg)",
      }}
    >
      <Link
        href="/"
        aria-label="ReviewPulse home"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          color: "var(--tx)",
          marginBottom: 28,
        }}
      >
        <Icon name="logo" size={36} />
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
          ReviewPulse
        </span>
      </Link>

      <div style={{ width: "100%", maxWidth: 420 }}>{children}</div>
    </main>
  );
}
