import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../../server/auth";

export const Route = createFileRoute("/api/invite/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const invitation = await auth.api.getInvitation({
          query: { id: params.id },
          headers: request.headers,
        } as any);
        if (!invitation) {
          return Response.json({ error: "Invitation not found" }, { status: 404 });
        }
        return Response.json(invitation);
      },
    },
  },
});
