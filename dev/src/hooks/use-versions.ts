"use client";

import { useState, useEffect, useCallback } from "react";

interface Version {
  id: string;
  name: string;
  description: string | null;
  model_components_count: number;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

interface UseVersionsResult {
  versions: Version[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
}

export function useVersions(
  page: number = 1,
  perPage: number = 20
): UseVersionsResult {
  const [versions, setVersions] = useState<Version[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/v1/versions?page=${page}&per_page=${perPage}`
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const result = await res.json();
      setVersions(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setVersions([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  return { versions, pagination, isLoading, error };
}
