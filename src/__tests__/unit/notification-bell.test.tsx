import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { NotificationBell } from "@/components/layout/notification-bell";

function getBellButton(): HTMLButtonElement {
  return screen
    .getByTestId("notification-bell")
    .querySelector("button") as HTMLButtonElement;
}

describe("NotificationBell", () => {
  it("renders the bell icon", () => {
    render(<NotificationBell />);
    const bell = getBellButton();
    expect(bell).toBeInTheDocument();
    expect(bell.getAttribute("aria-haspopup")).toBe("dialog");
    expect(bell.querySelector("svg")).not.toBeNull();
  });

  it("shows unread count badge", () => {
    render(<NotificationBell />);
    const badge = screen.getByTestId("notification-badge");
    // Three of the four sample notifications are unread.
    expect(badge.textContent).toBe("3");
    const bell = getBellButton();
    expect(bell.getAttribute("aria-label")).toMatch(/3 unread/i);
  });

  it("clicking the bell opens the dropdown panel", () => {
    render(<NotificationBell />);
    expect(screen.queryByTestId("notification-panel")).toBeNull();
    fireEvent.click(getBellButton());
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
    expect(getBellButton().getAttribute("aria-expanded")).toBe("true");
  });

  it("panel shows notification items with title, body, and time", () => {
    render(<NotificationBell />);
    fireEvent.click(getBellButton());
    const panel = screen.getByTestId("notification-panel");
    expect(within(panel).getByText(/analysis complete/i)).toBeInTheDocument();
    expect(within(panel).getByText(/new reviews synced/i)).toBeInTheDocument();
    expect(within(panel).getByText(/approaching plan limit/i)).toBeInTheDocument();
    expect(within(panel).getByText(/welcome to reviewpulse/i)).toBeInTheDocument();
    // 4 items total
    expect(panel.querySelectorAll("[data-testid^='notification-item-']")).toHaveLength(
      4
    );
    // 3 are unread
    expect(
      panel.querySelectorAll("[data-testid^='notification-item-'][data-unread='true']")
    ).toHaveLength(3);
  });

  it("'Mark all read' clears unread indicators", () => {
    render(<NotificationBell />);
    fireEvent.click(getBellButton());
    const panel = screen.getByTestId("notification-panel");
    fireEvent.click(within(panel).getByText(/mark all read/i));

    expect(
      panel.querySelectorAll("[data-testid^='notification-item-'][data-unread='true']")
    ).toHaveLength(0);
    expect(screen.queryByTestId("notification-badge")).toBeNull();
    const markBtn = within(panel).getByText(
      /mark all read/i
    ) as HTMLButtonElement;
    expect(markBtn.disabled).toBe(true);
  });

  it("'Notification settings' link points to /settings", () => {
    render(<NotificationBell />);
    fireEvent.click(getBellButton());
    const link = screen.getByRole("link", { name: /notification settings/i });
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("/settings")).toBe(true);
  });

  it("clicking outside closes the panel", () => {
    render(
      <div>
        <NotificationBell />
        <button data-testid="outside">outside</button>
      </div>
    );
    fireEvent.click(getBellButton());
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByTestId("notification-panel")).toBeNull();
    expect(getBellButton().getAttribute("aria-expanded")).toBe("false");
  });
});
