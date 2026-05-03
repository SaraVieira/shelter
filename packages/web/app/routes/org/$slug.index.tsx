import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "../../lib/api";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";

export const Route = createFileRoute("/org/$slug/")({
  loader: async ({ params, context }) => {
    const h: Record<string, string> = {};
    if (context.auth?.cookie) h.cookie = context.auth.cookie;

    const [orgsRes, projectsRes] = await Promise.all([
      fetch(apiUrl("/api/organizations"), { headers: h }),
      fetch(apiUrl("/api/projects"), { headers: h }),
    ]);
    if (!orgsRes.ok) throw new Error("Failed to load organizations");
    if (!projectsRes.ok) throw new Error("Failed to load projects");
    const [orgsData, projectsData] = await Promise.all([orgsRes.json(), projectsRes.json()]);
    const orgs = orgsData.data;
    const projects = projectsData.data;
    const org = orgs.find((o: any) => o.slug === params.slug);
    if (!org) throw new Error("Organization not found");

    return { org, projects: projects.filter((p: any) => p.organizationId === org.id) };
  },
  component: OrgPage,
});

function OrgPage() {
  const { slug } = Route.useParams();
  const { org, projects } = Route.useLoaderData();
  const [inviteLink, setInviteLink] = useState("");

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      setInviteLink("");
      
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: value.email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create invitation");
      }

      const data = await res.json();
      setInviteLink(data.inviteLink);
      form.reset();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          Back to dashboard
        </Link>
      </header>
      <main className="mx-auto max-w-4xl p-6 space-y-6">
        <h1 className="text-2xl font-bold">{org.name}</h1>

        <Card>
          <CardHeader><CardTitle>Invite Members</CardTitle></CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="flex gap-2"
            >
              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "Email is required"
                      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                      ? "Invalid email format"
                      : undefined,
                }}
              >
                {(field) => (
                  <div className="flex-1">
                    <Input
                      placeholder="user@example.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600 mt-1">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </form.Field>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? "Generating..." : "Generate Invite"}
                  </Button>
                )}
              </form.Subscribe>
            </form>
            
            <form.Subscribe
              selector={(state) => state.errorMap}
            >
              {(errorMap) =>
                errorMap && typeof errorMap === 'object' && errorMap.onSubmit ? (
                  <p className="text-sm text-red-600 mt-2">{(errorMap.onSubmit as Error).message}</p>
                ) : null
              }
            </form.Subscribe>
            
            {inviteLink && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Share this link:</p>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly onClick={(e) => (e.target as HTMLInputElement).select()} />
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(inviteLink)}>Copy</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Projects ({projects.length})</CardTitle>
            <Link to="/org/$slug/new-project" params={{ slug }}>
              <Button size="sm">+ New Project</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
              <div className="space-y-2">
                {projects.map((project: any) => (
                  <Link
                    key={project.id}
                    to="/projects/$id"
                    params={{ id: project.id }}
                    className="block p-3 rounded border hover:bg-muted transition-colors"
                  >
                    <div className="font-medium">{project.name}</div>
                    {project.latestCoverage && (
                      <div className="text-sm text-muted-foreground">
                        Coverage: {project.latestCoverage.linesPct?.toFixed(1)}%
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No projects yet. Create one to start tracking coverage.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
