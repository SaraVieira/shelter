import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ProjectCard } from "../components/ProjectCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const headers: Record<string, string> = {};
    if (context.auth?.cookie) headers.cookie = context.auth.cookie;

    const [orgsRes, projectsRes] = await Promise.all([
      fetch("/api/organizations", { headers }),
      fetch("/api/projects", { headers }),
    ]);
    if (!orgsRes.ok) throw new Error("Failed to load organizations");
    if (!projectsRes.ok) throw new Error("Failed to load projects");
    const [orgs, projects] = await Promise.all([orgsRes.json(), projectsRes.json()]);

    return { orgs, projects };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { orgs, projects } = Route.useLoaderData();
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");

  async function handleCreateOrg() {
    if (!orgName.trim()) return;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: orgName.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    setShowCreateOrg(false);
    setOrgName("");
    setError("");
    window.location.reload();
  }

  if (!orgs?.length) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Coverage Tracker</h1>
          <p className="text-muted-foreground mb-4">
            Create an organization to start tracking coverage.
          </p>
          <Button onClick={() => setShowCreateOrg(true)}>
            Create Organization
          </Button>

          <Dialog open={showCreateOrg} onOpenChange={(v) => { setShowCreateOrg(v); setError(""); }}>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>Enter a name for your new organization.</DialogDescription>
            </DialogHeader>
            <input
              autoFocus
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateOrg()}
              placeholder="My Organization"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm mb-4"
            />
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreateOrg(false); setError(""); }}>Cancel</Button>
              <Button onClick={handleCreateOrg}>Create</Button>
            </div>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-xl font-bold">Coverage Tracker</h1>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        {orgs.map((org: any) => (
          <section key={org.id} className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <Link
                to="/org/$slug"
                params={{ slug: org.slug }}
                className="text-lg font-semibold hover:underline"
              >
                {org.name}
              </Link>
              <Link
                to="/org/$slug/new-project"
                params={{ slug: org.slug }}
                className="text-sm text-primary hover:underline"
              >
                + New Project
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects
                .filter((p: any) => p.organizationId === org.id)
                .map((project: any) => (
                  <ProjectCard key={project.id} project={{
                    id: project.id,
                    name: project.name,
                    organizationName: org.name,
                    latestCoverage: project.latestCoverage,
                  }} />
                ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
