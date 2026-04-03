"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiffViewer } from "./diff-viewer";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

export interface HistoryItem {
  id: string;
  model_setting?: {
    id: string;
    model_component: { name: string; type: string };
    environment: { name: string };
    edition: { name: string };
  };
  changed_by: string;
  change_type: "CREATE" | "UPDATE" | "DELETE";
  diff: Record<string, { old: unknown; new: unknown }>;
  reason?: string | null;
  created_at: string;
}

interface HistoryTimelineProps {
  items: HistoryItem[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const changeTypeBadge: Record<
  string,
  { className: string; label: string }
> = {
  CREATE: {
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    label: "新增",
  },
  UPDATE: {
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    label: "修改",
  },
  DELETE: {
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    label: "刪除",
  },
};

function getDiffOld(
  diff: Record<string, { old: unknown; new: unknown }>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(diff)) {
    result[key] = value.old;
  }
  return result;
}

function getDiffNew(
  diff: Record<string, { old: unknown; new: unknown }>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(diff)) {
    result[key] = value.new;
  }
  return result;
}

export function HistoryTimeline({
  items,
  isLoading,
}: HistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className="relative space-y-0">
        <div className="absolute left-4 top-0 h-full w-px bg-slate-200 dark:bg-slate-700" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative pb-6 pl-10">
            <div className="absolute left-[13px] top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300 dark:border-slate-900 dark:bg-slate-600" />
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="relative space-y-0">
      {/* 時間軸線 */}
      <div className="absolute left-4 top-0 h-full w-px bg-slate-200 dark:bg-slate-700" />

      {items.map((item) => {
        const badge = changeTypeBadge[item.change_type];
        return (
          <div key={item.id} className="relative pb-6 pl-10">
            {/* 時間軸圓點 */}
            <div className="absolute left-[13px] top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400 dark:border-slate-900 dark:bg-slate-500" />

            <Collapsible>
              <Card className="border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  {/* 標題列 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.changed_by}
                      </span>
                      {badge && (
                        <Badge className={cn("text-xs", badge.className)}>
                          {badge.label}
                        </Badge>
                      )}
                    </div>
                    <time
                      className="text-xs text-slate-500"
                      dateTime={item.created_at}
                      title={new Date(item.created_at).toLocaleString("zh-TW")}
                    >
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                        locale: zhTW,
                      })}
                    </time>
                  </div>

                  {/* Model 資訊 */}
                  {item.model_setting && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {item.model_setting.model_component.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {item.model_setting.environment.name}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.model_setting.edition.name}
                      </Badge>
                    </div>
                  )}

                  {/* 展開 diff */}
                  <CollapsibleTrigger className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    <ChevronRight className="h-3.5 w-3.5 transition-transform [[data-state=open]>>&]:rotate-90" />
                    展開查看 diff
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-3">
                    <DiffViewer
                      oldObj={getDiffOld(item.diff)}
                      newObj={getDiffNew(item.diff)}
                    />
                    {item.reason && (
                      <p className="mt-2 text-xs text-slate-500">
                        原因：{item.reason}
                      </p>
                    )}
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
}
