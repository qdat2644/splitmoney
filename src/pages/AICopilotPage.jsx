import { ArrowRight, Bot, Map, Receipt, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import InsightsSection from '../components/personal/InsightsSection';
import AnalyticsDashboard from '../components/personal/AnalyticsDashboard';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';
import PageHeader from '../components/ui/PageHeader';

export default function AICopilotPage() {
  const navigate = useNavigate();
  const actions = [
    { icon: Receipt, label: 'Parse an expense', detail: 'Use AI inside any room expense flow', to: '/rooms' },
    { icon: Map, label: 'Create a smart plan', detail: 'Generate a budgeted plan from a prompt', to: '/plans' },
    { icon: TrendingUp, label: 'Review forecasts', detail: 'Check spend velocity and budget risk', to: '/forecasts' },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="AI"
        title="Financial Copilot"
        subtitle="One place for insights, planning shortcuts, and next-best actions."
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <InsightsSection />
        <AppCard className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Quick actions</h2>
          </div>
          <div className="space-y-2">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className="flex w-full items-center gap-3 rounded-lg border border-white/5 bg-white/3 px-3 py-3 text-left transition-colors hover:bg-white/5"
              >
                <action.icon className="h-4 w-4 text-blue-300" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-white">{action.label}</span>
                  <span className="block text-xs text-gray-500">{action.detail}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-gray-500" />
              </button>
            ))}
          </div>
        </AppCard>
      </div>

      <div className="rounded-2xl border border-purple-500/15 bg-purple-500/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-300" />
              <p className="text-sm font-semibold text-white">Planning shortcut</p>
            </div>
            <p className="mt-1 text-xs text-gray-400">Turn a goal into a structured financial plan, then convert it into real expenses when ready.</p>
          </div>
          <AppButton onClick={() => navigate('/plans')} icon={Map}>Open Smart Planning</AppButton>
        </div>
      </div>

      <AnalyticsDashboard />
    </main>
  );
}
