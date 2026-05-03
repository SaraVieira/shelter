import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../db";
import { projects, runs } from "../../db/schema";
import { eq } from "drizzle-orm";
import { parseJsonCoverage } from "../parsers/json.parser";
import { computeDiff } from "../diff/coverage.diff";
import { sql } from "drizzle-orm";

describe("coverage upload flow integration", () => {
  const testProjectId = crypto.randomUUID();
  const testOrgId = "org-test";

  beforeAll(async () => {
    await db.insert(projects).values({
      id: testProjectId,
      organizationId: testOrgId,
      name: "test project",
    });

    await db.insert(runs).values({
      id: crypto.randomUUID(),
      projectId: testProjectId,
      commitSha: "aaa",
      branch: "main",
      linesPct: 80,
      branchesPct: 60,
      functionsPct: 87.5,
      statementsPct: 80,
      totalLines: 100,
      coveredLines: 80,
      fileCoverage: [],
    });
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM runs WHERE project_id = ${testProjectId}`);
    await db.execute(sql`DELETE FROM projects WHERE id = ${testProjectId}`);
  });

  it("creates a run and compares against the base run", async () => {
    const coverage = JSON.stringify({
      total: {
        lines: { total: 100, covered: 85, skipped: 0, pct: 85 },
        branches: { total: 50, covered: 32, skipped: 0, pct: 64 },
        functions: { total: 40, covered: 37, skipped: 0, pct: 92.5 },
        statements: { total: 120, covered: 102, skipped: 0, pct: 85 },
      },
    });

    const result = parseJsonCoverage(coverage);
    const diff = computeDiff(
      {
        lines: { total: 100, covered: 80, skipped: 0, pct: 80 },
        branches: { total: 50, covered: 30, skipped: 0, pct: 60 },
        functions: { total: 40, covered: 35, skipped: 0, pct: 87.5 },
        statements: { total: 120, covered: 96, skipped: 0, pct: 80 },
      },
      result.summary
    );

    expect(diff.linesDelta).toBe(5);
    expect(diff.branchesDelta).toBe(4);
    expect(diff.functionsDelta).toBe(5);
    expect(diff.statementsDelta).toBe(5);

    const [newRun] = await db
      .insert(runs)
      .values({
        projectId: testProjectId,
        commitSha: "abc123",
        branch: "feature",
        linesPct: result.summary.lines.pct,
        branchesPct: result.summary.branches.pct,
        functionsPct: result.summary.functions.pct,
        statementsPct: result.summary.statements.pct,
        totalLines: result.summary.lines.total,
        coveredLines: result.summary.lines.covered,
        fileCoverage: [],
        diffVsBase: diff,
        diffVsPrevious: null,
      })
      .returning();

    const savedRun = await db.query.runs.findFirst({
      where: eq(runs.id, newRun.id),
    });

    expect(savedRun).not.toBeNull();
    expect(savedRun!.linesPct).toBe(85);
    expect(savedRun!.diffVsBase).toEqual(diff);
  });

  it("handles first run with no base run", async () => {
    const newProjectId = crypto.randomUUID();
    await db.insert(projects).values({
      id: newProjectId,
      organizationId: testOrgId,
      name: "first run project",
    });

    const firstRunId = crypto.randomUUID();
    await db.insert(runs).values({
      id: firstRunId,
      projectId: newProjectId,
      commitSha: "first",
      branch: "main",
      linesPct: 75,
      branchesPct: 50,
      functionsPct: 90,
      statementsPct: 75,
      totalLines: 80,
      coveredLines: 60,
      fileCoverage: [],
      diffVsBase: null,
      diffVsPrevious: null,
    });

    const savedRun = await db.query.runs.findFirst({
      where: eq(runs.id, firstRunId),
    });

    expect(savedRun).not.toBeNull();
    expect(savedRun!.diffVsBase).toBeNull();
    expect(savedRun!.diffVsPrevious).toBeNull();

    await db.execute(sql`DELETE FROM runs WHERE id = ${firstRunId}`);
    await db.execute(sql`DELETE FROM projects WHERE id = ${newProjectId}`);
  });
});
