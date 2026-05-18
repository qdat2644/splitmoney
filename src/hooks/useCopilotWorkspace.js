import { useCallback, useEffect, useState } from 'react';
import { userApi } from '../services/apiClient';

export function useCopilotWorkspace() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await userApi.getCopilot());
    } catch (err) {
      setError(err.message || 'Không thể tải không gian trợ lý AI.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
