import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../server/auth";

export const Route = createFileRoute("/api/invite")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { slug, email } = await request.json() as { slug: string; email: string };
        if (!slug || !email?.trim()) {
          return Response.json({ error: "slug and email are required" }, { status: 400 });
        }

        const orgs = await auth.api.listOrganizations({ headers: request.headers });
        const org = orgs.find((o: any) => o.slug === slug);
        if (!org) {
          return Response.json({ error: "Organization not found" }, { status: 404 });
        }

        const invitation = await auth.api.createInvitation({
          body: { email: email.trim(), role: "member", organizationId: org.id },
          headers: request.headers,
        });

        const host = request.headers.get("host") || "localhost:3000";
        const baseUrl = process.env.BETTER_AUTH_URL || `http://${host}`;
        const inviteLink = `${baseUrl}/invite/${invitation.id}`;

        return Response.json({ invitation, inviteLink }, { status: 201 });
      },
    },
  },
});
