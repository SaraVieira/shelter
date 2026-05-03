import { describe, it, expect } from "vitest";
import { parseJsonCoverage } from "./json.parser";

const SAMPLE_JSON = JSON.stringify({
  "total": {
    "lines": { "total": 100, "covered": 87, "skipped": 0, "pct": 87 },
    "branches": { "total": 50, "covered": 30, "skipped": 0, "pct": 60 },
    "functions": { "total": 40, "covered": 37, "skipped": 0, "pct": 92.5 },
    "statements": { "total": 120, "covered": 106, "skipped": 0, "pct": 88.33 }
  },
  "src/index.ts": {
    "lines": { "total": 50, "covered": 45, "skipped": 0, "pct": 90 },
    "branches": { "total": 20, "covered": 12, "skipped": 0, "pct": 60 },
    "functions": { "total": 10, "covered": 10, "skipped": 0, "pct": 100 },
    "statements": { "total": 60, "covered": 54, "skipped": 0, "pct": 90 }
  },
  "src/utils.ts": {
    "lines": { "total": 50, "covered": 42, "skipped": 0, "pct": 84 },
    "branches": { "total": 30, "covered": 18, "skipped": 0, "pct": 60 },
    "functions": { "total": 30, "covered": 27, "skipped": 0, "pct": 90 },
    "statements": { "total": 60, "covered": 52, "skipped": 0, "pct": 86.67 }
  }
});

describe("parseJsonCoverage", () => {
  it("parses total coverage summary from nyc-style JSON", () => {
    const result = parseJsonCoverage(SAMPLE_JSON);

    expect(result.summary.lines.pct).toBe(87);
    expect(result.summary.branches.pct).toBe(60);
    expect(result.summary.functions.pct).toBe(92.5);
    expect(result.summary.statements.pct).toBeCloseTo(88.33);
    expect(result.summary.lines.total).toBe(100);
    expect(result.summary.lines.covered).toBe(87);
  });

  it("parses per-file coverage", () => {
    const result = parseJsonCoverage(SAMPLE_JSON);

    expect(result.perFile["src/index.ts"].lines.pct).toBe(90);
    expect(result.perFile["src/utils.ts"].lines.pct).toBe(84);
    expect(result.perFile["src/index.ts"].functions.pct).toBe(100);
  });

  it("parses coverage without per-file data", () => {
    const noFiles = JSON.stringify({
      "total": {
        "lines": { "total": 100, "covered": 87, "skipped": 0, "pct": 87 },
        "branches": { "total": 50, "covered": 30, "skipped": 0, "pct": 60 },
        "functions": { "total": 40, "covered": 37, "skipped": 0, "pct": 92.5 },
        "statements": { "total": 120, "covered": 106, "skipped": 0, "pct": 88.33 }
      }
    });

    const result = parseJsonCoverage(noFiles);
    expect(result.summary.lines.pct).toBe(87);
    expect(Object.keys(result.perFile)).toHaveLength(0);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseJsonCoverage("not json")).toThrow();
  });

  it("throws when total is missing", () => {
    expect(() => parseJsonCoverage(JSON.stringify({ foo: "bar" }))).toThrow();
  });

  it("handles 0% coverage", () => {
    const zero = JSON.stringify({
      "total": {
        "lines": { "total": 100, "covered": 0, "skipped": 0, "pct": 0 },
        "branches": { "total": 50, "covered": 0, "skipped": 0, "pct": 0 },
        "functions": { "total": 40, "covered": 0, "skipped": 0, "pct": 0 },
        "statements": { "total": 120, "covered": 0, "skipped": 0, "pct": 0 }
      }
    });

    const result = parseJsonCoverage(zero);
    expect(result.summary.lines.pct).toBe(0);
  });
});
