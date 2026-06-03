import AnalyticsDashboard from '../components/personal/AnalyticsDashboard';
import PageHeader from '../components/ui/PageHeader';

export default function AnalyticsPage() {
  return (
    <main data-testid="analytics-page" className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Tiền bạc"
        title="Phân tích"
        subtitle="Xem xu hướng chi tiêu, danh mục nổi bật và tín hiệu tài chính gần đây."
      />
      <AnalyticsDashboard />
    </main>
  );
}
