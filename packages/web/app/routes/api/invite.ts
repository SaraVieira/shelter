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

        let body: { slug: string; email: string };
        try {
          body = await request.json() as { slug: string; email: string };
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { slug, email } = body;
        if (!slug || !email?.trim()) {
          return Response.json({ error: "slug and email are required" }, { status: 400 });
        }

        const orgs = await auth.api.listOrganizations({ headers: request.headers });
        const org = orgs.find((o: any) => o.slug === slug);
        if (!org) {
          return Response.json({ error: "Organization not found" }, { status: 404 });
        }

        const activeMember = await auth.api.getActiveMember({ headers: request.headers });
        if (activeMember?.role !== "owner" && activeMember?.role !== "admin") {
          return Response.json({ error: "Only admins can invite members" }, { status: 403 });
        }

        const invitation = await auth.api.createInvitation({
          body: { email: email.trim(), role: "member", organizationId: org.id },
          headers: request.headers,
        });

        const host = request.headers.get("host") || "localhost:3000";
        const protocol = process.env.BETTER_AUTH_URL?.startsWith("https") ? "https" : "http";
        const baseUrl = process.env.BETTER_AUTH_URL || `${protocol}://${host}`;
        const inviteLink = `${baseUrl}/invite/${invitation.id}`;

        return Response.json({ invitation, inviteLink }, { status: 201 });
      },
    },
  },
});
