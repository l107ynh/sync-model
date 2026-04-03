"use client";

import { useState, useEffect, useCallback } from "react";

interface Environment {
  id: string;
  name: string;
}

interface UseEnvironmentsResult {
  environments: Environment[];
  isLoading: boolean;
  error: string | null;
}

export function useEnvironments(versionId?: string): UseEnvironmentsResult {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvironments = useCallback(async () => {
    if (!versionId) {
      setEnvironments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/v1/versions/${versionId}/environments`
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const result = await res.json();
      setEnvironments(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setEnvironments([]);
    } finally {
      setIsLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  return { environments, isLoading, error };
}
