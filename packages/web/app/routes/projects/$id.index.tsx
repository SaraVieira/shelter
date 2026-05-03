import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { apiUrl } from "../../lib/api";

export const Route = createFileRoute("/projects/$id/")({
  loader: async ({ params, context }) => {
    const h: Record<string, string> = {};
    if (context.auth?.cookie) h.cookie = context.auth.cookie;
    const res = await fetch(apiUrl(`/api/projects/${params.id}`), { headers: h });
    if (!res.ok) throw new Error("Not found");
    return res.json();
  },
  component: ProjectPage,
});

function CoverageIcon({ delta }: { delta: number }) {
  if (delta > 0) return <ArrowUpIcon className="h-3 w-3 text-green-600" />;
  if (delta < 0) return <ArrowDownIcon className="h-3 w-3 text-red-600" />;
  return null;
}

function ProjectPage() {
  const { project, timeline } = Route.useLoaderData();

  const chartData = (timeline || [])
    .reverse()
    .map((run: any) => ({
      date: new Date(run.uploadedAt).toLocaleDateString("en", { month: "short", day: "numeric" }),
      lines: run.linesPct,
      branches: run.branchesPct,
      functions: run.functionsPct,
    }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="text-sm text-muted-foreground hover:underline">
              Dashboard
            </Link>
            <h1 className="text-xl font-bold">{project.name}</h1>
          </div>
          <Link to="/projects/$id/api-keys" params={{ id: project.id }}>
            <Button variant="outline" size="sm">API Keys</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6 space-y-6">
        {timeline?.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Lines", value: timeline[0].linesPct, delta: timeline[0].diffVsBase?.linesDelta },
              { label: "Branches", value: timeline[0].branchesPct, delta: timeline[0].diffVsBase?.branchesDelta },
              { label: "Functions", value: timeline[0].functionsPct, delta: timeline[0].diffVsBase?.functionsDelta },
              { label: "Statements", value: timeline[0].statementsPct, delta: timeline[0].diffVsBase?.statementsDelta },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{item.value?.toFixed(1)}%</span>
                    {item.delta != null && (
                      <span className="flex items-center text-sm text-muted-foreground">
                        <CoverageIcon delta={item.delta} />
                        {item.delta > 0 ? "+" : ""}{item.delta.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>Coverage Over Time</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer>
                  <AreaChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="lines" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" />
                    <Area type="monotone" dataKey="branches" stroke="hsl(var(--ring))" fill="hsl(var(--ring)/0.1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No coverage data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Runs</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Branches</TableHead>
                  <TableHead>Commit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(timeline || []).map((run: any) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <Link
                        to="/projects/$id/runs/$runId"
                        params={{ id: project.id, runId: run.id }}
                        className="text-primary hover:underline"
                      >
                        {new Date(run.uploadedAt).toLocaleDateString()}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{run.branch}</Badge>
                    </TableCell>
                    <TableCell>{run.linesPct?.toFixed(1)}%</TableCell>
                    <TableCell>{run.branchesPct?.toFixed(1)}%</TableCell>
                    <TableCell className="font-mono text-xs">{run.commitSha.slice(0, 7)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
