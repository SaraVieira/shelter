import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";
import { apiUrl } from "@/lib/api";

export const Route = createFileRoute("/projects/$id/runs/$runId")({
  loader: async ({ params, context }) => {
    const h: Record<string, string> = {};
    if (context.auth?.cookie) h.cookie = context.auth.cookie;
    const res = await fetch(apiUrl(`/api/runs/${params.runId}`), { headers: h });
    if (!res.ok) throw new Error("Not found");
    return res.json();
  },
  component: RunDetailPage,
});

function CoverageIcon({ delta }: { delta: number }) {
  if (delta > 0) return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
  if (delta < 0) return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
  return <MinusIcon className="h-4 w-4 text-gray-400" />;
}

function DeltaRow({ delta }: { delta: number | undefined }) {
  if (delta == undefined) return null;
  return (
    <span className="flex items-center gap-1 text-sm">
      <CoverageIcon delta={delta} />
      {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
    </span>
  );
}

function RunDetailPage() {
  const run = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div>
          <Link to="/projects/$id" params={{ id: run.projectId }} className="text-sm text-muted-foreground hover:underline">
            Back to project
          </Link>
          <h1 className="text-xl font-bold">Coverage Run</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{run.branch}</Badge>
          <Badge variant="outline">{run.commitSha?.slice(0, 7)}</Badge>
          {run.prNumber && <Badge variant="default">PR #{run.prNumber}</Badge>}
          <span className="text-sm text-muted-foreground">
            {new Date(run.uploadedAt).toLocaleString()}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Overall Coverage</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>vs Base</TableHead>
                    <TableHead>vs Previous</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { metric: "Lines", pct: run.linesPct, base: run.diffVsBase?.linesDelta, prev: run.diffVsPrevious?.linesDelta },
                    { metric: "Branches", pct: run.branchesPct, base: run.diffVsBase?.branchesDelta, prev: run.diffVsPrevious?.branchesDelta },
                    { metric: "Functions", pct: run.functionsPct, base: run.diffVsBase?.functionsDelta, prev: run.diffVsPrevious?.functionsDelta },
                    { metric: "Statements", pct: run.statementsPct, base: run.diffVsBase?.statementsDelta, prev: run.diffVsPrevious?.statementsDelta },
                  ].map((row) => (
                    <TableRow key={row.metric}>
                      <TableCell>{row.metric}</TableCell>
                      <TableCell>{row.pct?.toFixed(1)}%</TableCell>
                      <TableCell><DeltaRow delta={row.base} /></TableCell>
                      <TableCell><DeltaRow delta={row.prev} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {run.fileCoverage && run.fileCoverage.length > 0 && (
          <Card>
            <CardHeader><CardTitle>File Coverage</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead>Branches</TableHead>
                    <TableHead>Functions</TableHead>
                    <TableHead>Statements</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.fileCoverage.map((f: any) => (
                    <TableRow key={f.file}>
                      <TableCell className="font-mono text-sm">{f.file}</TableCell>
                      <TableCell>{f.lines?.toFixed(1)}%</TableCell>
                      <TableCell>{f.branches?.toFixed(1)}%</TableCell>
                      <TableCell>{f.functions?.toFixed(1)}%</TableCell>
                      <TableCell>{f.statements?.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
