import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { adminApi } from '../../services/apiClient';
import AdminOverviewTab from './AdminOverviewTab';
import AdminUsersTab from './AdminUsersTab';
import AdminRoomsTab from './AdminRoomsTab';
import AdminImportsTab from './AdminImportsTab';
import AdminAITab from './AdminAITab';
import AdminSecurityTab from './AdminSecurityTab';
import AdminAuditTab from './AdminAuditTab';

const tabs = [
  { key: '', label: 'Tổng quan', path: '/admin' },
  { key: 'ai', label: 'AI', path: '/admin/ai' },
  { key: 'imports', label: 'Nhập dữ liệu', path: '/admin/imports' },
  { key: 'rooms', label: 'Nhóm', path: '/admin/rooms' },
  { key: 'users', label: 'Người dùng', path: '/admin/users' },
  { key: 'security', label: 'Bảo mật', path: '/admin/security' },
  { key: 'audit', label: 'Nhật ký', path: '/admin/audit' },
];

export default function AdminWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from URL
  const pathSegment = location.pathname.replace('/admin', '').replace(/^\//, '').split('/')[0] || '';
  const activeTab = tabs.find(t => t.key === pathSegment) ? pathSegment : '';
  const activeLabel = tabs.find(t => t.key === activeTab)?.label ?? 'Tổng quan';

  // Shared data loading
  const [overviewData, setOverviewData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [overview, imports, ai, security, trends] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getImports(),
        adminApi.getAi(),
        adminApi.getSecurity(),
        adminApi.getTrends(),
      ]);
      setOverviewData({ overview, imports, ai, security });
      setTrendData(trends);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const renderTab = () => {
    switch (activeTab) {
      case '':
        return <AdminOverviewTab data={overviewData} trends={trendData} loading={loading} />;
      case 'ai':
        return <AdminAITab data={overviewData?.ai} trends={trendData} loading={loading} />;
      case 'imports':
        return <AdminImportsTab data={overviewData?.imports} trends={trendData} loading={loading} />;
      case 'rooms':
        return <AdminRoomsTab onRefresh={loadOverview} />;
      case 'users':
        return <AdminUsersTab onRefresh={loadOverview} />;
      case 'security':
        return <AdminSecurityTab data={overviewData?.security} trends={trendData} loading={loading} />;
      case 'audit':
        return <AdminAuditTab />;
      default:
        return <AdminOverviewTab data={overviewData} trends={trendData} loading={loading} />;
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        eyebrow="Zyra / Admin operations"
        title="Bảng điều hành vận hành"
        subtitle="Theo dõi hệ thống, AI, nhập dữ liệu, nhóm và tín hiệu bảo mật ở mức tổng hợp."
        actions={(
          <>
            {/* Compact section switcher */}
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
              <span className="text-[11px] text-zinc-500 shrink-0">Phân hệ:</span>
              <select
                value={activeTab}
                onChange={(e) => {
                  const tab = tabs.find(t => t.key === e.target.value);
                  if (tab) navigate(tab.path);
                }}
                className="bg-transparent text-xs font-medium text-zinc-200 outline-none cursor-pointer"
              >
                {tabs.map(t => (
                  <option key={t.key} value={t.key} className="bg-zinc-900 text-zinc-200">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadOverview}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.07] transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </>
        )}
      />

      {error && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {renderTab()}
    </main>
  );
}
