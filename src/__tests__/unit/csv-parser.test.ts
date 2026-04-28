import { describe, it, expect } from "vitest";
import { detectColumns, parseCsvFile, MAX_CSV_BYTES } from "@/lib/csv/parse";

function makeCsv(content: string, name = "reviews.csv"): File {
  return new File([content], name, { type: "text/csv" });
}

describe("CSV parser — detectColumns", () => {
  it("detects 'review' column → maps to content", () => {
    const m = detectColumns(["review", "stars"]);
    expect(m.content).toBe("review");
  });

  it("detects 'text' column → maps to content", () => {
    const m = detectColumns(["id", "text", "rating"]);
    expect(m.content).toBe("text");
  });

  it("detects 'rating' column → maps to rating", () => {
    const m = detectColumns(["review", "rating"]);
    expect(m.rating).toBe("rating");
  });

  it("detects 'author' column → maps to author", () => {
    const m = detectColumns(["review", "author"]);
    expect(m.author).toBe("author");
  });
});

describe("CSV parser — parseCsvFile", () => {
  it("returns error when no content column found", async () => {
    const file = makeCsv("title,url\nAbout us,/about\n");
    const res = await parseCsvFile(file);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/review|text|content|column/i);
    }
  });

  it("file > 5MB → error", async () => {
    const big = "a".repeat(MAX_CSV_BYTES + 1);
    const file = makeCsv(big, "huge.csv");
    const res = await parseCsvFile(file);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/5\s*mb|larger/i);
    }
  });

  it("file with 0 data rows → error", async () => {
    const file = makeCsv("review,rating\n");
    const res = await parseCsvFile(file);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/no data|empty/i);
    }
  });

  it("preview shows first 3 rows correctly", async () => {
    const csv =
      "review,rating\n" +
      "First review,5\n" +
      "Second review,4\n" +
      "Third review,3\n" +
      "Fourth review,2\n";
    const res = await parseCsvFile(makeCsv(csv));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.rows).toHaveLength(4);
      const firstThree = res.rows.slice(0, 3);
      expect(firstThree[0]?.review).toBe("First review");
      expect(firstThree[1]?.review).toBe("Second review");
      expect(firstThree[2]?.review).toBe("Third review");
      expect(res.mapping.content).toBe("review");
      expect(res.mapping.rating).toBe("rating");
    }
  });

  it("handles quoted CSV values", async () => {
    const csv =
      'review,source\n' +
      '"Great product, fast shipping","Google"\n' +
      '"He said ""amazing"" twice","Yelp"\n';
    const res = await parseCsvFile(makeCsv(csv));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.rows[0]?.review).toBe("Great product, fast shipping");
      expect(res.rows[1]?.review).toBe('He said "amazing" twice');
      expect(res.rows[0]?.source).toBe("Google");
    }
  });

  it("handles Unicode characters in content", async () => {
    const csv =
      "review,author\n" +
      "Café was amazing — 5★,Renée\n" +
      "とても良かった！,山田\n" +
      "🎉 Perfect experience 👌,Émile\n";
    const res = await parseCsvFile(makeCsv(csv));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.rows[0]?.review).toBe("Café was amazing — 5★");
      expect(res.rows[1]?.review).toBe("とても良かった！");
      expect(res.rows[2]?.review).toBe("🎉 Perfect experience 👌");
      expect(res.rows[0]?.author).toBe("Renée");
      expect(res.rows[1]?.author).toBe("山田");
      expect(res.mapping.author).toBe("author");
    }
  });
});
