import * as core from "@actions/core";
import * as github from "@actions/github";
import { uploadCoverage } from "./upload";
import { formatComment } from "./comment";
import { MARKER, findPreviousComment } from "./markers";
import { detectCoverageFiles } from "./coverage-files";

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
    const branch = github.context.payload.pull_request?.head?.ref
      ?? github.context.ref.replace("refs/heads/", "");
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
        runId: result.runId,
      });

      if (existingComment) {
        await octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: existingComment.id as number,
          body: comment,
        });
        core.info("Updated existing comment");
      } else {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: parseInt(prNumber),
          body: comment,
        });
        core.info("Created new comment");
      }
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
