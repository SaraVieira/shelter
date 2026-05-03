import { describe, it, expect } from "vitest";
import { parseJsonCoverage } from "../parsers/json.parser";
import { parseLcov } from "../parsers/lcov.parser";
import { computeDiff } from "../diff/coverage.diff";

describe("upload flow", () => {
  it("parses json, computes diff with base, and produces db-ready record", () => {
    const baseJson = JSON.stringify({
      total: {
        lines: { total: 100, covered: 80, skipped: 0, pct: 80 },
        branches: { total: 50, covered: 30, skipped: 0, pct: 60 },
        functions: { total: 40, covered: 35, skipped: 0, pct: 87.5 },
        statements: { total: 120, covered: 96, skipped: 0, pct: 80 },
      },
    });

    const currentJson = JSON.stringify({
      total: {
        lines: { total: 100, covered: 85, skipped: 0, pct: 85 },
        branches: { total: 50, covered: 32, skipped: 0, pct: 64 },
        functions: { total: 40, covered: 37, skipped: 0, pct: 92.5 },
        statements: { total: 120, covered: 102, skipped: 0, pct: 85 },
      },
    });

    const baseResult = parseJsonCoverage(baseJson);
    const currentResult = parseJsonCoverage(currentJson);
    const diff = computeDiff(baseResult.summary, currentResult.summary);

    expect(diff.linesDelta).toBe(5);
    expect(diff.branchesDelta).toBe(4);
    expect(diff.functionsDelta).toBe(5);
    expect(diff.statementsDelta).toBe(5);

    const runRecord = {
      commitSha: "abc123",
      branch: "main",
      pr_number: null,
      lines_pct: currentResult.summary.lines.pct,
      branches_pct: currentResult.summary.branches.pct,
      functions_pct: currentResult.summary.functions.pct,
      statements_pct: currentResult.summary.statements.pct,
      total_lines: currentResult.summary.lines.total,
      covered_lines: currentResult.summary.lines.covered,
    };

    expect(runRecord.lines_pct).toBe(85);
    expect(runRecord.total_lines).toBe(100);
    expect(runRecord.covered_lines).toBe(85);
  });

  it("handles upload without base for diff (first run)", () => {
    const json = JSON.stringify({
      total: {
        lines: { total: 100, covered: 80, skipped: 0, pct: 80 },
        branches: { total: 50, covered: 30, skipped: 0, pct: 60 },
        functions: { total: 40, covered: 35, skipped: 0, pct: 87.5 },
        statements: { total: 120, covered: 96, skipped: 0, pct: 80 },
      },
    });

    const result = parseJsonCoverage(json);
    expect(result.summary.lines.pct).toBe(80);
  });
});
