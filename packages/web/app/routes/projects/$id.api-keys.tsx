import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export const Route = createFileRoute("/projects/$id/api-keys")({
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const { id } = Route.useParams();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState("");

  const handleCreate = async () => {
    const res = await fetch("/api/auth/api-key/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const key = await res.json();
    setNewKey(key.key);
    setName("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <Link to="/projects/$id" params={{ id }} className="text-sm text-muted-foreground hover:underline">
          Back to project
        </Link>
        <h1 className="text-xl font-bold">API Keys</h1>
      </header>
      <main className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader><CardTitle>Create API Key</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="My CI key" />
              <Button onClick={handleCreate}>Create</Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              This API key will be used by the GitHub Action to upload coverage data.
            </p>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!newKey} onOpenChange={(v) => { if (!v) setNewKey(""); }}>
        <DialogHeader>
          <DialogTitle>API Key Created</DialogTitle>
        </DialogHeader>
        <p className="text-sm mb-2">Copy this key now — you won't be able to see it again.</p>
        <pre className="p-3 bg-muted rounded-md text-sm font-mono break-all select-all">{newKey}</pre>
        <div className="flex justify-end mt-4">
          <Button onClick={() => { navigator.clipboard.writeText(newKey); setNewKey(""); }}>Copied</Button>
        </div>
      </Dialog>
    </div>
  );
}
