import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ProjectCard } from "../components/ProjectCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "@tanstack/react-form";
import { fetchFromAPI } from "@/lib/api";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const headers: Record<string, string> = {};
    if (context.auth?.cookie) headers.cookie = context.auth.cookie;

    const [orgsRes, projectsRes] = await Promise.all([
      fetchFromAPI("/api/organizations", { headers }),
      fetchFromAPI("/api/projects", { headers }),
    ]);
    if (!orgsRes) throw new Error("Failed to load organizations");
    if (!projectsRes) throw new Error("Failed to load projects");

    return { orgs: orgsRes, projects: projectsRes };
  },
  component: DashboardPage,
});

function CreateOrgDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const form = useForm({
    defaultValues: {
      name: "",
    },
    onSubmit: async ({ value }) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: value.name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create organization");
      }

      form.reset();
      onClose();
      window.location.reload();
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          form.reset();
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Create Organization</DialogTitle>
        <DialogDescription>
          Enter a name for your new organization.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) =>
              !value.trim()
                ? "Organization name is required"
                : value.trim().length < 2
                  ? "Organization name must be at least 2 characters"
                  : undefined,
          }}
        >
          {(field) => (
            <div className="mb-4">
              <Input
                autoFocus
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    form.handleSubmit();
                  }
                }}
                placeholder="My Organization"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) =>
            [state.errorMap, state.canSubmit, state.isSubmitting] as const
          }
        >
          {([errorMap, canSubmit, isSubmitting]) => (
            <>
              {errorMap &&
                typeof errorMap === "object" &&
                "onSubmit" in errorMap &&
                errorMap.onSubmit && (
                  <p className="text-sm text-red-600 mb-2">
                    {(errorMap.onSubmit as Error).message}
                  </p>
                )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !(canSubmit as boolean) || (isSubmitting as boolean)
                  }
                >
                  {isSubmitting ? "Creating..." : "Create"}
                </Button>
              </div>
            </>
          )}
        </form.Subscribe>
      </form>
    </Dialog>
  );
}

function DashboardPage() {
  const { orgs, projects } = Route.useLoaderData();
  const [showCreateOrg, setShowCreateOrg] = useState(false);

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

          <CreateOrgDialog
            open={showCreateOrg}
            onClose={() => setShowCreateOrg(false)}
          />
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
                  <ProjectCard
                    key={project.id}
                    project={{
                      id: project.id,
                      name: project.name,
                      organizationName: org.name,
                      latestCoverage: project.latestCoverage,
                    }}
                  />
                ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
