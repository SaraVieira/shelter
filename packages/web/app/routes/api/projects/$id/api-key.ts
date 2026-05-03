import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../../../server/auth";
import { db } from "../../../../db";
import { projects } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/projects/$id/api-key")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        // Check authentication
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const project = await db.query.projects.findFirst({
          where: eq(projects.id, params.id),
        });

        if (!project) {
          return Response.json({ error: "Project not found" }, { status: 404 });
        }

        const userOrgs = await auth.api.listOrganizations({
          headers: request.headers,
        });
        const hasAccess = userOrgs.some(
          (org: any) => org.id === project.organizationId,
        );

        if (!hasAccess) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        // Parse request body
        let body: { name?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        if (!body.name?.trim()) {
          return Response.json(
            { error: "API key name is required" },
            { status: 400 },
          );
        }

        try {
          await auth.api.setActiveOrganization({
            body: {
              organizationId: project.organizationId,
            },
            headers: request.headers,
          });

          const key = await auth.api.createApiKey({
            body: {
              name: body.name.trim(),
              organizationId: project.organizationId,
            },
            headers: request.headers,
          });

          return Response.json(
            {
              id: key.id,
              name: key.name,
              key: key.key, // The actual API key string (only shown once)
              referenceId: key.referenceId,
            },
            { status: 201 },
          );
        } catch (error: any) {
          return Response.json(
            {
              error: error.message || "Failed to create API key",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
