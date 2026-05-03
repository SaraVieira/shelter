import fs from "fs/promises";

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
  filesChanged: {
    file: string;
    before: number;
    after: number;
    diff: number;
  }[];
}

export async function uploadCoverage(
  appUrl: string,
  projectId: string,
  apiKey: string,
  commitSha: string,
  branch: string,
  prNumber: string | undefined,
  jsonPath: string | null,
  lcovPath: string | null
): Promise<UploadResponse> {
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
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Upload failed: ${error.error}`);
  }

  return response.json();
}
