import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { apiUrl } from "@/lib/api";

export const Route = createFileRoute("/projects/$id/api-keys")({
  loader: async ({ params, context }) => {
    const h: Record<string, string> = {};
    if (context.auth?.cookie) h.cookie = context.auth.cookie;
    const res = await fetch(apiUrl(`/api/projects/${params.id}`), {
      headers: h,
    });
    if (!res.ok) throw new Error("Not found");
    return res.json();
  },
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const { id } = Route.useParams();
  const { project } = Route.useLoaderData();
  const [newKey, setNewKey] = useState("");

  const form = useForm({
    defaultValues: {
      name: "",
    },
    onSubmit: async ({ value }) => {
      // Use our custom API endpoint that properly sets the organization referenceId
      const res = await fetch(`/api/projects/${id}/api-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: value.name.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("[API KEYS] Create error:", data);
        throw new Error(data.error || "Failed to create API key");
      }

      const key = await res.json();
      setNewKey(key.key);
      form.reset();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <Link
          to="/projects/$id"
          params={{ id }}
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to project
        </Link>
        <h1 className="text-xl font-bold">API Keys</h1>
      </header>
      <main className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Create API Key</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="flex gap-2"
            >
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value.trim()
                      ? "API key name is required"
                      : value.trim().length < 2
                        ? "Name must be at least 2 characters"
                        : undefined,
                }}
              >
                {(field) => (
                  <div className="flex-1">
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="My CI key"
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
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create"}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            <form.Subscribe selector={(state) => state.errorMap}>
              {(errorMap) =>
                errorMap &&
                typeof errorMap === "object" &&
                errorMap.onSubmit ? (
                  <p className="text-sm text-red-600 mt-2">
                    {(errorMap.onSubmit as Error).message}
                  </p>
                ) : null
              }
            </form.Subscribe>

            <p className="mt-2 text-sm text-muted-foreground">
              This API key will be used by the GitHub Action to upload coverage
              data.
            </p>
          </CardContent>
        </Card>
      </main>

      <Dialog
        open={!!newKey}
        onOpenChange={(v) => {
          if (!v) setNewKey("");
        }}
      >
        <DialogHeader>
          <DialogTitle>API Key Created</DialogTitle>
        </DialogHeader>
        <p className="text-sm mb-2">
          Copy this key now — you won't be able to see it again.
        </p>
        <pre className="p-3 bg-muted rounded-md text-sm font-mono break-all select-all">
          {newKey}
        </pre>
        <div className="flex justify-end mt-4">
          <Button
            onClick={() => {
              navigator.clipboard.writeText(newKey);
              setNewKey("");
            }}
          >
            Copied
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
