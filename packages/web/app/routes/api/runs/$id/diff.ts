import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../../../server/auth";
import { db } from "../../../../db";
import { runs, projects } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { computeDiff, computeFileDiff } from "../../../../server/diff/coverage.diff";

async function checkRunAccess(request: Request, runId: string): Promise<{ run: typeof runs.$inferSelect; hasAccess: true } | { hasAccess: false; response: Response }> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return { hasAccess: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const run = await db.query.runs.findFirst({
    where: eq(runs.id, runId),
  });

  if (!run) {
    return { hasAccess: false, response: Response.json({ error: "Not found" }, { status: 404 }) };
  }

  // Get the project to check organization access
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, run.projectId),
  });

  if (!project) {
    return { hasAccess: false, response: Response.json({ error: "Not found" }, { status: 404 }) };
  }

  // Check if user belongs to the organization that owns this project
  const userOrgs = await auth.api.listOrganizations({ headers: request.headers });
  const hasAccess = userOrgs.some((org: any) => org.id === project.organizationId);

  if (!hasAccess) {
    return { hasAccess: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { run, hasAccess: true };
}

interface RunDiffResponse {
  currentRun: {
    id: string;
    commitSha: string;
    branch: string;
    prNumber: number | null;
    linesPct: number;
    branchesPct: number;
    functionsPct: number;
    statementsPct: number;
    uploadedAt: Date;
  };
  comparedRun: {
    id: string;
    commitSha: string;
    branch: string;
    prNumber: number | null;
    linesPct: number;
    branchesPct: number;
    functionsPct: number;
    statementsPct: number;
    uploadedAt: Date;
  } | null;
  diffVsCompared: {
    linesDelta: number;
    branchesDelta: number;
    functionsDelta: number;
    statementsDelta: number;
  } | null;
  fileDiff: {
    file: string;
    before: number;
    after: number;
    diff: number;
  }[];
}

export const Route = createFileRoute("/api/runs/$id/diff")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        // Check access to current run
        const currentAccess = await checkRunAccess(request, params.id);
        if (!currentAccess.hasAccess) return currentAccess.response;
        const currentRun = currentAccess.run;

        const url = new URL(request.url);
        const comparedRunId = url.searchParams.get("comparedRunId");

        let comparedRun = null;
        let diffVsCompared = null;
        let fileDiff: RunDiffResponse["fileDiff"] = [];

        if (comparedRunId) {
          // Check access to compared run as well
          const comparedAccess = await checkRunAccess(request, comparedRunId);
          if (!comparedAccess.hasAccess) return comparedAccess.response;
          comparedRun = comparedAccess.run;

          if (comparedRun) {
            diffVsCompared = computeDiff(
              {
                lines: { total: comparedRun.totalLines, covered: comparedRun.coveredLines, skipped: 0, pct: comparedRun.linesPct },
                branches: { total: 0, covered: 0, skipped: 0, pct: comparedRun.branchesPct },
                functions: { total: 0, covered: 0, skipped: 0, pct: comparedRun.functionsPct },
                statements: { total: 0, covered: 0, skipped: 0, pct: comparedRun.statementsPct },
              },
              {
                lines: { total: currentRun.totalLines, covered: currentRun.coveredLines, skipped: 0, pct: currentRun.linesPct },
                branches: { total: 0, covered: 0, skipped: 0, pct: currentRun.branchesPct },
                functions: { total: 0, covered: 0, skipped: 0, pct: currentRun.functionsPct },
                statements: { total: 0, covered: 0, skipped: 0, pct: currentRun.statementsPct },
              }
            );

            if (currentRun.fileCoverage && comparedRun.fileCoverage) {
              const basePerFile: Record<string, any> = {};
              for (const f of comparedRun.fileCoverage) {
                basePerFile[f.file] = {
                  lines: { pct: f.lines },
                  branches: { pct: f.branches },
                  functions: { pct: f.functions },
                  statements: { pct: f.statements },
                };
              }

              const currentPerFile: Record<string, any> = {};
              for (const f of currentRun.fileCoverage) {
                currentPerFile[f.file] = {
                  lines: { pct: f.lines },
                  branches: { pct: f.branches },
                  functions: { pct: f.functions },
                  statements: { pct: f.statements },
                };
              }

              fileDiff = computeFileDiff(basePerFile, currentPerFile);
            }
          }
        }

        const response: RunDiffResponse = {
          currentRun: {
            id: currentRun.id,
            commitSha: currentRun.commitSha,
            branch: currentRun.branch,
            prNumber: currentRun.prNumber,
            linesPct: currentRun.linesPct,
            branchesPct: currentRun.branchesPct,
            functionsPct: currentRun.functionsPct,
            statementsPct: currentRun.statementsPct,
            uploadedAt: currentRun.uploadedAt,
          },
          comparedRun: comparedRun
            ? {
                id: comparedRun.id,
                commitSha: comparedRun.commitSha,
                branch: comparedRun.branch,
                prNumber: comparedRun.prNumber,
                linesPct: comparedRun.linesPct,
                branchesPct: comparedRun.branchesPct,
                functionsPct: comparedRun.functionsPct,
                statementsPct: comparedRun.statementsPct,
                uploadedAt: comparedRun.uploadedAt,
              }
            : null,
          diffVsCompared,
          fileDiff,
        };

        return Response.json(response);
      },
    },
  },
});
