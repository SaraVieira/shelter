import { describe, it, expect } from "vitest";
import { formatComment } from "./comment";

describe("formatComment", () => {
  it("formats a full comment with all data", () => {
    const result = formatComment({
      coverage: { lines: 87.2, branches: 60.1, functions: 92, statements: 88 },
      diffVsBase: { linesDelta: 2.1, branchesDelta: -1.0, functionsDelta: 0, statementsDelta: 1.5 },
      diffVsPrevious: { linesDelta: 1.0, branchesDelta: 0, functionsDelta: 3, statementsDelta: 0.5 },
      filesChanged: [
        { file: "src/foo.ts", before: 70, after: 90, diff: 20 },
        { file: "src/bar.ts", before: 45, after: 30, diff: -15 },
      ],
      appUrl: "https://app.example.com",
      projectId: "abc",
      runId: "xyz",
    });

    expect(result).toContain("## Coverage Report");
    expect(result).toContain("87.2%");
    expect(result).toContain("src/foo.ts");
    expect(result).toContain("src/bar.ts");
    expect(result).toContain("https://app.example.com/projects/abc/runs/xyz");
    expect(result).toContain("<!-- coverage-tracker-comment -->");
  });

  it("uses placeholder text when no diff data is available", () => {
    const result = formatComment({
      coverage: { lines: 87, branches: 60, functions: 92, statements: 88 },
      diffVsBase: null,
      diffVsPrevious: null,
      filesChanged: [],
      appUrl: "https://app.example.com",
      projectId: "abc",
      runId: "xyz",
    });

    expect(result).toContain("## Coverage Report");
    expect(result).not.toContain("vs Base");
    expect(result).not.toContain("vs Previous");
  });
});
