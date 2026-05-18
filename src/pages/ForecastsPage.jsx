import PageHeader from '../components/ui/PageHeader';
import AnalyticsDashboard from '../components/personal/AnalyticsDashboard';

export default function ForecastsPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="AI"
        title="Dự báo"
        subtitle="Theo dõi nhịp chi tiêu, khoản lặp lại, rủi ro ngân sách và xu hướng nợ."
      />
      <AnalyticsDashboard />
    </main>
  );
}
