import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    organizationName: string;
    latestCoverage: {
      linesPct: number;
      linesDelta?: number;
    } | null;
  };
}

function CoverageIndicator({ delta }: { delta: number }) {
  if (delta > 0) return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
  if (delta < 0) return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
  return <MinusIcon className="h-4 w-4 text-gray-400" />;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link to="/projects/$id" params={{ id: project.id }} className="group">
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base truncate">{project.name}</CardTitle>
          <p className="text-xs text-muted-foreground">{project.organizationName}</p>
        </CardHeader>
        <CardContent>
          {project.latestCoverage ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{project.latestCoverage.linesPct.toFixed(1)}%</span>
              {project.latestCoverage.linesDelta != null && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CoverageIndicator delta={project.latestCoverage.linesDelta} />
                  {project.latestCoverage.linesDelta > 0 ? "+" : ""}
                  {project.latestCoverage.linesDelta.toFixed(1)}%
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data yet</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
