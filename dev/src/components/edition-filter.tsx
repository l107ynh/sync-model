"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag } from "lucide-react";

interface Edition {
  id: string;
  name: string;
}

interface EditionFilterProps {
  editions: Edition[];
  selectedId?: string;
  onSelect: (editionId: string | undefined) => void;
  disabled?: boolean;
}

export function EditionFilter({
  editions,
  selectedId,
  onSelect,
  disabled = false,
}: EditionFilterProps) {
  return (
    <Select
      value={selectedId ?? "all"}
      onValueChange={(value) => onSelect(value === "all" ? undefined : value)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[140px]">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-slate-400" />
          <SelectValue placeholder="Edition" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部 Edition</SelectItem>
        {editions.map((edition) => (
          <SelectItem key={edition.id} value={edition.id}>
            {edition.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
