import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ModelType } from "@/types";

const MODEL_TYPE_STYLES: Record<ModelType, string> = {
  LLM: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ASR: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  TTS: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  VLM: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Retriever:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Reranker:
    "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  ObjectDetection:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  ObjectRecognition:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  Face: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  Guardian:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
};

interface ModelTypeBadgeProps {
  type: string;
  size?: "sm" | "md";
  className?: string;
}

export function ModelTypeBadge({
  type,
  size = "sm",
  className,
}: ModelTypeBadgeProps) {
  const styles = MODEL_TYPE_STYLES[type as ModelType] ?? "bg-slate-100 text-slate-700";

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent font-mono font-medium tracking-wide",
        size === "sm" && "px-1.5 py-0.5 text-[10px]",
        size === "md" && "px-2 py-0.5 text-xs",
        styles,
        className
      )}
    >
      {type}
    </Badge>
  );
}
