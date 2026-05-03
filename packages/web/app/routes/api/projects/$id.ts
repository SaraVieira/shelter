import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../../server/auth";
import { db } from "../../../db";
import { projects, runs } from "../../../db/schema";
import { eq, desc } from "drizzle-orm";

export const Route = createFileRoute("/api/projects/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const project = await db.query.projects.findFirst({
          where: eq(projects.id, params.id),
        });
        if (!project) return Response.json({ error: "Not found" }, { status: 404 });

        const runTimeline = await db
          .select()
          .from(runs)
          .where(eq(runs.projectId, params.id))
          .orderBy(desc(runs.uploadedAt));

        return Response.json({ project, timeline: runTimeline });
      },
      DELETE: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        await db.delete(projects).where(eq(projects.id, params.id));
        return new Response(null, { status: 204 });
      },
    },
  },
});
