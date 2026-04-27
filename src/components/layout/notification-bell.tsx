"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    title: "Analysis complete",
    body: "Your analysis of \"Q1 Customer Reviews\" is ready to review.",
    time: "2h ago",
    unread: true,
  },
  {
    id: "n2",
    title: "New reviews synced",
    body: "12 new reviews imported from Google Business Profile.",
    time: "5h ago",
    unread: true,
  },
  {
    id: "n3",
    title: "Approaching plan limit",
    body: "You've used 40 of 50 reviews this month.",
    time: "1d ago",
    unread: true,
  },
  {
    id: "n4",
    title: "Welcome to ReviewPulse",
    body: "Run your first analysis to see actionable insights.",
    time: "3d ago",
    unread: false,
  },
];

type Props = {
  collapsed?: boolean;
};

export function NotificationBell({ collapsed = false }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(
    SAMPLE_NOTIFICATIONS
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const unreadCount = notifications.filter((n) => n.unread).length;
  const displayCount = unreadCount > 9 ? "9+" : String(unreadCount);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div
      ref={containerRef}
      data-testid="notification-bell"
      style={{ position: "relative" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "10px 0" : "10px 12px",
          borderRadius: 8,
          cursor: "pointer",
          justifyContent: collapsed ? "center" : "flex-start",
          background: "transparent",
          color: "var(--tx2)",
          fontWeight: 400,
          fontSize: 14,
          border: "none",
          fontFamily: "inherit",
          width: "100%",
          position: "relative",
        }}
      >
        <span style={{ position: "relative", display: "inline-flex" }}>
          <Icon name="bell" size={18} color="var(--tx2)" />
          {unreadCount > 0 && (
            <span
              data-testid="notification-badge"
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -4,
                right: -6,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: 8,
                background: "var(--coral)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                lineHeight: "16px",
                textAlign: "center",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {displayCount}
            </span>
          )}
        </span>
        {!collapsed && (
          <span
            style={{
              whiteSpace: "nowrap",
              flex: 1,
              textAlign: "left",
            }}
          >
            Notifications
          </span>
        )}
        {!collapsed && unreadCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--coral)",
            }}
          >
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          data-testid="notification-panel"
          className="card"
          style={{
            position: "fixed",
            left: collapsed ? 72 : 248,
            bottom: 120,
            zIndex: 400,
            width: 320,
            maxHeight: 420,
            display: "flex",
            flexDirection: "column",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--bd)",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--tx)" }}>
              Notifications
            </span>
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              style={{
                fontSize: 12,
                color: unreadCount === 0 ? "var(--tx3)" : "var(--teal)",
                fontWeight: 600,
                background: "transparent",
                border: "none",
                cursor: unreadCount === 0 ? "default" : "pointer",
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              Mark all read
            </button>
          </div>

          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              overflowY: "auto",
              flex: 1,
            }}
          >
            {notifications.length === 0 ? (
              <li
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  color: "var(--tx3)",
                  fontSize: 13,
                }}
              >
                You're all caught up.
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  data-testid={`notification-item-${n.id}`}
                  data-unread={n.unread ? "true" : "false"}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--bd)",
                    background: n.unread
                      ? "color-mix(in srgb, var(--teal) 6%, transparent)"
                      : "transparent",
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: n.unread ? "var(--coral)" : "transparent",
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--tx)",
                        marginBottom: 2,
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--tx2)",
                        lineHeight: 1.4,
                        marginBottom: 4,
                      }}
                    >
                      {n.body}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--tx3)" }}>
                      {n.time}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>

          <div
            style={{
              borderTop: "1px solid var(--bd)",
              padding: "10px 16px",
              textAlign: "center",
            }}
          >
            <Link
              href="/settings/notifications"
              onClick={() => setOpen(false)}
              style={{
                fontSize: 12,
                color: "var(--teal)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Notification settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
