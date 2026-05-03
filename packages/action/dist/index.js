import * as core from '@actions/core';
import * as github from '@actions/github';
import fs from 'fs/promises';
import path from 'path';
import glob from 'fast-glob';

async function uploadCoverage(appUrl, projectId, apiKey, commitSha, branch, prNumber, jsonPath, lcovPath) {
  if (!jsonPath) {
    throw new Error("No coverage-summary.json file found");
  }
  const jsonContent = await fs.readFile(jsonPath, "utf-8");
  const formData = new FormData();
  formData.append("project_id", projectId);
  formData.append("commit_sha", commitSha);
  formData.append("branch", branch);
  if (prNumber) formData.append("pr_number", prNumber);
  const jsonBlob = new Blob([jsonContent], { type: "application/json" });
  formData.append("coverage_summary", jsonBlob, "coverage-summary.json");
  if (lcovPath) {
    const lcovContent = await fs.readFile(lcovPath, "utf-8");
    const lcovBlob = new Blob([lcovContent], { type: "text/plain" });
    formData.append("lcov", lcovBlob, "lcov.info");
  }
  const response = await fetch(`${appUrl}/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Upload failed: ${error.error}`);
  }
  return response.json();
}

const MARKER$1 = "<!-- coverage-tracker-comment -->";
function deltaEmoji(delta) {
  if (delta == null || delta === 0) return "\u{1F937}";
  if (delta > 0) return ":green_heart:";
  return ":broken_heart:";
}
function deltaString(delta) {
  if (delta == null) return "\u2014";
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
}
function formatComment({
  coverage,
  diffVsBase,
  diffVsPrevious,
  filesChanged,
  appUrl,
  projectId,
  runId
}) {
  const url = `${appUrl}/projects/${projectId}/runs/${runId}`;
  const rows = [
    ["Lines", coverage.lines, diffVsBase?.linesDelta, diffVsPrevious?.linesDelta],
    ["Branches", coverage.branches, diffVsBase?.branchesDelta, diffVsPrevious?.branchesDelta],
    ["Functions", coverage.functions, diffVsBase?.functionsDelta, diffVsPrevious?.functionsDelta],
    ["Statements", coverage.statements, diffVsBase?.statementsDelta, diffVsPrevious?.statementsDelta]
  ].map(
    ([metric, cov, base, prev]) => `| ${metric} | ${cov.toFixed(1)}% | ${deltaString(base)} ${deltaEmoji(base)} | ${deltaString(prev)} ${deltaEmoji(prev)} |`
  ).join("\n");
  const header = diffVsBase && diffVsPrevious ? "## Coverage Report\n\n| Metric | Coverage | vs Base | vs Previous |\n|--------|----------|---------|-------------|\n" : "## Coverage Report\n\n| Metric | Coverage |\n|-------|----------|\n";
  let comment = `${MARKER$1}

${header}${rows}
`;
  if (filesChanged && filesChanged.length > 0) {
    const fileRows = filesChanged.map(
      (f) => `| ${f.file} | ${f.after.toFixed(1)}% | ${deltaString(f.diff)} ${deltaEmoji(f.diff)} |`
    ).join("\n");
    comment += `
<details>
<summary>File-level changes</summary>

| File | Coverage | Change |
|------|----------|--------|
${fileRows}

</details>`;
  }
  comment += `

[View full report](${url})`;
  return comment;
}

const MARKER = "<!-- coverage-tracker-comment -->";
function findPreviousComment(comments) {
  return comments.find((c) => c.body?.includes(MARKER));
}

const JSON_COVERAGE_PATTERNS = [
  "**/coverage/coverage-summary.json",
  "**/coverage-final.json",
  "**/coverage/coverage-final.json"
];
const LCOV_PATTERNS = [
  "**/coverage/lcov.info",
  "**/lcov.info"
];
function detectCoverageFiles(workspaceRoot) {
  const jsonFiles = glob.sync(JSON_COVERAGE_PATTERNS, {
    cwd: workspaceRoot
  });
  const lcovFiles = glob.sync(LCOV_PATTERNS, {
    cwd: workspaceRoot
  });
  return {
    jsonPath: jsonFiles[0] ? path.join(workspaceRoot, jsonFiles[0]) : null,
    lcovPath: lcovFiles[0] ? path.join(workspaceRoot, lcovFiles[0]) : null
  };
}

async function run() {
  try {
    const url = core.getInput("url", { required: true });
    const projectId = core.getInput("project-id", { required: true });
    const apiKey = core.getInput("api-key", { required: true });
    const githubToken = core.getInput("github-token") || process.env.GITHUB_TOKEN || "";
    const jsonPath = core.getInput("coverage-summary-path") || null;
    const lcovPath = core.getInput("lcov-path") || null;
    const { jsonPath: detectedJson, lcovPath: detectedLcov } = detectCoverageFiles(process.cwd());
    const finalPath = jsonPath || detectedJson;
    const finalLcov = lcovPath || detectedLcov;
    if (!finalPath) {
      core.error("Could not locate coverage-summary.json.");
      process.exit(1);
    }
    const commitSha = github.context.sha;
    const branch = github.context.payload.pull_request?.head?.ref ?? github.context.ref.replace("refs/heads/", "");
    const prNumber = github.context.payload.pull_request?.number?.toString() || "";
    const result = await uploadCoverage(
      url,
      projectId,
      apiKey,
      commitSha,
      branch,
      prNumber,
      finalPath,
      finalLcov
    );
    core.info(`Coverage uploaded. Lines: ${result.coverage.lines}%`);
    if (prNumber && githubToken) {
      const octokit = github.getOctokit(githubToken);
      const { owner, repo } = github.context.repo;
      const { data: comments } = await octokit.rest.issues.listComments({ owner, repo, issue_number: parseInt(prNumber) });
      const existingComment = findPreviousComment(comments);
      const comment = formatComment({
        ...result,
        appUrl: url,
        projectId,
        runId: result.runId
      });
      if (existingComment) {
        await octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: existingComment.id,
          body: comment
        });
        core.info("Updated existing comment");
      } else {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: parseInt(prNumber),
          body: comment
        });
        core.info("Created new comment");
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}
run();
