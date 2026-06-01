// useDashboard.js — Consolidated personal dashboard hook
// Replaces the three separate useDashboardSummary + useDashboardAnalytics + useDashboardInsights
// calls in PersonalDashboard with a single request to GET /api/users/me/dashboard.
//
// The three original hooks are kept in place so that:
//   - AnalyticsDashboard can still use useDashboardAnalytics when rendered standalone (ForecastsPage)
//   - InsightsSection can still use useDashboardInsights when rendered standalone
//   - Any future page that only needs summary/analytics/insights individually can import the right hook
import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/apiClient';

export function useDashboard() {
  const [data, setData] = useState(null);   // { summary, analytics, insights, meta }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await userApi.getDashboard());
    } catch (err) {
      setError(err.message || 'Không thể tải bảng điều khiển.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
