// useDashboardInsights.js — Fetches AI insights once on mount
import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/apiClient';

export function useDashboardInsights() {
  const [data, setData]       = useState(null);   // { insights, source, generatedAt }
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await userApi.getInsights();
      setData(result);
    } catch (err) {
      setError(err.message || 'Không thể tải phân tích AI.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
