import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon, ArrowUpDown } from "lucide-react";
import { apiUrl } from "@/lib/api";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { useState } from "react";

interface CoverageMetric {
  metric: string;
  pct: number;
  base?: number;
  prev?: number;
}

interface FileCoverage {
  file: string;
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

const metricColumnHelper = createColumnHelper<CoverageMetric>();
const fileColumnHelper = createColumnHelper<FileCoverage>();

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

function MetricsTable({ data }: { data: CoverageMetric[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = [
    metricColumnHelper.accessor("metric", {
      header: "Metric",
    }),
    metricColumnHelper.accessor("pct", {
      header: "Coverage",
      cell: (info) => `${info.getValue()?.toFixed(1)}%`,
    }),
    metricColumnHelper.accessor("base", {
      header: "vs Base",
      cell: (info) => <DeltaRow delta={info.getValue()} />,
    }),
    metricColumnHelper.accessor("prev", {
      header: "vs Previous",
      cell: (info) => <DeltaRow delta={info.getValue()} />,
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <table className="w-full caption-bottom text-sm">
      <thead className="[&_tr]:border-b">
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50">
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="h-10 px-2 text-left align-middle font-medium text-muted-foreground"
              >
                {header.isPlaceholder ? null : (
                  <button
                    className="flex items-center gap-1"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" ? (
                      <ArrowUpIcon className="h-3 w-3" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ArrowDownIcon className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                    )}
                  </button>
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody className="[&_tr:last-child]:border-0">
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="p-2 align-middle">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FileCoverageTable({ data }: { data: FileCoverage[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "file", desc: false }]);

  const columns = [
    fileColumnHelper.accessor("file", {
      header: "File",
      cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
    }),
    fileColumnHelper.accessor("lines", {
      header: "Lines",
      cell: (info) => `${info.getValue()?.toFixed(1)}%`,
    }),
    fileColumnHelper.accessor("branches", {
      header: "Branches",
      cell: (info) => `${info.getValue()?.toFixed(1)}%`,
    }),
    fileColumnHelper.accessor("functions", {
      header: "Functions",
      cell: (info) => `${info.getValue()?.toFixed(1)}%`,
    }),
    fileColumnHelper.accessor("statements", {
      header: "Statements",
      cell: (info) => `${info.getValue()?.toFixed(1)}%`,
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <table className="w-full caption-bottom text-sm">
      <thead className="[&_tr]:border-b">
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50">
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="h-10 px-2 text-left align-middle font-medium text-muted-foreground"
              >
                {header.isPlaceholder ? null : (
                  <button
                    className="flex items-center gap-1"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" ? (
                      <ArrowUpIcon className="h-3 w-3" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ArrowDownIcon className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                    )}
                  </button>
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody className="[&_tr:last-child]:border-0">
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="p-2 align-middle">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RunDetailPage() {
  const run = Route.useLoaderData();

  const metricsData: CoverageMetric[] = [
    { metric: "Lines", pct: run.linesPct, base: run.diffVsBase?.linesDelta, prev: run.diffVsPrevious?.linesDelta },
    { metric: "Branches", pct: run.branchesPct, base: run.diffVsBase?.branchesDelta, prev: run.diffVsPrevious?.branchesDelta },
    { metric: "Functions", pct: run.functionsPct, base: run.diffVsBase?.functionsDelta, prev: run.diffVsPrevious?.functionsDelta },
    { metric: "Statements", pct: run.statementsPct, base: run.diffVsBase?.statementsDelta, prev: run.diffVsPrevious?.statementsDelta },
  ];

  const fileCoverageData: FileCoverage[] = run.fileCoverage || [];

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
              <MetricsTable data={metricsData} />
            </CardContent>
          </Card>
        </div>

        {fileCoverageData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>File Coverage</CardTitle></CardHeader>
            <CardContent>
              <FileCoverageTable data={fileCoverageData} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
