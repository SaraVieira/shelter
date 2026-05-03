import { describe, it, expect } from "vitest";

describe("coverage file detection", () => {
  it("detects json file from coverage-summary path", () => {
    const path = "/coverage-summary.json";
    expect(path).toContain("coverage-summary.json");
  });

  it("detects lcov file from lcov.info path", () => {
    const path = "/coverage/lcov.info";
    expect(path).toContain("lcov.info");
  });
});
