"use client";

import { useState, useEffect, useCallback } from "react";
import type { SettingRow } from "@/components/settings-table";

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

interface Filters {
  available_types: string[];
  available_environments: { id: string; name: string }[];
  available_editions: { id: string; name: string }[];
}

interface SettingsResponse {
  data: SettingRow[];
  pagination: Pagination;
  filters: Filters;
}

interface UseSettingsParams {
  versionId: string;
  environmentId?: string;
  editionId?: string;
  modelType?: string;
  deployOnly?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

interface UseSettingsResult {
  data: SettingRow[];
  pagination: Pagination | null;
  filters: Filters | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSettings(params: UseSettingsParams): UseSettingsResult {
  const [data, setData] = useState<SettingRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!params.versionId) return;

    setIsLoading(true);
    setError(null);

    const searchParams = new URLSearchParams();
    searchParams.set("version_id", params.versionId);
    if (params.environmentId) searchParams.set("environment_id", params.environmentId);
    if (params.editionId) searchParams.set("edition_id", params.editionId);
    if (params.modelType) searchParams.set("model_type", params.modelType);
    if (params.deployOnly) searchParams.set("deploy_only", "true");
    if (params.search) searchParams.set("search", params.search);
    if (params.sortBy) searchParams.set("sort_by", params.sortBy);
    if (params.sortOrder) searchParams.set("sort_order", params.sortOrder);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.perPage) searchParams.set("per_page", String(params.perPage));

    try {
      const res = await fetch(`/api/v1/settings?${searchParams.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const result: SettingsResponse = await res.json();
      setData(result.data);
      setPagination(result.pagination);
      setFilters(result.filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setData([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    params.versionId,
    params.environmentId,
    params.editionId,
    params.modelType,
    params.deployOnly,
    params.search,
    params.sortBy,
    params.sortOrder,
    params.page,
    params.perPage,
  ]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { data, pagination, filters, isLoading, error, refetch: fetchSettings };
}
