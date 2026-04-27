import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const themeToggleMock = vi.hoisted(() => vi.fn());
const themeStateMock = vi.hoisted(() => ({ isDark: false }));

vi.mock("@/stores/theme-store", () => ({
  useThemeStore: () => ({
    isDark: themeStateMock.isDark,
    toggle: themeToggleMock,
    hydrate: vi.fn(),
  }),
}));

const NAV_LABELS = [
  "Dashboard",
  "Projects",
  "New Analysis",
  "Trends",
  "Integrations",
  "Settings",
  "Billing",
];

const TEST_USER = {
  name: "Jane Doe",
  email: "jane@example.com",
};

const TEST_USAGE = {
  used: 12,
  limit: 50,
  plan: "Free",
};

beforeEach(() => {
  themeToggleMock.mockReset();
  themeStateMock.isDark = false;
});

describe("DashboardShell", () => {
  it("renders all 7 nav items", () => {
    render(<DashboardShell user={TEST_USER} usage={TEST_USAGE} />);
    const nav = screen.getByRole("navigation", { name: /primary/i });
    for (const label of NAV_LABELS) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    expect(within(nav).getAllByRole("button")).toHaveLength(7);
  });

  it("active page has highlighted style", () => {
    render(
      <DashboardShell activeId="projects" user={TEST_USER} usage={TEST_USAGE} />
    );
    const nav = screen.getByRole("navigation", { name: /primary/i });
    const projectsBtn = within(nav).getByText("Projects").closest(
      "button"
    ) as HTMLButtonElement;
    expect(projectsBtn.dataset.active).toBe("true");
    expect(projectsBtn.style.background).toBe("var(--navybg)");
    expect(projectsBtn.style.color).toBe("var(--navy)");
    expect(projectsBtn.style.fontWeight).toBe("600");

    const trendsBtn = within(nav).getByText("Trends").closest(
      "button"
    ) as HTMLButtonElement;
    expect(trendsBtn.dataset.active).toBe("false");
    expect(trendsBtn.style.background).toBe("transparent");
    expect(trendsBtn.style.color).toBe("var(--tx2)");
  });

  it("collapse button toggles sidebar width", () => {
    render(<DashboardShell user={TEST_USER} usage={TEST_USAGE} />);
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.dataset.collapsed).toBe("false");
    expect(sidebar.className).not.toContain("collapsed");

    fireEvent.click(
      screen.getByRole("button", { name: /collapse sidebar/i })
    );

    expect(sidebar.dataset.collapsed).toBe("true");
    expect(sidebar.className).toContain("collapsed");

    fireEvent.click(
      screen.getByRole("button", { name: /expand sidebar/i })
    );
    expect(sidebar.dataset.collapsed).toBe("false");
  });

  it("collapsed: text hidden, icons centered", () => {
    render(<DashboardShell user={TEST_USER} usage={TEST_USAGE} />);
    fireEvent.click(
      screen.getByRole("button", { name: /collapse sidebar/i })
    );

    for (const label of NAV_LABELS) {
      expect(screen.queryByText(label)).toBeNull();
    }

    const sidebar = screen.getByTestId("sidebar");
    const navButtons = within(
      sidebar.querySelector('nav[aria-label="Primary"]') as HTMLElement
    ).getAllByRole("button");
    for (const btn of navButtons) {
      expect((btn as HTMLElement).style.justifyContent).toBe("center");
    }

    expect(screen.queryByText(TEST_USER.email)).toBeNull();
    expect(screen.queryByText(TEST_USER.name)).toBeNull();
  });

  it("user dropdown opens and closes", () => {
    render(<DashboardShell user={TEST_USER} usage={TEST_USAGE} />);
    expect(screen.queryByTestId("user-dropdown")).toBeNull();

    const sidebar = screen.getByTestId("sidebar");
    const userButton = within(sidebar)
      .getByText(TEST_USER.name)
      .closest("button") as HTMLButtonElement;
    fireEvent.click(userButton);

    const dropdown = screen.getByTestId("user-dropdown");
    expect(dropdown).toBeInTheDocument();
    expect(within(dropdown).getByText("Profile")).toBeInTheDocument();
    expect(within(dropdown).getByText("Billing")).toBeInTheDocument();
    expect(within(dropdown).getByText("Sign out")).toBeInTheDocument();

    fireEvent.click(userButton);
    expect(screen.queryByTestId("user-dropdown")).toBeNull();
  });

  it("clicking Sign out calls onSignOut and closes dropdown", () => {
    const onSignOut = vi.fn();
    render(
      <DashboardShell
        user={TEST_USER}
        usage={TEST_USAGE}
        onSignOut={onSignOut}
      />
    );

    const sidebar = screen.getByTestId("sidebar");
    const userButton = within(sidebar)
      .getByText(TEST_USER.name)
      .closest("button") as HTMLButtonElement;
    fireEvent.click(userButton);

    const dropdown = screen.getByTestId("user-dropdown");
    fireEvent.click(within(dropdown).getByText("Sign out"));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("user-dropdown")).toBeNull();
  });

  it("usage meter shows correct values", () => {
    render(
      <DashboardShell
        user={TEST_USER}
        usage={{ used: 25, limit: 50, plan: "Free" }}
      />
    );
    expect(screen.getByText("25/50")).toBeInTheDocument();
    expect(screen.getByText(/Free plan/i)).toBeInTheDocument();
  });
});
