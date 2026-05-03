import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../../server/auth";
import { db } from "../../../db";
import { runs, projects } from "../../../db/schema";
import { eq } from "drizzle-orm";

async function checkRunAccess(request: Request, runId: string): Promise<{ run: typeof runs.$inferSelect } | Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await db.query.runs.findFirst({
    where: eq(runs.id, runId),
  });

  if (!run) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Get the project to check organization access
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, run.projectId),
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

  return { run };
}

export const Route = createFileRoute("/api/runs/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const accessCheck = await checkRunAccess(request, params.id);
        if (accessCheck instanceof Response) return accessCheck;
        const { run } = accessCheck;
        return Response.json(run);
      },
    },
  },
});
