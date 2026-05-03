import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../../server/auth";
import { db } from "../../../db";
import { projects, runs } from "../../../db/schema";
import { eq, desc } from "drizzle-orm";

async function checkProjectAccess(request: Request, projectId: string): Promise<{ project: typeof projects.$inferSelect } | Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Check if user belongs to the organization that owns this project
  const userOrgs = await auth.api.listOrganizations({ headers: request.headers });
  const hasAccess = userOrgs.some((org: any) => org.id === project.organizationId);

  if (!hasAccess) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return { project };
}

export const Route = createFileRoute("/api/projects/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const accessCheck = await checkProjectAccess(request, params.id);
        if (accessCheck instanceof Response) return accessCheck;
        const { project } = accessCheck;

        const runTimeline = await db
          .select()
          .from(runs)
          .where(eq(runs.projectId, params.id))
          .orderBy(desc(runs.uploadedAt));

        return Response.json({ project, timeline: runTimeline });
      },
      DELETE: async ({ request, params }) => {
        const accessCheck = await checkProjectAccess(request, params.id);
        if (accessCheck instanceof Response) return accessCheck;

        await db.delete(projects).where(eq(projects.id, params.id));
        return new Response(null, { status: 204 });
      },
    },
  },
});
