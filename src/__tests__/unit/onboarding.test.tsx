import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const pushMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const eqMock = vi.hoisted(() => vi.fn());
const insertMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => ({
      update: (v: unknown) => {
        updateMock(v);
        return { eq: (col: string, val: string) => eqMock(col, val) };
      },
      insert: (v: unknown) => {
        insertMock(table, v);
        const chain: Record<string, unknown> = {
          select: () => ({
            single: async () => ({
              data: { id: "demo_proj_1" },
              error: null,
            }),
          }),
          then: (resolve: (value: { error: null }) => unknown) =>
            resolve({ error: null }),
        };
        return chain;
      },
    }),
  }),
}));

vi.mock("sonner", () => ({ toast: { error: toastErrorMock } }));

import OnboardingPage from "@/app/(auth)/onboarding/page";

async function renderOnboarding() {
  getUserMock.mockResolvedValue({
    data: { user: { id: "u_test_1" } },
    error: null,
  });
  eqMock.mockResolvedValue({ error: null });
  render(<OnboardingPage />);
  await waitFor(() => expect(getUserMock).toHaveBeenCalled());
}

function getCard(label: string | RegExp): HTMLElement {
  const el = screen.getByText(label).closest('[role="button"]');
  if (!el) throw new Error(`No card found for ${label}`);
  return el as HTMLElement;
}

function currentStep(): number {
  return Number(
    screen.getByRole("progressbar").getAttribute("aria-valuenow") ?? "1"
  );
}

function advanceOnce() {
  const step = currentStep();
  if (step === 1) fireEvent.click(getCard(/Business Owner/i));
  else if (step === 2) fireEvent.click(getCard(/E-commerce/i));
  else if (step === 3)
    fireEvent.click(screen.getByRole("button", { name: /^Google$/i }));
  else if (step === 4) fireEvent.click(getCard(/Find & Fix Complaints/i));
  fireEvent.click(screen.getByRole("button", { name: /continue|get started/i }));
}

function advanceToStep(n: number) {
  while (currentStep() < n) advanceOnce();
}

describe("OnboardingPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    getUserMock.mockReset();
    updateMock.mockReset();
    eqMock.mockReset();
    insertMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("renders step 1 with 6 role options", async () => {
    await renderOnboarding();
    expect(screen.getByText(/Business Owner/i)).toBeInTheDocument();
    expect(screen.getByText(/Marketing Manager/i)).toBeInTheDocument();
    expect(screen.getByText(/Product Manager/i)).toBeInTheDocument();
    expect(screen.getByText(/CX\/Support/i)).toBeInTheDocument();
    expect(screen.getByText(/^Agency$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Other$/i)).toBeInTheDocument();
  });

  it("selecting an option highlights it", async () => {
    await renderOnboarding();
    const card = getCard(/Business Owner/i);
    expect(card.style.borderColor).toBe("");
    fireEvent.click(card);
    expect(getCard(/Business Owner/i).style.borderColor).toBe("var(--teal)");
  });

  it("Continue disabled when nothing selected", async () => {
    await renderOnboarding();
    const btn = screen.getByRole("button", { name: /continue/i });
    expect(btn).toBeDisabled();
  });

  it("Continue enabled after selection", async () => {
    await renderOnboarding();
    fireEvent.click(getCard(/Business Owner/i));
    const btn = screen.getByRole("button", { name: /continue/i });
    expect(btn).not.toBeDisabled();
  });

  it("Back button hidden on step 1", async () => {
    await renderOnboarding();
    expect(screen.queryByRole("button", { name: /back/i })).toBeNull();
  });

  it("Back button shows on steps 2-4", async () => {
    await renderOnboarding();
    await advanceToStep(2);
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    await advanceToStep(3);
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    await advanceToStep(4);
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("step 3 allows multi-select", async () => {
    await renderOnboarding();
    await advanceToStep(3);
    const google = screen.getByRole("button", { name: /^Google$/i });
    const yelp = screen.getByRole("button", { name: /^Yelp$/i });
    fireEvent.click(google);
    fireEvent.click(yelp);
    expect(google).toHaveAttribute("aria-pressed", "true");
    expect(yelp).toHaveAttribute("aria-pressed", "true");
  });

  it("progress bar shows correct percentage (25/50/75/100)", async () => {
    await renderOnboarding();
    expect(screen.getByTestId("progress-fill").style.width).toBe("25%");
    await advanceToStep(2);
    expect(screen.getByTestId("progress-fill").style.width).toBe("50%");
    await advanceToStep(3);
    expect(screen.getByTestId("progress-fill").style.width).toBe("75%");
    await advanceToStep(4);
    expect(screen.getByTestId("progress-fill").style.width).toBe("100%");
  });

  it("Skip button calls save with { skipped: true }", async () => {
    await renderOnboarding();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    });
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith({
      onboarding_data: { skipped: true },
      onboarding_completed: true,
    });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("final step shows 'Get Started →' not 'Continue →'", async () => {
    await renderOnboarding();
    await advanceToStep(4);
    expect(
      screen.getByRole("button", { name: /get started/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /continue/i })
    ).toBeNull();
  });
});
