import { CoverageSummary, FileCoverageSummary } from "../parsers/coverage.types";

export interface CoverageDiff {
  linesDelta: number;
  branchesDelta: number;
  functionsDelta: number;
  statementsDelta: number;
}

export interface FileChange {
  file: string;
  before: number;
  after: number;
  diff: number;
}

export function computeDiff(base: CoverageSummary, current: CoverageSummary): CoverageDiff {
  return {
    linesDelta: current.lines.pct - base.lines.pct,
    branchesDelta: current.branches.pct - base.branches.pct,
    functionsDelta: current.functions.pct - base.functions.pct,
    statementsDelta: current.statements.pct - base.statements.pct,
  };
}

export function computeFileDiff(
  base: FileCoverageSummary,
  current: FileCoverageSummary
): FileChange[] {
  const allFiles = new Set([...Object.keys(base), ...Object.keys(current)]);
  const changes: FileChange[] = [];

  for (const file of allFiles) {
    const before = base[file]?.lines.pct ?? 0;
    const after = current[file]?.lines.pct ?? 0;
    const diff = after - before;

    if (diff !== 0) {
      changes.push({ file, before, after, diff });
    }
  }

  return changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}
