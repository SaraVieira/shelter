import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "../../lib/api";

export const Route = createFileRoute("/org/$slug/new-project")({
  loader: async ({ context }) => {
    const headers: Record<string, string> = {};
    if (context.auth?.cookie) headers.cookie = context.auth.cookie;
    const res = await fetch(apiUrl("/api/organizations"), { headers });
    const orgs = await res.json();
    return { cookie: context.auth?.cookie || "", orgs };
  },
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const { slug } = Route.useParams();
  const { cookie, orgs } = Route.useLoaderData();
  const [form, setForm] = useState({
    name: "",
    repoUrl: "",
    language: "",
    framework: "",
    coverageTool: "",
  });
  const [error, setError] = useState("");

  const org = orgs.find((o: any) => o.slug === slug);
  const organizationId = org?.id || null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!organizationId) {
      setError("Organization not found");
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (cookie) headers.cookie = cookie;

    const res = await fetch("/api/projects", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...form, organizationId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    const project = await res.json();
    await navigate({ to: "/projects/$id", params: { id: project.id } });
  }

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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Repo URL</label>
                <Input
                  value={form.repoUrl}
                  onChange={(e) =>
                    setForm({ ...form, repoUrl: e.target.value })
                  }
                  placeholder="https://github.com/owner/repo"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Language</label>
                  <Input
                    value={form.language}
                    onChange={(e) =>
                      setForm({ ...form, language: e.target.value })
                    }
                    placeholder="TypeScript"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Framework</label>
                  <Input
                    value={form.framework}
                    onChange={(e) =>
                      setForm({ ...form, framework: e.target.value })
                    }
                    placeholder="TanStack Start"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Coverage Tool</label>
                  <Input
                    value={form.coverageTool}
                    onChange={(e) =>
                      setForm({ ...form, coverageTool: e.target.value })
                    }
                    placeholder="Vitest"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit">Create Project</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
