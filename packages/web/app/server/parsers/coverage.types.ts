export interface Metric {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

export interface CoverageSummary {
  lines: Metric;
  branches: Metric;
  functions: Metric;
  statements: Metric;
}

export interface FileCoverageSummary {
  [file: string]: {
    lines: Metric;
    branches: Metric;
    functions: Metric;
    statements: Metric;
  };
}

export interface CoverageResult {
  summary: CoverageSummary;
  perFile: FileCoverageSummary;
}

export interface ParsedCoverageFile {
  file: string;
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}
