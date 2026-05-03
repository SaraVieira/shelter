import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../server/auth";
import { db } from "../../db";
import { runs, projects, type FileInfo, type DiffData } from "../../db/schema";
import { parseJsonCoverage } from "../../server/parsers/json.parser";
import { parseLcov } from "../../server/parsers/lcov.parser";
import { computeDiff, computeFileDiff, FileChange } from "../../server/diff/coverage.diff";
import type { FileCoverageSummary } from "../../server/parsers/coverage.types";
import { eq, desc, and, or, ne } from "drizzle-orm";

interface UploadResponse {
  runId: string;
  coverage: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
  diffVsBase: {
    linesDelta: number;
    branchesDelta: number;
    functionsDelta: number;
    statementsDelta: number;
  } | null;
  diffVsPrevious: {
    linesDelta: number;
    branchesDelta: number;
    functionsDelta: number;
    statementsDelta: number;
  } | null;
  filesChanged: FileChange[];
}

async function getBaseRun(projectId: string): Promise<typeof runs.$inferSelect | undefined> {
  const baseBranches = ["main", "master"];
  const baseRuns = await db
    .select()
    .from(runs)
    .where(
      and(
        eq(runs.projectId, projectId),
        or(...baseBranches.map((b) => eq(runs.branch, b)))
      )
    )
    .orderBy(desc(runs.uploadedAt))
    .limit(1);

  return baseRuns[0];
}

async function getPreviousRun(
  projectId: string,
  branch: string,
  excludeSha?: string
): Promise<typeof runs.$inferSelect | undefined> {
  const conditions = [eq(runs.projectId, projectId), eq(runs.branch, branch)];
  if (excludeSha) conditions.push(ne(runs.commitSha, excludeSha));

  const prevRuns = await db
    .select()
    .from(runs)
    .where(and(...conditions))
    .orderBy(desc(runs.uploadedAt))
    .limit(1);

  return prevRuns[0];
}

function runToFileCoverage(
  run: typeof runs.$inferSelect
): FileCoverageSummary {
  const raw = run.fileCoverage;
  const fileCov: FileInfo[] = Array.isArray(raw) ? raw : [];
  const result: Record<string, any> = {};
  for (const f of fileCov) {
    result[f.file] = {
      lines: { total: 0, covered: 0, skipped: 0, pct: f.lines },
      branches: { total: 0, covered: 0, skipped: 0, pct: f.branches },
      functions: { total: 0, covered: 0, skipped: 0, pct: f.functions },
      statements: { total: 0, covered: 0, skipped: 0, pct: f.statements },
    };
  }
  return result;
}

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");
          console.log("[UPLOAD] Received API key:", apiKey?.substring(0, 10) + "...");
          
          if (!apiKey) {
            return Response.json({ error: "Missing API key" }, { status: 401 });
          }

          const keyResult = await auth.api.verifyApiKey({
            body: { key: apiKey },
          });

          console.log("[UPLOAD] Key verification result:", {
            valid: keyResult.valid,
            hasKey: !!keyResult.key,
            referenceId: keyResult.key?.referenceId,
          });

          if (!keyResult.valid || !keyResult.key) {
            return Response.json({ error: "Invalid or expired API key" }, { status: 401 });
          }

          const formData = await request.formData();
          const projectId = formData.get("project_id") as string;

          console.log("[UPLOAD] Project ID:", projectId);

          // Validate project exists and API key belongs to project's organization
          const project = await db.query.projects.findFirst({
            where: eq(projects.id, projectId),
          });

          console.log("[UPLOAD] Project lookup result:", {
            found: !!project,
            projectOrgId: project?.organizationId,
            keyReferenceId: keyResult.key.referenceId,
            match: project?.organizationId === keyResult.key.referenceId,
          });

          if (!project) {
            return Response.json({ error: "Project not found" }, { status: 404 });
          }

          // Verify API key belongs to the organization that owns this project
          if (keyResult.key.referenceId !== project.organizationId) {
            console.error("[UPLOAD] Authorization failed:", {
              keyReferenceId: keyResult.key.referenceId,
              projectOrgId: project.organizationId,
            });
            return Response.json(
              { error: "API key is not authorized for this project" },
              { status: 403 }
            );
          }
          
          console.log("[UPLOAD] Authorization successful");
          const commitSha = formData.get("commit_sha") as string;
          const branch = formData.get("branch") as string;
          const prNumber = formData.get("pr_number") as string | null;
          const coverageSummary = formData.get("coverage_summary") as File;
          const lcovFile = formData.get("lcov") as File | null;

          if (!projectId || !commitSha || !branch) {
            return Response.json(
              { error: "Missing required fields: project_id, commit_sha, branch" },
              { status: 400 }
            );
          }
          if (!coverageSummary) {
            return Response.json(
              { error: "Missing required file: coverage_summary" },
              { status: 400 }
            );
          }

          let coverageResult;
          try {
            coverageResult = parseJsonCoverage(await coverageSummary.text());
          } catch {
            return Response.json({ error: "Invalid coverage summary JSON" }, { status: 400 });
          }

          if (lcovFile) {
            try {
              const lcovResult = parseLcov(await lcovFile.text());
              coverageResult.perFile = lcovResult.perFile;
            } catch {
              return Response.json({ error: "Invalid LCOV file" }, { status: 400 });
            }
          }

          const baseRun = await getBaseRun(projectId);
          const prevRun = await getPreviousRun(projectId, branch, commitSha);

          let diffVsBase: DiffData | null = null;
          let diffVsPrevious: DiffData | null = null;
          let filesChanged: FileChange[] = [];

          if (baseRun) {
            diffVsBase = computeDiff(
              {
                lines: { total: baseRun.totalLines, covered: baseRun.coveredLines, skipped: 0, pct: baseRun.linesPct },
                branches: { total: 0, covered: 0, skipped: 0, pct: baseRun.branchesPct },
                functions: { total: 0, covered: 0, skipped: 0, pct: baseRun.functionsPct },
                statements: { total: 0, covered: 0, skipped: 0, pct: baseRun.statementsPct },
              },
              coverageResult.summary
            );
            filesChanged = computeFileDiff(runToFileCoverage(baseRun), coverageResult.perFile);
          }

          if (prevRun) {
            diffVsPrevious = computeDiff(
              {
                lines: { total: prevRun.totalLines, covered: prevRun.coveredLines, skipped: 0, pct: prevRun.linesPct },
                branches: { total: 0, covered: 0, skipped: 0, pct: prevRun.branchesPct },
                functions: { total: 0, covered: 0, skipped: 0, pct: prevRun.functionsPct },
                statements: { total: 0, covered: 0, skipped: 0, pct: prevRun.statementsPct },
              },
              coverageResult.summary
            );
          }

          const fileCoverage: FileInfo[] = Object.entries(coverageResult.perFile).map(
            ([file, metrics]) => ({
              file,
              lines: metrics.lines.pct,
              branches: metrics.branches.pct,
              functions: metrics.functions.pct,
              statements: metrics.statements.pct,
            })
          );

          const [newRun] = await db
            .insert(runs)
            .values({
              projectId,
              commitSha,
              branch,
              prNumber: prNumber ? parseInt(prNumber) : null,
              linesPct: coverageResult.summary.lines.pct,
              branchesPct: coverageResult.summary.branches.pct,
              functionsPct: coverageResult.summary.functions.pct,
              statementsPct: coverageResult.summary.statements.pct,
              totalLines: coverageResult.summary.lines.total,
              coveredLines: coverageResult.summary.lines.covered,
              fileCoverage,
              diffVsBase,
              diffVsPrevious,
            })
            .returning();

          const response: UploadResponse = {
            runId: newRun.id,
            coverage: {
              lines: coverageResult.summary.lines.pct,
              branches: coverageResult.summary.branches.pct,
              functions: coverageResult.summary.functions.pct,
              statements: coverageResult.summary.statements.pct,
            },
            diffVsBase,
            diffVsPrevious,
            filesChanged,
          };

          return Response.json(response);
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      },
    },
  },
});
