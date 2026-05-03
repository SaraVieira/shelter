const MARKER = "<!-- coverage-tracker-comment -->";

function deltaEmoji(delta: number | null): string {
  if (delta == null || delta === 0) return "\uD83E\uDD37";
  if (delta > 0) return ":green_heart:";
  return ":broken_heart:";
}

function deltaString(delta: number | null): string {
  if (delta == null) return "\u2014";
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`;
}

export function formatComment({
  coverage,
  diffVsBase,
  diffVsPrevious,
  filesChanged,
  appUrl,
  projectId,
  runId,
}: {
  coverage: { lines: number; branches: number; functions: number; statements: number };
  diffVsBase: { linesDelta: number; branchesDelta: number; functionsDelta: number; statementsDelta: number } | null;
  diffVsPrevious: { linesDelta: number; branchesDelta: number; functionsDelta: number; statementsDelta: number } | null;
  filesChanged: { file: string; before: number; after: number; diff: number }[];
  appUrl: string;
  projectId: string;
  runId: string;
}): string {
  const url = `${appUrl}/projects/${projectId}/runs/${runId}`;

  const rows = [
    ["Lines", coverage.lines, diffVsBase?.linesDelta, diffVsPrevious?.linesDelta],
    ["Branches", coverage.branches, diffVsBase?.branchesDelta, diffVsPrevious?.branchesDelta],
    ["Functions", coverage.functions, diffVsBase?.functionsDelta, diffVsPrevious?.functionsDelta],
    ["Statements", coverage.statements, diffVsBase?.statementsDelta, diffVsPrevious?.statementsDelta],
  ].map(
    ([metric, cov, base, prev]) =>
      `| ${metric} | ${(cov as number).toFixed(1)}% | ${deltaString(base as number | null)} ${deltaEmoji(base as number | null)} | ${deltaString(prev as number | null)} ${deltaEmoji(prev as number | null)} |`
  ).join("\n");

  const header = diffVsBase && diffVsPrevious
    ? "## Coverage Report\n\n| Metric | Coverage | vs Base | vs Previous |\n|--------|----------|---------|-------------|\n"
    : "## Coverage Report\n\n| Metric | Coverage |\n|-------|----------|\n";

  let comment = `${MARKER}\n\n${header}${rows}\n`;

  if (filesChanged && filesChanged.length > 0) {
    const fileRows = filesChanged
      .map(
        (f) =>
          `| ${f.file} | ${f.after.toFixed(1)}% | ${deltaString(f.diff)} ${deltaEmoji(f.diff)} |`
      )
      .join("\n");

    comment += `
<details>
<summary>File-level changes</summary>

| File | Coverage | Change |
|------|----------|--------|
${fileRows}

</details>`;
  }

  comment += `\n\n[View full report](${url})`;

  return comment;
}
