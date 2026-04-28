import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";

const reviewInsertMock = vi.hoisted(() => vi.fn());
const reviewInsertResultMock = vi.hoisted(() =>
  vi.fn(async (): Promise<{ error: { message: string } | null }> => ({
    error: null,
  }))
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

import {
  AddReviewsTab,
  parseReviews,
  detectColumns,
  coerceRating,
  extractRows,
  type CsvMapping,
  type CsvRow,
} from "@/components/projects/add-reviews-tab";

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

  it("switches to the CSV sub-tab when clicked", () => {
    renderTab();
    fireEvent.click(screen.getByTestId("subtab-csv"));
    expect(screen.getByTestId("subtab-csv")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByTestId("csv-sub-tab")).toBeInTheDocument();
    expect(screen.getByTestId("csv-drop-zone")).toBeInTheDocument();
  });
});

describe("CSV — detectColumns", () => {
  it("matches headers case-insensitively via substring hints", () => {
    const m = detectColumns(["Customer Review", "Rating", "Source", "Posted"]);
    expect(m.content).toBe("Customer Review");
    expect(m.rating).toBe("Rating");
    expect(m.source).toBe("Source");
  });

  it("falls back to other content synonyms (comment, feedback, body, message)", () => {
    expect(detectColumns(["comment"]).content).toBe("comment");
    expect(detectColumns(["Customer Feedback"]).content).toBe("Customer Feedback");
    expect(detectColumns(["BODY"]).content).toBe("BODY");
    expect(detectColumns(["message_text"]).content).toBe("message_text");
  });

  it("returns null for fields with no matching header", () => {
    const m = detectColumns(["title", "url"]);
    expect(m.content).toBeNull();
    expect(m.rating).toBeNull();
    expect(m.source).toBeNull();
  });

  it("recognises 'stars' and 'score' as rating synonyms", () => {
    expect(detectColumns(["stars"]).rating).toBe("stars");
    expect(detectColumns(["NPS Score"]).rating).toBe("NPS Score");
  });

  it("recognises 'platform' and 'channel' as source synonyms", () => {
    expect(detectColumns(["Platform"]).source).toBe("Platform");
    expect(detectColumns(["channel"]).source).toBe("channel");
  });
});

describe("CSV — coerceRating", () => {
  it("returns the integer for valid 1–5 inputs", () => {
    expect(coerceRating("1")).toBe(1);
    expect(coerceRating("5")).toBe(5);
    expect(coerceRating(3)).toBe(3);
  });

  it("rounds decimals and accepts trailing units like '4.0 stars'", () => {
    expect(coerceRating("4.0")).toBe(4);
    expect(coerceRating("4.7 stars")).toBe(5);
    expect(coerceRating("3.4")).toBe(3);
  });

  it("returns null for out-of-range or non-numeric inputs", () => {
    expect(coerceRating("0")).toBeNull();
    expect(coerceRating("6")).toBeNull();
    expect(coerceRating("")).toBeNull();
    expect(coerceRating(null)).toBeNull();
    expect(coerceRating(undefined)).toBeNull();
    expect(coerceRating("nope")).toBeNull();
  });
});

describe("CSV — extractRows", () => {
  const rows: CsvRow[] = [
    { Review: "Great product", Stars: "5", Source: "Google" },
    { Review: "  ", Stars: "3", Source: "Yelp" },
    { Review: "Shipping took forever", Stars: "2", Source: "" },
    { Review: "Bad rating value", Stars: "abc", Source: "Trustpilot" },
  ];

  it("returns one row per non-empty content with rating/source coerced", () => {
    const mapping: CsvMapping = {
      content: "Review",
      rating: "Stars",
      source: "Source",
      author: null,
    };
    const out = extractRows(rows, mapping);
    expect(out).toEqual([
      { content: "Great product", rating: 5, source: "Google", author: null },
      { content: "Shipping took forever", rating: 2, source: null, author: null },
      { content: "Bad rating value", rating: null, source: "Trustpilot", author: null },
    ]);
  });

  it("returns [] when content is unmapped", () => {
    const mapping: CsvMapping = {
      content: null,
      rating: "Stars",
      source: "Source",
      author: null,
    };
    expect(extractRows(rows, mapping)).toEqual([]);
  });

  it("ignores rating and source when those columns are unmapped", () => {
    const out = extractRows(rows, {
      content: "Review",
      rating: null,
      source: null,
      author: null,
    });
    expect(out).toHaveLength(3);
    expect(out.every((r) => r.rating === null && r.source === null)).toBe(true);
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
