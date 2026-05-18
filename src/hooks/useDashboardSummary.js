// useDashboardSummary.js — Custom hook for personal summary fetching
import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/apiClient';

export function useDashboardSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await userApi.getPersonalSummary();
      setData(result);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu tổng quan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
