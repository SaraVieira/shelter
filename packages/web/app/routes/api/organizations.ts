import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../server/auth";
import { createOrganizationSchema, formatZodErrors } from "../../server/validation/schemas";
import { sendError, sendSuccess, ErrorCodes } from "../../server/api-response";

export const Route = createFileRoute("/api/organizations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return sendError(ErrorCodes.UNAUTHORIZED, "Unauthorized");
        }
        const orgs = await auth.api.listOrganizations({
          headers: request.headers,
        });
        return sendSuccess(orgs);
      },
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return sendError(ErrorCodes.UNAUTHORIZED, "Unauthorized");
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return sendError(ErrorCodes.INVALID_JSON, "Invalid JSON body");
        }

        const validationResult = createOrganizationSchema.safeParse(body);
        if (!validationResult.success) {
          return sendError(
            ErrorCodes.VALIDATION_ERROR,
            "Validation failed",
            formatZodErrors(validationResult.error)
          );
        }

        const { name, slug } = validationResult.data;

        const result = await auth.api.createOrganization({
          body: {
            name: name.trim(),
            slug: slug || name.trim().toLowerCase().replace(/\s+/g, "-"),
          },
          headers: request.headers,
        });

        if (!result) {
          return sendError(
            ErrorCodes.INTERNAL_ERROR,
            "Failed to create organization"
          );
        }

        return sendSuccess({
          id: result.id,
          name: result.name,
          slug: result.slug,
          role: "owner",
        }, 201);
      },
    },
  },
});
