import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../server/auth";
import { db } from "../../db";
import { runs, projects, type FileInfo, type DiffData } from "../../db/schema";
import { parseJsonCoverage } from "../../server/parsers/json.parser";
import { parseLcov } from "../../server/parsers/lcov.parser";
import {
  computeDiff,
  computeFileDiff,
  FileChange,
} from "../../server/diff/coverage.diff";
import type { FileCoverageSummary } from "../../server/parsers/coverage.types";
import { eq, desc, and, or, ne } from "drizzle-orm";
import { uploadCoverageSchema, formatZodErrors } from "../../server/validation/schemas";
import { uploadRateLimit } from "../../server/rate-limit";
import { sendError, sendSuccess, ErrorCodes } from "../../server/api-response";

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

async function getBaseRun(
  projectId: string,
): Promise<typeof runs.$inferSelect | undefined> {
  const baseBranches = ["main", "master"];
  const baseRuns = await db
    .select()
    .from(runs)
    .where(
      and(
        eq(runs.projectId, projectId),
        or(...baseBranches.map((b) => eq(runs.branch, b))),
      ),
    )
    .orderBy(desc(runs.uploadedAt))
    .limit(1);

  return baseRuns[0];
}

async function getPreviousRun(
  projectId: string,
  branch: string,
  excludeSha?: string,
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

function runToFileCoverage(run: typeof runs.$inferSelect): FileCoverageSummary {
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
        // Check rate limit first
        const rateLimitResponse = await uploadRateLimit(request);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
        
        try {
          const apiKey = request.headers
            .get("authorization")
            ?.replace("Bearer ", "");

          if (!apiKey) {
            return sendError(ErrorCodes.UNAUTHORIZED, "Missing API key");
          }

          const keyResult = await auth.api.verifyApiKey({
            body: { key: apiKey },
          });

          if (!keyResult.valid || !keyResult.key) {
            return sendError(ErrorCodes.INVALID_API_KEY, "Invalid or expired API key");
          }

          const formData = await request.formData();
          
          // Validate required fields with Zod
          const validationData = {
            project_id: formData.get("project_id") as string,
            commit_sha: formData.get("commit_sha") as string,
            branch: formData.get("branch") as string,
            pr_number: formData.get("pr_number") as string | null,
          };
          
          const validationResult = uploadCoverageSchema.safeParse(validationData);
          if (!validationResult.success) {
            return sendError(
              ErrorCodes.VALIDATION_ERROR,
              "Validation failed",
              formatZodErrors(validationResult.error)
            );
          }
          
          const { project_id: projectId, commit_sha: commitSha, branch, pr_number: prNumber } = validationResult.data;

          // Validate project exists and API key belongs to project's organization
          const project = await db.query.projects.findFirst({
            where: eq(projects.id, projectId),
          });

          if (!project) {
            return sendError(ErrorCodes.PROJECT_NOT_FOUND, "Project not found");
          }

          // Verify API key belongs to the organization that owns this project
          if (keyResult.key.referenceId !== project.organizationId) {
            console.error("[UPLOAD] Authorization failed:", {
              keyReferenceId: keyResult.key.referenceId,
              projectOrgId: project.organizationId,
            });
            return sendError(
              ErrorCodes.API_KEY_NOT_AUTHORIZED,
              "API key is not authorized for this project"
            );
          }

          const coverageSummary = formData.get("coverage_summary") as File;
          const lcovFile = formData.get("lcov") as File | null;

          if (!coverageSummary) {
            return sendError(
              ErrorCodes.MISSING_FIELD,
              "Missing required file: coverage_summary"
            );
          }
          
          // Check file size (50MB limit as per design spec)
          const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
          if (coverageSummary.size > MAX_FILE_SIZE) {
            return sendError(
              ErrorCodes.FILE_TOO_LARGE,
              "Coverage summary file exceeds 50MB limit"
            );
          }
          if (lcovFile && lcovFile.size > MAX_FILE_SIZE) {
            return sendError(
              ErrorCodes.FILE_TOO_LARGE,
              "LCOV file exceeds 50MB limit"
            );
          }

          let coverageResult;
          try {
            coverageResult = parseJsonCoverage(await coverageSummary.text());
          } catch {
            return sendError(
              ErrorCodes.INVALID_FORMAT,
              "Invalid coverage summary JSON"
            );
          }

          if (lcovFile) {
            try {
              const lcovResult = parseLcov(await lcovFile.text());
              coverageResult.perFile = lcovResult.perFile;
            } catch {
              return sendError(
                ErrorCodes.INVALID_FORMAT,
                "Invalid LCOV file"
              );
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
                lines: {
                  total: baseRun.totalLines,
                  covered: baseRun.coveredLines,
                  skipped: 0,
                  pct: baseRun.linesPct,
                },
                branches: {
                  total: 0,
                  covered: 0,
                  skipped: 0,
                  pct: baseRun.branchesPct,
                },
                functions: {
                  total: 0,
                  covered: 0,
                  skipped: 0,
                  pct: baseRun.functionsPct,
                },
                statements: {
                  total: 0,
                  covered: 0,
                  skipped: 0,
                  pct: baseRun.statementsPct,
                },
              },
              coverageResult.summary,
            );
            filesChanged = computeFileDiff(
              runToFileCoverage(baseRun),
              coverageResult.perFile,
            );
          }

          if (prevRun) {
            diffVsPrevious = computeDiff(
              {
                lines: {
                  total: prevRun.totalLines,
                  covered: prevRun.coveredLines,
                  skipped: 0,
                  pct: prevRun.linesPct,
                },
                branches: {
                  total: 0,
                  covered: 0,
                  skipped: 0,
                  pct: prevRun.branchesPct,
                },
                functions: {
                  total: 0,
                  covered: 0,
                  skipped: 0,
                  pct: prevRun.functionsPct,
                },
                statements: {
                  total: 0,
                  covered: 0,
                  skipped: 0,
                  pct: prevRun.statementsPct,
                },
              },
              coverageResult.summary,
            );
          }

          const fileCoverage: FileInfo[] = Object.entries(
            coverageResult.perFile,
          ).map(([file, metrics]) => ({
            file,
            lines: metrics.lines.pct,
            branches: metrics.branches.pct,
            functions: metrics.functions.pct,
            statements: metrics.statements.pct,
          }));

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

          return sendSuccess(response, 201);
        } catch (error: any) {
          console.error("[UPLOAD] Unexpected error:", error);
          return sendError(
            ErrorCodes.INTERNAL_ERROR,
            "An unexpected error occurred while processing the upload"
          );
        }
      },
    },
  },
});
