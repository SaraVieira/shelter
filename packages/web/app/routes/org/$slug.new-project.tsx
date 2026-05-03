import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "../../lib/api";
import { useForm } from "@tanstack/react-form";

export const Route = createFileRoute("/org/$slug/new-project")({
  loader: async ({ context }) => {
    const headers: Record<string, string> = {};
    if (context.auth?.cookie) headers.cookie = context.auth.cookie;
    const res = await fetch(apiUrl("/api/organizations"), { headers });
    const orgsData = await res.json();
    const orgs = orgsData.data;
    return { cookie: context.auth?.cookie || "", orgs };
  },
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const { slug } = Route.useParams();
  const { cookie, orgs } = Route.useLoaderData();

  const org = orgs.find((o: any) => o.slug === slug);
  const organizationId = org?.id || null;

  const form = useForm({
    defaultValues: {
      name: "",
      repoUrl: "",
      language: "",
      framework: "",
      coverageTool: "",
    },
    onSubmit: async ({ value }) => {
      if (!organizationId) {
        throw new Error("Organization not found");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (cookie) headers.cookie = cookie;

      const res = await fetch("/api/projects", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...value, organizationId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create project");
      }

      const project = await res.json();
      await navigate({ to: "/projects/$id", params: { id: project.id } });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <Link
          to="/org/$slug"
          params={{ slug }}
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to {slug}
        </Link>
      </header>
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <CardHeader>
            <CardTitle>New Project</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value.trim()
                      ? "Project name is required"
                      : value.trim().length < 2
                      ? "Project name must be at least 2 characters"
                      : undefined,
                }}
              >
                {(field) => (
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="My Project"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600 mt-1">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="repoUrl"
                validators={{
                  onChange: ({ value }) =>
                    value && value.trim() && !value.match(/^https?:\/\/.+/)
                      ? "Must be a valid URL"
                      : undefined,
                }}
              >
                {(field) => (
                  <div>
                    <label className="text-sm font-medium">Repo URL</label>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="https://github.com/owner/repo"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600 mt-1">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </form.Field>

              <div className="grid grid-cols-3 gap-4">
                <form.Field name="language">
                  {(field) => (
                    <div>
                      <label className="text-sm font-medium">Language</label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="TypeScript"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="framework">
                  {(field) => (
                    <div>
                      <label className="text-sm font-medium">Framework</label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="TanStack Start"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="coverageTool">
                  {(field) => (
                    <div>
                      <label className="text-sm font-medium">Coverage Tool</label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Vitest"
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Subscribe
                selector={(state) => [state.errorMap, state.canSubmit, state.isSubmitting] as const}
              >
                {([errorMap, canSubmit, isSubmitting]) => (
                  <>
                    {errorMap && typeof errorMap === 'object' && 'onSubmit' in errorMap && errorMap.onSubmit && (
                      <p className="text-sm text-red-600">{(errorMap.onSubmit as Error).message}</p>
                    )}
                    <Button type="submit" disabled={!(canSubmit as boolean) || (isSubmitting as boolean)}>
                      {isSubmitting ? "Creating..." : "Create Project"}
                    </Button>
                  </>
                )}
              </form.Subscribe>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
