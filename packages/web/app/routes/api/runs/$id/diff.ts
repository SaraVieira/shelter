import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../../../server/auth";
import { db } from "../../../../db";
import { runs } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { computeDiff, computeFileDiff } from "../../../../server/diff/coverage.diff";

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
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const currentRun = await db.query.runs.findFirst({
          where: eq(runs.id, params.id),
        });

        if (!currentRun) return Response.json({ error: "Not found" }, { status: 404 });

        const url = new URL(request.url);
        const comparedRunId = url.searchParams.get("comparedRunId");

        let comparedRun = null;
        let diffVsCompared = null;
        let fileDiff: RunDiffResponse["fileDiff"] = [];

        if (comparedRunId) {
          comparedRun = await db.query.runs.findFirst({
            where: eq(runs.id, comparedRunId),
          });

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
