import { useCallback, useEffect, useState } from 'react';
import { userApi } from '../services/apiClient';

export function useForecasts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchForecasts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await userApi.getForecasts());
    } catch (err) {
      setError(err.message || 'Không thể tải dự báo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecasts();
  }, [fetchForecasts]);

  return { data, loading, error, refetch: fetchForecasts };
}
