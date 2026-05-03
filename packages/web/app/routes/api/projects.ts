import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../server/auth";
import { db } from "../../db";
import { projects, runs } from "../../db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { createProjectSchema, formatZodErrors } from "../../server/validation/schemas";
import { sendError, sendSuccess, ErrorCodes } from "../../server/api-response";

export const Route = createFileRoute("/api/projects")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return sendError(ErrorCodes.UNAUTHORIZED, "Unauthorized");
        }

        const orgs = await auth.api.listOrganizations({
          headers: request.headers,
        });
        const orgIds = orgs.map((org: any) => org.id);
        if (orgIds.length === 0) return sendSuccess([]);

        const userProjects = await db
          .select()
          .from(projects)
          .where(inArray(projects.organizationId, orgIds));

        const result = await Promise.all(
          userProjects.map(async (project) => {
            const latestRuns = await db
              .select()
              .from(runs)
              .where(eq(runs.projectId, project.id))
              .orderBy(desc(runs.uploadedAt))
              .limit(1);

            return {
              ...project,
              latestCoverage: latestRuns[0]
                ? {
                    linesPct: latestRuns[0].linesPct,
                    branchesPct: latestRuns[0].branchesPct,
                    functionsPct: latestRuns[0].functionsPct,
                    statementsPct: latestRuns[0].statementsPct,
                    uploadedAt: latestRuns[0].uploadedAt,
                  }
                : null,
            };
          })
        );

        return sendSuccess(result);
      },
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return sendError(ErrorCodes.UNAUTHORIZED, "Unauthorized");
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return sendError(ErrorCodes.INVALID_JSON, "Invalid JSON body");
        }

        const validationResult = createProjectSchema.safeParse(body);
        if (!validationResult.success) {
          return sendError(
            ErrorCodes.VALIDATION_ERROR,
            "Validation failed",
            formatZodErrors(validationResult.error)
          );
        }

        const { name, organizationId, repoUrl, language, framework, coverageTool } = validationResult.data;

        const orgs = await auth.api.listOrganizations({ headers: request.headers });
        const isMember = orgs.some((o: any) => o.id === organizationId);
        if (!isMember) {
          return sendError(
            ErrorCodes.FORBIDDEN,
            "You are not a member of this organization"
          );
        }

        const [newProject] = await db
          .insert(projects)
          .values({
            organizationId,
            name,
            repoUrl: repoUrl || undefined,
            language: language || undefined,
            framework: framework || undefined,
            coverageTool: coverageTool || undefined,
          })
          .returning();

        return sendSuccess(newProject, 201);
      },
    },
  },
});
