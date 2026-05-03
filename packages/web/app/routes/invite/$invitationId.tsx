import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/invite/$invitationId")({
  component: InvitePage,
});

function InvitePage() {
  const { invitationId } = Route.useParams();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setError("");
    const res = await fetch(`/api/invite/${invitationId}/accept`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to accept invitation");
      return;
    }
    setAccepted(true);
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invitation Accepted!</h1>
          <p className="text-muted-foreground mb-4">You're now a member of the organization.</p>
          <Button onClick={() => window.location.href = "/"}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Organization Invitation</h1>
        <p className="text-muted-foreground mb-4">
          You've been invited to join an organization on Coverage Tracker.
        </p>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <Button onClick={handleAccept}>Accept Invitation</Button>
      </div>
    </div>
  );
}
