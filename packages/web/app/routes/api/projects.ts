import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../server/auth";
import { db } from "../../db";
import { projects, runs } from "../../db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export const Route = createFileRoute("/api/projects")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const orgs = await auth.api.listOrganizations({
          headers: request.headers,
        });
        const orgIds = orgs.map((org: any) => org.id);
        if (orgIds.length === 0) return Response.json([]);

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

        return Response.json(result);
      },
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        let body: Record<string, string>;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { name, organizationId, repoUrl, language, framework, coverageTool } = body;

        if (!name || !organizationId) {
          return Response.json(
            { error: "name and organizationId are required" },
            { status: 400 }
          );
        }

        const orgs = await auth.api.listOrganizations({ headers: request.headers });
        const isMember = orgs.some((o: any) => o.id === organizationId);
        if (!isMember) {
          return Response.json({ error: "You are not a member of this organization" }, { status: 403 });
        }

        const [newProject] = await db
          .insert(projects)
          .values({
            organizationId,
            name,
            repoUrl,
            language,
            framework,
            coverageTool,
          })
          .returning();

        return Response.json(newProject, { status: 201 });
      },
    },
  },
});
