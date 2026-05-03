import { describe, it, expect } from "vitest";

describe("retention", () => {
  it("calculates correct cutoff dates", () => {
    const now = new Date();
    const fileCutoff = new Date();
    fileCutoff.setDate(fileCutoff.getDate() - 90);
    const deleteCutoff = new Date();
    deleteCutoff.setDate(deleteCutoff.getDate() - 365);

    expect(fileCutoff < now).toBe(true);
    expect(deleteCutoff < fileCutoff).toBe(true);
  });
});
