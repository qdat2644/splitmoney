import { Sparkles } from 'lucide-react';
import { useCopilotWorkspace } from '../../hooks/useCopilotWorkspace';
import RecommendationCard from './RecommendationCard';

export default function ContextualCopilotPanel({ title, types, limit = 2 }) {
  const { data, loading } = useCopilotWorkspace();
  const recommendations = (data?.recommendations ?? [])
    .filter((item) => types.includes(item.type))
    .slice(0, limit);

  if (loading || recommendations.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-300" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-2">
        {recommendations.map((recommendation) => (
          <RecommendationCard key={recommendation.id} recommendation={recommendation} compact />
        ))}
      </div>
    </section>
  );
}
