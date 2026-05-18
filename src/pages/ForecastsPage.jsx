import PageHeader from '../components/ui/PageHeader';
import AnalyticsDashboard from '../components/personal/AnalyticsDashboard';

export default function ForecastsPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="AI"
        title="Forecasts"
        subtitle="Spend velocity, recurring patterns, budget risk, and debt direction."
      />
      <AnalyticsDashboard />
    </main>
  );
}
