import { CoverageResult, CoverageSummary, FileCoverageSummary, Metric } from "./coverage.types";

interface RawCoverageJSON {
  total: RawCoverageMetrics;
  [file: string]: RawCoverageMetrics;
}

interface RawCoverageMetrics {
  lines: RawMetric;
  branches: RawMetric;
  functions: RawMetric;
  statements: RawMetric;
}

interface RawMetric {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

function parseMetric(raw: RawMetric): Metric {
  return {
    total: raw.total ?? 0,
    covered: raw.covered ?? 0,
    skipped: raw.skipped ?? 0,
    pct: raw.pct ?? 0,
  };
}

function parseMetrics(raw: RawCoverageMetrics): CoverageSummary {
  return {
    lines: parseMetric(raw.lines ?? {} as RawMetric),
    branches: parseMetric(raw.branches ?? {} as RawMetric),
    functions: parseMetric(raw.functions ?? {} as RawMetric),
    statements: parseMetric(raw.statements ?? {} as RawMetric),
  };
}

export function parseJsonCoverage(jsonString: string): CoverageResult {
  const parsed = JSON.parse(jsonString) as RawCoverageJSON;

  if (!parsed.total || typeof parsed.total !== "object") {
    throw new Error("Coverage JSON is missing 'total' field");
  }

  const summary = parseMetrics(parsed.total);
  const perFile: FileCoverageSummary = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (key === "total") continue;
    if (typeof value === "object" && value !== null && "lines" in value) {
      perFile[key] = parseMetrics(value);
    }
  }

  return { summary, perFile };
}
