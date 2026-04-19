import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReportData } from '../modules/analytics/analytics.interface';

type FetchFn<T> = () => Promise<{ data: T }>;

interface UseReportResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useReport<T = ReportData>(fetchFn: FetchFn<T>): UseReportResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchFnRef = useRef(fetchFn);

  // Keep ref in sync without triggering re-runs
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchFnRef.current();
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
}
