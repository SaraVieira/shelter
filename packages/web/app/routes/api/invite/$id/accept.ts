import { createFileRoute, redirect } from "@tanstack/react-router";
import { auth } from "../../server/auth";

export const Route = createFileRoute("/api/invite/$id/accept")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        await auth.api.acceptInvitation({
          body: { invitationId: params.id },
          headers: request.headers,
        });

        return Response.json({ success: true });
      },
    },
  },
});
