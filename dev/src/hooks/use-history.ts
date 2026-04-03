"use client";

import { useState, useEffect, useCallback } from "react";
import type { HistoryItem } from "@/components/history-timeline";

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

interface HistoryResponse {
  data: HistoryItem[];
  pagination: Pagination;
}

export interface UseHistoryParams {
  versionId?: string;
  environmentId?: string;
  editionId?: string;
  modelComponentId?: string;
  changedBy?: string;
  changeType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  perPage?: number;
}

interface UseHistoryResult {
  data: HistoryItem[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useHistory(params: UseHistoryParams): UseHistoryResult {
  const [data, setData] = useState<HistoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const searchParams = new URLSearchParams();
    if (params.versionId) searchParams.set("version_id", params.versionId);
    if (params.environmentId)
      searchParams.set("environment_id", params.environmentId);
    if (params.editionId) searchParams.set("edition_id", params.editionId);
    if (params.modelComponentId)
      searchParams.set("model_component_id", params.modelComponentId);
    if (params.changedBy) searchParams.set("changed_by", params.changedBy);
    if (params.changeType) searchParams.set("change_type", params.changeType);
    if (params.fromDate) searchParams.set("from_date", params.fromDate);
    if (params.toDate) searchParams.set("to_date", params.toDate);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.perPage) searchParams.set("per_page", String(params.perPage));

    try {
      const res = await fetch(`/api/v1/history?${searchParams.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const result: HistoryResponse = await res.json();
      setData(result.data);
      setPagination(result.pagination);
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
    params.modelComponentId,
    params.changedBy,
    params.changeType,
    params.fromDate,
    params.toDate,
    params.page,
    params.perPage,
  ]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { data, pagination, isLoading, error, refetch: fetchHistory };
}
