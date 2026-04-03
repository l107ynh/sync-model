import { Badge } from "@/components/ui/badge";
import { ModelTypeBadge } from "@/components/model-type-badge";
import { cn } from "@/lib/utils";
import type { SettingRow } from "@/components/settings-table";

interface SettingsDetailProps {
  setting: SettingRow;
  className?: string;
}

export function SettingsDetail({ setting, className }: SettingsDetailProps) {
  const { model_component, environment, edition, deploy, gpu_list, replica, gpu_memory_utilization, extra_settings, updated_at } = setting;

  return (
    <div className={cn("space-y-4 rounded-lg border p-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-mono text-base font-semibold">
            {model_component.name}
          </h3>
          {model_component.component_version && (
            <p className="mt-0.5 font-mono text-xs text-slate-400">
              v{model_component.component_version}
            </p>
          )}
        </div>
        <ModelTypeBadge type={model_component.type} size="md" />
      </div>

      {/* Deploy status */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            deploy ? "bg-green-500" : "bg-slate-400"
          )}
        />
        <span className="text-sm">{deploy ? "已部署" : "未部署"}</span>
        <span className="text-xs text-slate-400">
          {environment.name} / {edition.name}
        </span>
      </div>

      {/* GPU info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-xs text-slate-500">GPU List</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {gpu_list.length > 0 ? (
              gpu_list.map((gpu, i) => (
                <Badge key={i} variant="secondary" className="font-mono text-xs">
                  {gpu}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-slate-400">-</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-xs text-slate-500">Replica</span>
          <p className="mt-1 font-mono">{replica}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">GPU Memory Utilization</span>
          <p className="mt-1 font-mono">
            {gpu_memory_utilization !== null
              ? `${(gpu_memory_utilization * 100).toFixed(0)}%`
              : "-"}
          </p>
        </div>
        {model_component.image && (
          <div>
            <span className="text-xs text-slate-500">Image</span>
            <p className="mt-1 break-all font-mono text-xs">
              {model_component.image}
            </p>
          </div>
        )}
      </div>

      {/* Extra settings */}
      {extra_settings && Object.keys(extra_settings).length > 0 && (
        <div>
          <span className="text-xs text-slate-500">Extra Settings</span>
          <pre className="mt-1 overflow-auto rounded bg-slate-50 p-2 font-mono text-xs dark:bg-slate-900">
            {JSON.stringify(extra_settings, null, 2)}
          </pre>
        </div>
      )}

      {/* Updated at */}
      <div className="text-xs text-slate-400">
        更新時間: {new Date(updated_at).toLocaleString("zh-TW")}
      </div>
    </div>
  );
}
