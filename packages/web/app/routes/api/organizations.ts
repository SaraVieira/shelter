import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../server/auth";

export const Route = createFileRoute("/api/organizations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const orgs = await auth.api.listOrganizations({
          headers: request.headers,
        });
        return Response.json(orgs);
      },
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body: { name: string; slug?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        if (!body.name?.trim()) {
          return Response.json({ error: "Organization name is required" }, { status: 400 });
        }

        const result = await auth.api.createOrganization({
          body: {
            name: body.name.trim(),
            slug: body.slug || body.name.trim().toLowerCase().replace(/\s+/g, "-"),
          },
          headers: request.headers,
        });

        if (!result) {
          return Response.json({ error: "Failed to create organization" }, { status: 500 });
        }

        return Response.json({
          id: result.id,
          name: result.name,
          slug: result.slug,
          role: "owner",
        }, { status: 201 });
      },
    },
  },
});
