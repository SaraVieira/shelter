import { z } from "zod";

// UUID validation
export const uuidSchema = z.string().uuid();

// Organization schema
export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters").max(100),
  slug: z.string().min(2).max(100).optional(),
});

// Project schema
export const createProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(100),
  organizationId: z.string().min(1, "Organization ID is required"),
  repoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  language: z.string().max(50).optional(),
  framework: z.string().max(50).optional(),
  coverageTool: z.string().max(50).optional(),
});

// Upload schema
export const uploadCoverageSchema = z.object({
  project_id: z.string().uuid("Invalid project ID"),
  commit_sha: z.string().min(7, "Commit SHA must be at least 7 characters").max(40),
  branch: z.string().min(1, "Branch name is required").max(255),
  pr_number: z.string().regex(/^\d*$/, "PR number must be numeric").optional(),
});

// Invitation schema
export const createInvitationSchema = z.object({
  slug: z.string().min(1, "Organization slug is required"),
  email: z.string().email("Must be a valid email address"),
});

// API Key schema
export const createApiKeySchema = z.object({
  name: z.string().min(2, "API key name must be at least 2 characters").max(100),
});

// Generic error response
export function formatZodErrors(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
}
