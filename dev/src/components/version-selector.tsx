"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Layers, Clock } from "lucide-react";

interface Version {
  id: string;
  name: string;
  description: string | null;
  model_components_count: number;
  created_at: string;
  updated_at: string;
}

interface VersionCardProps {
  version: Version;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "剛剛";
  if (diffMins < 60) return `${diffMins} 分鐘前`;
  if (diffHours < 24) return `${diffHours} 小時前`;
  if (diffDays < 30) return `${diffDays} 天前`;
  return date.toLocaleDateString("zh-TW");
}

function VersionCard({ version }: VersionCardProps) {
  return (
    <Link href={`/settings?version_id=${version.id}`}>
      <Card className="cursor-pointer transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="text-xl font-bold">v{version.name}</span>
            <Badge variant="secondary" className="font-mono text-xs">
              <Layers className="mr-1 h-3 w-3" />
              {version.model_components_count} models
            </Badge>
          </CardTitle>
          {version.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {version.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            <span>{formatTimeAgo(version.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface VersionSelectorProps {
  versions: Version[];
  isLoading?: boolean;
}

export function VersionSelector({
  versions,
  isLoading = false,
}: VersionSelectorProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-sm text-slate-500">
          目前沒有版本資料，請先匯入 cdk8s 設定
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {versions.map((version) => (
        <VersionCard key={version.id} version={version} />
      ))}
    </div>
  );
}
