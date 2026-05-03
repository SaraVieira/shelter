import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../../server/auth";
import { db } from "../../../db";
import { runs } from "../../../db/schema";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/runs/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const run = await db.query.runs.findFirst({
          where: eq(runs.id, params.id),
        });
        if (!run) return Response.json({ error: "Not found" }, { status: 404 });
        return Response.json(run);
      },
    },
  },
});
