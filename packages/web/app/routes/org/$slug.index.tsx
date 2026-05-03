import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "../../lib/api";
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
    const [orgs, projects] = await Promise.all([orgsRes.json(), projectsRes.json()]);
    const org = orgs.find((o: any) => o.slug === params.slug);
    if (!org) throw new Error("Organization not found");

    return { org, projects: projects.filter((p: any) => p.organizationId === org.id) };
  },
  component: OrgPage,
});

function OrgPage() {
  const { slug } = Route.useParams();
  const { org, projects } = Route.useLoaderData();
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteError, setInviteError] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteLink("");
    if (!email.trim()) return;

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, email: email.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setInviteError(data.error || "Failed to create invitation");
      return;
    }

    const data = await res.json();
    setInviteLink(data.inviteLink);
    setEmail("");
  }

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
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              <Button type="submit">Generate Invite</Button>
            </form>
            {inviteError && <p className="text-sm text-red-600 mt-2">{inviteError}</p>}
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
