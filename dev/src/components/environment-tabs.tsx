"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Server } from "lucide-react";

interface Environment {
  id: string;
  name: string;
}

interface EnvironmentTabsProps {
  environments: Environment[];
  selectedId?: string;
  onSelect: (environmentId: string | undefined) => void;
  disabled?: boolean;
}

export function EnvironmentTabs({
  environments,
  selectedId,
  onSelect,
  disabled = false,
}: EnvironmentTabsProps) {
  return (
    <Select
      value={selectedId ?? "all"}
      onValueChange={(value) => onSelect(value === "all" ? undefined : value)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[160px]">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-slate-400" />
          <SelectValue placeholder="Environment" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部環境</SelectItem>
        {environments.map((env) => (
          <SelectItem key={env.id} value={env.id}>
            {env.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
