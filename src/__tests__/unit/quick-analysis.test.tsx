import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { sampleAnalysisResponse } from "@/test/fixtures/analysis";

const pushMock = vi.hoisted(() => vi.fn());
const projectInsertMock = vi.hoisted(() => vi.fn());
const reviewInsertMock = vi.hoisted(() => vi.fn());
const projectSingleMock = vi.hoisted(() =>
  vi.fn(async () => ({ data: { id: "proj_1" }, error: null })),
);
const reviewInsertResultMock = vi.hoisted(() =>
  vi.fn(async () => ({ error: null })),
);
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "projects") {
        return {
          insert: (v: unknown) => {
            projectInsertMock(v);
            return {
              select: () => ({
                single: () => projectSingleMock(),
              }),
            };
          },
        };
      }
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

import { PasteAnalyze, parseReviews } from "@/components/dashboard/paste-analyze";

const fetchMock = vi.fn();

beforeEach(() => {
  pushMock.mockReset();
  projectInsertMock.mockReset();
  reviewInsertMock.mockReset();
  projectSingleMock.mockReset();
  projectSingleMock.mockResolvedValue({
    data: { id: "proj_1" },
    error: null,
  });
  reviewInsertResultMock.mockReset();
  reviewInsertResultMock.mockResolvedValue({ error: null });
  toastErrorMock.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      analysis_id: "an_1",
      analysis: sampleAnalysisResponse,
    }),
  } as Response);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function getTextarea(): HTMLTextAreaElement {
  return screen.getByLabelText(/paste reviews/i) as HTMLTextAreaElement;
}

describe("PasteAnalyze — review counting", () => {
  it("parseReviews splits on blank lines and trims/filters empties", () => {
    expect(parseReviews("")).toEqual([]);
    expect(parseReviews("   \n\n   ")).toEqual([]);
    expect(parseReviews("one\n\ntwo\n\nthree")).toEqual([
      "one",
      "two",
      "three",
    ]);
    expect(parseReviews("  one  \n\n\n  two  \n\n  ")).toEqual(["one", "two"]);
  });

  it("textarea live-counts reviews split on double newline", () => {
    render(<PasteAnalyze userId="u_1" />);
    const ta = getTextarea();
    expect(screen.getByTestId("review-count").textContent).toMatch(
      /^0 reviews/,
    );

    fireEvent.change(ta, { target: { value: "first review only" } });
    expect(screen.getByTestId("review-count").textContent).toMatch(
      /^1 review /,
    );

    fireEvent.change(ta, {
      target: { value: "alpha\n\nbeta\n\ngamma" },
    });
    expect(screen.getByTestId("review-count").textContent).toMatch(
      /^3 reviews/,
    );
  });
});

describe("PasteAnalyze — empty / whitespace validation", () => {
  it("empty paste shows an error toast and does not call Supabase or fetch", () => {
    render(<PasteAnalyze userId="u_1" />);
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).toHaveBeenCalledWith(
      expect.stringMatching(/at least one review/i),
    );
    expect(projectInsertMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("whitespace-only paste shows an error toast and does not advance", () => {
    render(<PasteAnalyze userId="u_1" />);
    fireEvent.change(getTextarea(), {
      target: { value: "   \n\n  \t  \n\n   " },
    });
    expect(screen.getByTestId("review-count").textContent).toMatch(
      /^0 reviews/,
    );
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).toHaveBeenCalledWith(
      expect.stringMatching(/at least one review/i),
    );
    expect(projectInsertMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("PasteAnalyze — analyze flow", () => {
  it("Analyze creates a project, inserts reviews, and POSTs to /api/analyze", async () => {
    render(<PasteAnalyze userId="user_xyz" />);
    fireEvent.change(getTextarea(), {
      target: { value: "great product\n\nshipping was slow\n\nlove it" },
    });

    fireEvent.click(screen.getByRole("button", { name: /analyze 3 reviews/i }));

    await waitFor(() => {
      expect(projectInsertMock).toHaveBeenCalledTimes(1);
    });
    const projectArg = projectInsertMock.mock.calls[0]?.[0] as {
      user_id: string;
      industry: string;
      review_source: string;
      is_demo: boolean;
      name: string;
    };
    expect(projectArg.user_id).toBe("user_xyz");
    expect(projectArg.industry).toBe("Other");
    expect(projectArg.review_source).toBe("Pasted text");
    expect(projectArg.is_demo).toBe(false);
    expect(projectArg.name).toMatch(/^Quick Analysis/);

    await waitFor(() => {
      expect(reviewInsertMock).toHaveBeenCalledTimes(1);
    });
    const reviewsArg = reviewInsertMock.mock.calls[0]?.[0] as Array<{
      project_id: string;
      content: string;
    }>;
    expect(reviewsArg).toHaveLength(3);
    expect(reviewsArg[0]).toEqual({
      project_id: "proj_1",
      content: "great product",
    });
    expect(reviewsArg[2]?.content).toBe("love it");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/analyze");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      project_id: "proj_1",
    });
  });

  it("loading view shows all 7 step indicators", async () => {
    // Hold the project insert pending so we stay in the loading phase.
    let resolveProject!: (v: { data: { id: string }; error: null }) => void;
    projectSingleMock.mockReturnValue(
      new Promise((resolve) => {
        resolveProject = resolve;
      }),
    );

    render(<PasteAnalyze userId="u_1" />);
    fireEvent.change(getTextarea(), {
      target: { value: "alpha\n\nbeta" },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze 2 reviews/i }));

    await waitFor(() => {
      expect(screen.getByTestId("loading-view")).toBeInTheDocument();
    });

    const steps = screen.getAllByTestId(/^analyze-step-\d+$/);
    expect(steps).toHaveLength(7);
    expect(steps[0]?.textContent).toMatch(/parsing reviews/i);
    expect(steps[3]?.textContent).toMatch(/sending to claude/i);
    expect(steps[6]?.textContent).toMatch(/generating insights/i);

    // Progress bar present with correct ARIA bounds.
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");

    // Release the pending insert so React doesn't warn about unresolved state.
    resolveProject({ data: { id: "proj_1" }, error: null });
  });

  it("renders results (summary, sentiment donut, top complaints/praises) on success", async () => {
    render(<PasteAnalyze userId="u_1" />);
    fireEvent.change(getTextarea(), {
      target: { value: "review one\n\nreview two" },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze 2 reviews/i }));

    await waitFor(() => {
      expect(screen.getByTestId("compact-results")).toBeInTheDocument();
    });

    expect(screen.getByText(/analysis results/i)).toBeInTheDocument();
    expect(
      screen.getByText(sampleAnalysisResponse.summary),
    ).toBeInTheDocument();
    expect(screen.getByText(/top complaints/i)).toBeInTheDocument();
    expect(screen.getByText(/top praises/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(
        new RegExp(sampleAnalysisResponse.complaints[0]!.text, "i"),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        new RegExp(sampleAnalysisResponse.praises[0]!.text, "i"),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /open full report/i }),
    ).toBeInTheDocument();
  });

  it("'New Analysis' clears state and returns to the paste form", async () => {
    render(<PasteAnalyze userId="u_1" />);
    fireEvent.change(getTextarea(), {
      target: { value: "first\n\nsecond" },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze 2 reviews/i }));

    await waitFor(() => {
      expect(screen.getByTestId("compact-results")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /new analysis/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("compact-results")).toBeNull();
    });
    expect(screen.getByTestId("paste-form")).toBeInTheDocument();
    const textareaAfter = getTextarea();
    expect(textareaAfter.value).toBe("");
    expect(screen.getByTestId("review-count").textContent).toMatch(
      /^0 reviews/,
    );
  });
});
