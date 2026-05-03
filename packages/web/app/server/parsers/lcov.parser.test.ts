import { describe, it, expect } from "vitest";
import { parseLcov } from "./lcov.parser";

const SAMPLE_LCOV = `TN:src/index.ts
SF:src/index.ts
FN:10,hello
FN:20,world
FNF:2
FNH:2
FNDA:15,hello
FNDA:0,world
DA:10,5
DA:11,5
DA:12,3
DA:13,0
DA:14,0
DA:20,2
DA:21,2
DA:22,1
LF:5
LH:3
BRDA:15,0,0,2
BRDA:15,0,1,0
BRDA:25,1,0,1
BRDA:25,1,1,1
BRF:4
BRH:3
end_of_record
TN:src/utils.ts
SF:src/utils.ts
DA:5,4
DA:6,3
DA:7,2
LF:3
LH:3
BRF:0
BRH:0
end_of_record
`;

describe("parseLcov", () => {
  it("parses per-file line coverage from LCOV", () => {
    const result = parseLcov(SAMPLE_LCOV);

    expect(result.perFile["src/index.ts"]).toBeDefined();
    expect(result.perFile["src/utils.ts"]).toBeDefined();

    expect(result.perFile["src/index.ts"].lines.pct).toBeCloseTo(60);
    expect(result.perFile["src/index.ts"].lines.total).toBe(5);
    expect(result.perFile["src/index.ts"].lines.covered).toBe(3);
  });

  it("parses branch coverage", () => {
    const result = parseLcov(SAMPLE_LCOV);

    expect(result.perFile["src/index.ts"].branches.pct).toBeCloseTo(75);
    expect(result.perFile["src/index.ts"].branches.total).toBe(4);
    expect(result.perFile["src/index.ts"].branches.covered).toBe(3);
  });

  it("parses function coverage", () => {
    const result = parseLcov(SAMPLE_LCOV);

    expect(result.perFile["src/index.ts"].functions.pct).toBe(100);
    expect(result.perFile["src/index.ts"].functions.total).toBe(2);
    expect(result.perFile["src/index.ts"].functions.covered).toBe(2);
  });

  it("aggregates total coverage across files", () => {
    const result = parseLcov(SAMPLE_LCOV);

    expect(result.summary.lines.total).toBe(8);
    expect(result.summary.lines.covered).toBe(6);
    expect(result.summary.lines.pct).toBeCloseTo(75);
  });

  it("throws on empty input", () => {
    expect(() => parseLcov("")).toThrow();
  });

  it("handles file with zero coverage", () => {
    const zeroLcov = `SF:empty.ts
LF:10
LH:0
BRF:0
BRH:0
end_of_record
`;
    const result = parseLcov(zeroLcov);
    expect(result.perFile["empty.ts"].lines.pct).toBe(0);
    expect(result.perFile["empty.ts"].lines.total).toBe(10);
    expect(result.perFile["empty.ts"].lines.covered).toBe(0);
  });
});
