import fs from "fs";
import path from "path";
import glob from "fast-glob";

const JSON_COVERAGE_PATTERNS = [
  "**/coverage/coverage-summary.json",
  "**/coverage-final.json",
  "**/coverage/coverage-final.json",
];

const LCOV_PATTERNS = [
  "**/coverage/lcov.info",
  "**/lcov.info",
];

export function detectCoverageFiles(workspaceRoot: string): {
  jsonPath: string | null;
  lcovPath: string | null;
} {
  const jsonFiles = glob.sync(JSON_COVERAGE_PATTERNS, {
    cwd: workspaceRoot,
  });
  const lcovFiles = glob.sync(LCOV_PATTERNS, {
    cwd: workspaceRoot,
  });

  return {
    jsonPath: jsonFiles[0] ? path.join(workspaceRoot, jsonFiles[0]) : null,
    lcovPath: lcovFiles[0] ? path.join(workspaceRoot, lcovFiles[0]) : null,
  };
}
