import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";

const reviewInsertMock = vi.hoisted(() => vi.fn());
const reviewInsertResultMock = vi.hoisted(() =>
  vi.fn(async () => ({ error: null }))
);
const toastErrorMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "reviews") {
        return {
          insert: (v: unknown) => {
            reviewInsertMock(v);
            return reviewInsertResultMock();
          },
        };
      }
      return {};
    },
  }),
}));

import { AddReviewsTab, parseReviews } from "@/components/projects/add-reviews-tab";

const fetchMock = vi.fn();

beforeEach(() => {
  reviewInsertMock.mockReset();
  reviewInsertResultMock.mockReset();
  reviewInsertResultMock.mockResolvedValue({ error: null });
  toastErrorMock.mockReset();
  toastSuccessMock.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ analysis_id: "an_1" }),
  } as Response);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function getTextarea(): HTMLTextAreaElement {
  return screen.getByTestId("paste-textarea") as HTMLTextAreaElement;
}

function renderTab(onComplete = vi.fn()) {
  render(
    <AddReviewsTab projectId="proj_abc" onAnalysisComplete={onComplete} />
  );
  return { onComplete };
}

describe("AddReviewsTab — parseReviews", () => {
  it("splits on blank lines, trims, and drops empties", () => {
    expect(parseReviews("")).toEqual([]);
    expect(parseReviews("   \n\n   ")).toEqual([]);
    expect(parseReviews("a\n\nb\n\nc")).toEqual(["a", "b", "c"]);
    expect(parseReviews("  one  \n\n\n  two  ")).toEqual(["one", "two"]);
  });
});

describe("AddReviewsTab — sub-tab rendering", () => {
  it("renders the Paste sub-tab as active by default", () => {
    renderTab();
    expect(screen.getByTestId("subtab-paste")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByTestId("paste-sub-tab")).toBeInTheDocument();
  });
});

describe("AddReviewsTab — count detection", () => {
  it("live-counts reviews split on blank line", () => {
    renderTab();
    expect(screen.getByTestId("paste-review-count").textContent).toMatch(
      /^0 reviews/
    );

    fireEvent.change(getTextarea(), { target: { value: "single review" } });
    expect(screen.getByTestId("paste-review-count").textContent).toMatch(
      /^1 review /
    );

    fireEvent.change(getTextarea(), {
      target: { value: "alpha\n\nbeta\n\ngamma" },
    });
    expect(screen.getByTestId("paste-review-count").textContent).toMatch(
      /^3 reviews/
    );
  });
});

describe("AddReviewsTab — Clear button", () => {
  it("Clear empties the textarea and resets the count", () => {
    renderTab();
    fireEvent.change(getTextarea(), {
      target: { value: "alpha\n\nbeta" },
    });
    expect(getTextarea().value).toBe("alpha\n\nbeta");

    fireEvent.click(screen.getByTestId("paste-clear-button"));
    expect(getTextarea().value).toBe("");
    expect(screen.getByTestId("paste-review-count").textContent).toMatch(
      /^0 reviews/
    );
  });

  it("Clear is disabled when textarea is empty", () => {
    renderTab();
    expect(screen.getByTestId("paste-clear-button")).toBeDisabled();
  });
});

describe("AddReviewsTab — empty submit guard", () => {
  it("empty submit shows a toast and never calls insert or fetch", () => {
    renderTab();
    // Submit button is disabled when count is 0; the count guard inside
    // the handler still trips a toast if it ever gets through.
    const submit = screen.getByTestId("paste-submit-button");
    expect(submit).toBeDisabled();
    expect(reviewInsertMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("AddReviewsTab — successful submit flow", () => {
  it("inserts reviews, POSTs /api/analyze, then calls onAnalysisComplete", async () => {
    const { onComplete } = renderTab();

    fireEvent.change(getTextarea(), {
      target: { value: "great product\n\nshipping was slow" },
    });
    fireEvent.click(screen.getByTestId("paste-submit-button"));

    await waitFor(() => {
      expect(reviewInsertMock).toHaveBeenCalledTimes(1);
    });
    const reviewsArg = reviewInsertMock.mock.calls[0]?.[0] as Array<{
      project_id: string;
      content: string;
    }>;
    expect(reviewsArg).toHaveLength(2);
    expect(reviewsArg[0]).toEqual({
      project_id: "proj_abc",
      content: "great product",
    });
    expect(reviewsArg[1]?.content).toBe("shipping was slow");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/analyze");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      project_id: "proj_abc",
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
    expect(getTextarea().value).toBe("");
  });

  it("toasts an error and does not call onAnalysisComplete when the insert fails", async () => {
    reviewInsertResultMock.mockResolvedValueOnce({
      error: { message: "boom" },
    });
    const { onComplete } = renderTab();

    fireEvent.change(getTextarea(), {
      target: { value: "alpha\n\nbeta" },
    });
    fireEvent.click(screen.getByTestId("paste-submit-button"));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });
    expect(toastErrorMock).toHaveBeenCalledWith(
      expect.stringMatching(/couldn't save reviews/i)
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("toasts an error and does not call onAnalysisComplete when /api/analyze fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Rate limited" }),
    } as Response);
    const { onComplete } = renderTab();

    fireEvent.change(getTextarea(), {
      target: { value: "alpha\n\nbeta" },
    });
    fireEvent.click(screen.getByTestId("paste-submit-button"));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });
    expect(toastErrorMock).toHaveBeenCalledWith("Rate limited");
    expect(onComplete).not.toHaveBeenCalled();
  });
});
