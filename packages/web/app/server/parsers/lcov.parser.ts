import { CoverageResult, CoverageSummary, FileCoverageSummary, Metric } from "./coverage.types";

interface FileData {
  lines: { total: number; covered: number };
  branches: { total: number; covered: number };
  functions: { total: number; covered: number };
}

function pct(covered: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((covered / total) * 10000) / 100;
}

function fileDataToMetric(fd: { total: number; covered: number }): Metric {
  return {
    total: fd.total,
    covered: fd.covered,
    skipped: 0,
    pct: pct(fd.covered, fd.total),
  };
}

export function parseLcov(lcovString: string): CoverageResult {
  if (!lcovString.trim()) {
    throw new Error("LCOV content is empty");
  }

  const files = new Map<string, FileData>();
  let currentFile: string | null = null;

  for (const line of lcovString.split("\n")) {
    if (line.startsWith("SF:")) {
      currentFile = line.slice(3);
      files.set(currentFile, {
        lines: { total: 0, covered: 0 },
        branches: { total: 0, covered: 0 },
        functions: { total: 0, covered: 0 },
      });
    } else if (line === "end_of_record") {
      currentFile = null;
    } else if (currentFile) {
      const data = files.get(currentFile)!;

      if (line.startsWith("LF:")) data.lines.total = parseInt(line.slice(3), 10);
      else if (line.startsWith("LH:")) data.lines.covered = parseInt(line.slice(3), 10);
      else if (line.startsWith("BRF:")) data.branches.total = parseInt(line.slice(4), 10);
      else if (line.startsWith("BRH:")) data.branches.covered = parseInt(line.slice(4), 10);
      else if (line.startsWith("FNF:")) data.functions.total = parseInt(line.slice(4), 10);
      else if (line.startsWith("FNH:")) data.functions.covered = parseInt(line.slice(4), 10);
    }
  }

  if (files.size === 0) {
    throw new Error("No coverage data found in LCOV");
  }

  const perFile: FileCoverageSummary = {};
  let totalLines = 0, coveredLines = 0;
  let totalBranches = 0, coveredBranches = 0;
  let totalFunctions = 0, coveredFunctions = 0;
  let totalStatements = 0, coveredStatements = 0;

  for (const [file, data] of files) {
    perFile[file] = {
      lines: fileDataToMetric(data.lines),
      branches: fileDataToMetric(data.branches),
      functions: fileDataToMetric(data.functions),
      statements: fileDataToMetric(data.lines),
    };

    totalLines += data.lines.total;
    coveredLines += data.lines.covered;
    totalBranches += data.branches.total;
    coveredBranches += data.branches.covered;
    totalFunctions += data.functions.total;
    coveredFunctions += data.functions.covered;
    totalStatements += data.lines.total;
    coveredStatements += data.lines.covered;
  }

  const summary: CoverageSummary = {
    lines: { total: totalLines, covered: coveredLines, skipped: 0, pct: pct(coveredLines, totalLines) },
    branches: { total: totalBranches, covered: coveredBranches, skipped: 0, pct: pct(coveredBranches, totalBranches) },
    functions: { total: totalFunctions, covered: coveredFunctions, skipped: 0, pct: pct(coveredFunctions, totalFunctions) },
    statements: { total: totalStatements, covered: coveredStatements, skipped: 0, pct: pct(coveredStatements, totalStatements) },
  };

  return { summary, perFile };
}
