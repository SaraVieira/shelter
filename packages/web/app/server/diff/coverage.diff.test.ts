import { describe, it, expect } from "vitest";
import { computeDiff, computeFileDiff } from "./coverage.diff";
import { Metric, FileCoverageSummary } from "../parsers/coverage.types";

function makeMetric(pct: number, total: number, covered: number): Metric {
  return { total, covered, skipped: 0, pct };
}

function makeSummary(
  lines: number,
  branches: number,
  functions: number,
  statements: number
): { lines: Metric; branches: Metric; functions: Metric; statements: Metric } {
  return {
    lines: makeMetric(lines, 100, Math.round(lines)),
    branches: makeMetric(branches, 50, Math.round(branches * 0.5)),
    functions: makeMetric(functions, 40, Math.round(functions * 0.4)),
    statements: makeMetric(statements, 120, Math.round(statements * 0.7)),
  };
}

describe("computeDiff", () => {
  it("computes metric deltas between two coverage summaries", () => {
    const base = makeSummary(80, 60, 90, 80);
    const current = makeSummary(85, 64, 92.5, 85);

    const diff = computeDiff(base, current);

    expect(diff.linesDelta).toBe(5);
    expect(diff.branchesDelta).toBe(4);
    expect(diff.functionsDelta).toBe(2.5);
    expect(diff.statementsDelta).toBe(5);
  });

  it("handles negative deltas", () => {
    const base = makeSummary(90, 70, 95, 90);
    const current = makeSummary(80, 60, 90, 85);

    const diff = computeDiff(base, current);

    expect(diff.linesDelta).toBe(-10);
    expect(diff.branchesDelta).toBe(-10);
    expect(diff.functionsDelta).toBe(-5);
    expect(diff.statementsDelta).toBe(-5);
  });

  it("handles zero deltas", () => {
    const same = makeSummary(80, 60, 90, 80);
    const diff = computeDiff(same, same);

    expect(diff.linesDelta).toBe(0);
    expect(diff.branchesDelta).toBe(0);
    expect(diff.functionsDelta).toBe(0);
    expect(diff.statementsDelta).toBe(0);
  });
});

describe("computeFileDiff", () => {
  it("returns diff for changed files only", () => {
    const base: FileCoverageSummary = {
      "src/index.ts": {
        lines: makeMetric(80, 50, 40),
        branches: makeMetric(60, 20, 12),
        functions: makeMetric(90, 10, 9),
        statements: makeMetric(80, 60, 48),
      },
      "src/utils.ts": {
        lines: makeMetric(80, 50, 40),
        branches: makeMetric(60, 30, 18),
        functions: makeMetric(86.67, 30, 26),
        statements: makeMetric(80, 60, 48),
      },
    };

    const current: FileCoverageSummary = {
      "src/index.ts": {
        lines: makeMetric(90, 50, 45),
        branches: makeMetric(70, 20, 14),
        functions: makeMetric(100, 10, 10),
        statements: makeMetric(90, 60, 54),
      },
      "src/utils.ts": {
        lines: makeMetric(76, 50, 38),
        branches: makeMetric(60, 30, 18),
        functions: makeMetric(90, 30, 27),
        statements: makeMetric(80, 60, 48),
      },
    };

    const changed = computeFileDiff(base, current);

    expect(changed).toContainEqual(
      expect.objectContaining({
        file: "src/index.ts",
        before: 80,
        after: 90,
        diff: 10,
      })
    );
    expect(changed).toContainEqual(
      expect.objectContaining({
        file: "src/utils.ts",
        before: 80,
        after: 76,
        diff: -4,
      })
    );
  });

  it("returns empty array when no files changed", () => {
    const same: FileCoverageSummary = {
      "src/index.ts": {
        lines: makeMetric(80, 50, 40),
        branches: makeMetric(60, 20, 12),
        functions: makeMetric(90, 10, 9),
        statements: makeMetric(80, 60, 48),
      },
    };

    const changed = computeFileDiff(same, same);
    expect(changed).toHaveLength(0);
  });

  it("includes new files not in base", () => {
    const base: FileCoverageSummary = {};
    const current: FileCoverageSummary = {
      "src/new.ts": {
        lines: makeMetric(100, 10, 10),
        branches: makeMetric(0, 0, 0),
        functions: makeMetric(0, 0, 0),
        statements: makeMetric(100, 10, 10),
      },
    };

    const changed = computeFileDiff(base, current);
    expect(changed).toContainEqual(
      expect.objectContaining({
        file: "src/new.ts",
        before: 0,
        after: 100,
        diff: 100,
      })
    );
  });

  it("includes removed files from base", () => {
    const base: FileCoverageSummary = {
      "src/old.ts": {
        lines: makeMetric(80, 50, 40),
        branches: makeMetric(60, 30, 18),
        functions: makeMetric(86.67, 30, 26),
        statements: makeMetric(80, 60, 48),
      },
    };
    const current: FileCoverageSummary = {};

    const changed = computeFileDiff(base, current);
    expect(changed).toContainEqual(
      expect.objectContaining({
        file: "src/old.ts",
        before: 80,
        after: 0,
        diff: -80,
      })
    );
  });

  it("sorts results by absolute diff magnitude descending", () => {
    const base: FileCoverageSummary = {
      a: {
        lines: makeMetric(10, 10, 1),
        branches: makeMetric(10, 10, 1),
        functions: makeMetric(10, 10, 1),
        statements: makeMetric(10, 10, 1),
      },
      b: {
        lines: makeMetric(50, 10, 5),
        branches: makeMetric(50, 10, 5),
        functions: makeMetric(50, 10, 5),
        statements: makeMetric(50, 10, 5),
      },
    };
    const current: FileCoverageSummary = {
      a: {
        lines: makeMetric(30, 10, 3),
        branches: makeMetric(30, 10, 1),
        functions: makeMetric(30, 10, 1),
        statements: makeMetric(30, 10, 1),
      },
      b: {
        lines: makeMetric(55, 10, 5.5),
        branches: makeMetric(55, 10, 5.5),
        functions: makeMetric(55, 10, 5.5),
        statements: makeMetric(55, 10, 5.5),
      },
    };

    const changed = computeFileDiff(base, current);
    expect(changed[0].file).toBe("a");
    expect(changed[1].file).toBe("b");
  });
});
