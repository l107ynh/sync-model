"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft } from "lucide-react";

interface Version {
  id: string;
  name: string;
}

interface Environment {
  id: string;
  name: string;
}

interface Edition {
  id: string;
  name: string;
}

interface VersionCompareProps {
  onCompare: (params: {
    versionAId: string;
    versionBId: string;
    environmentId?: string;
    editionId?: string;
  }) => void;
  isLoading?: boolean;
}

export function VersionCompare({ onCompare, isLoading }: VersionCompareProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionAId, setVersionAId] = useState("");
  const [versionBId, setVersionBId] = useState("");
  const [environmentId, setEnvironmentId] = useState<string | undefined>();
  const [editionId, setEditionId] = useState<string | undefined>();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);

  // Fetch versions
  useEffect(() => {
    async function fetchVersions() {
      try {
        const res = await fetch("/api/v1/versions?per_page=100");
        if (res.ok) {
          const data = await res.json();
          setVersions(data.data ?? []);
        }
      } catch {
        // ignore
      }
    }
    fetchVersions();
  }, []);

  // Fetch environments and editions when version A is selected
  useEffect(() => {
    if (!versionAId) return;
    async function fetchFilters() {
      try {
        const res = await fetch(
          `/api/v1/settings?version_id=${versionAId}&per_page=1`
        );
        if (res.ok) {
          const data = await res.json();
          setEnvironments(data.filters?.available_environments ?? []);
          setEditions(data.filters?.available_editions ?? []);
        }
      } catch {
        // ignore
      }
    }
    fetchFilters();
  }, [versionAId]);

  const handleCompare = useCallback(() => {
    if (!versionAId || !versionBId) return;
    onCompare({
      versionAId,
      versionBId,
      environmentId,
      editionId,
    });
  }, [versionAId, versionBId, environmentId, editionId, onCompare]);

  const canCompare = versionAId && versionBId && versionAId !== versionBId;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-4">
        {/* Version A */}
        <div className="space-y-1.5">
          <Label>Version A（基準）</Label>
          <Select value={versionAId} onValueChange={setVersionAId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="選擇版本 A" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ArrowRightLeft className="mb-2 h-5 w-5 text-slate-400" />

        {/* Version B */}
        <div className="space-y-1.5">
          <Label>Version B（比較）</Label>
          <Select value={versionBId} onValueChange={setVersionBId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="選擇版本 B" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Environment filter */}
        <div className="space-y-1.5">
          <Label>Environment（選填）</Label>
          <Select
            value={environmentId ?? "all"}
            onValueChange={(v) =>
              setEnvironmentId(v === "all" ? undefined : v)
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="全部環境" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部環境</SelectItem>
              {environments.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Edition filter */}
        <div className="space-y-1.5">
          <Label>Edition（選填）</Label>
          <Select
            value={editionId ?? "all"}
            onValueChange={(v) => setEditionId(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="全部 Edition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部 Edition</SelectItem>
              {editions.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Compare button */}
        <Button onClick={handleCompare} disabled={!canCompare || isLoading}>
          {isLoading ? "比較中..." : "比較"}
        </Button>
      </div>

      {versionAId && versionBId && versionAId === versionBId && (
        <p className="text-sm text-red-500">不允許同一版本自我比較</p>
      )}
    </div>
  );
}
