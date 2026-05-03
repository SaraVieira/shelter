import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../../server/auth";
import { db } from "../../../db";
import { runs } from "../../../db/schema";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/invite/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const invitation = await auth.api.getInvitation({
          query: { id: params.id },
        });
        if (!invitation) {
          return Response.json({ error: "Invitation not found" }, { status: 404 });
        }
        return Response.json(invitation);
      },
    },
  },
});
