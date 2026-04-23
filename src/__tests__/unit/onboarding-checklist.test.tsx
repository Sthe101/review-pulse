import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import type { OnboardingChecklist } from "@/types/database";

const updateMock = vi.hoisted(() => vi.fn());
const eqMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      update: (v: unknown) => {
        updateMock(v);
        return {
          eq: (col: string, val: string) => {
            eqMock(col, val);
            return Promise.resolve({ error: null });
          },
        };
      },
    }),
  }),
}));

import { OnboardingChecklistCard } from "@/components/dashboard/onboarding-checklist";

function makeChecklist(
  overrides: Partial<OnboardingChecklist> = {}
): OnboardingChecklist {
  return {
    account: false,
    survey: false,
    firstProject: false,
    firstAnalysis: false,
    firstExport: false,
    ...overrides,
  };
}

describe("OnboardingChecklistCard", () => {
  beforeEach(() => {
    updateMock.mockReset();
    eqMock.mockReset();
  });

  it("renders 5 items", () => {
    render(
      <OnboardingChecklistCard checklist={makeChecklist()} userId="u_1" />
    );
    expect(screen.getByTestId("checklist-item-account")).toBeInTheDocument();
    expect(screen.getByTestId("checklist-item-survey")).toBeInTheDocument();
    expect(
      screen.getByTestId("checklist-item-firstProject")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("checklist-item-firstAnalysis")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("checklist-item-firstExport")
    ).toBeInTheDocument();
  });

  it("completed items show checkmark + strikethrough", () => {
    render(
      <OnboardingChecklistCard
        checklist={makeChecklist({ account: true, survey: true })}
        userId="u_1"
      />
    );
    const accountItem = screen.getByTestId("checklist-item-account");
    const accountLabel = within(accountItem).getByText(/create your account/i);
    expect(accountLabel.style.textDecoration).toBe("line-through");
    const accountBubble = accountItem.querySelector(
      "span[aria-hidden]"
    ) as HTMLElement;
    expect(accountBubble.querySelector("svg")).not.toBeNull();

    const surveyItem = screen.getByTestId("checklist-item-survey");
    const surveyLabel = within(surveyItem).getByText(/complete setup survey/i);
    expect(surveyLabel.style.textDecoration).toBe("line-through");
  });

  it("incomplete items show empty circle (no checkmark)", () => {
    render(
      <OnboardingChecklistCard
        checklist={makeChecklist({ account: true })}
        userId="u_1"
      />
    );
    const surveyItem = screen.getByTestId("checklist-item-survey");
    const bubble = surveyItem.querySelector(
      "span[aria-hidden]"
    ) as HTMLElement;
    expect(bubble.querySelector("svg")).toBeNull();
    const label = within(surveyItem).getByText(/complete setup survey/i);
    expect(label.style.textDecoration).toBe("none");
  });

  it("progress bar matches completion count", () => {
    const { rerender } = render(
      <OnboardingChecklistCard
        checklist={makeChecklist({ account: true })}
        userId="u_1"
      />
    );
    let pb = screen.getByRole("progressbar");
    expect(pb.getAttribute("aria-valuenow")).toBe("1");
    expect(pb.getAttribute("aria-valuemax")).toBe("5");
    expect(screen.getByTestId("checklist-progress-fill").style.width).toBe(
      "20%"
    );
    expect(screen.getByText(/1 of 5 complete/i)).toBeInTheDocument();

    rerender(
      <OnboardingChecklistCard
        checklist={makeChecklist({
          account: true,
          survey: true,
          firstProject: true,
        })}
        userId="u_1"
      />
    );
    pb = screen.getByRole("progressbar");
    expect(pb.getAttribute("aria-valuenow")).toBe("3");
    expect(screen.getByTestId("checklist-progress-fill").style.width).toBe(
      "60%"
    );
    expect(screen.getByText(/3 of 5 complete/i)).toBeInTheDocument();
  });

  it("'Start →' appears on the first incomplete item only", () => {
    render(
      <OnboardingChecklistCard
        checklist={makeChecklist({ account: true })}
        userId="u_1"
      />
    );
    const surveyItem = screen.getByTestId("checklist-item-survey");
    const startLink = surveyItem.querySelector("a");
    expect(startLink).not.toBeNull();
    expect(startLink!.textContent).toMatch(/start/i);
    expect(startLink!.getAttribute("href")).toBe("/onboarding");

    expect(
      screen.getByTestId("checklist-item-firstProject").querySelector("a")
    ).toBeNull();
    expect(
      screen.getByTestId("checklist-item-firstAnalysis").querySelector("a")
    ).toBeNull();
    expect(
      screen.getByTestId("checklist-item-firstExport").querySelector("a")
    ).toBeNull();
  });

  it("all complete → shows celebration state with confetti", async () => {
    render(
      <OnboardingChecklistCard
        checklist={makeChecklist({
          account: true,
          survey: true,
          firstProject: true,
          firstAnalysis: true,
          firstExport: true,
        })}
        userId="u_1"
      />
    );
    expect(screen.getByText(/you're all set/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/get started with reviewpulse/i)
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /dismiss/i })).toBeNull();

    await waitFor(() =>
      expect(screen.getByTestId("checklist-confetti")).toBeInTheDocument()
    );
  });

  it("dismiss hides the component and persists onboarding_completed", async () => {
    const onDismiss = vi.fn();
    render(
      <OnboardingChecklistCard
        checklist={makeChecklist({ account: true })}
        userId="u_1"
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/get started with reviewpulse/i)
      ).toBeNull();
    });
    expect(updateMock).toHaveBeenCalledWith({ onboarding_completed: true });
    expect(eqMock).toHaveBeenCalledWith("id", "u_1");
    expect(onDismiss).toHaveBeenCalled();
  });
});
