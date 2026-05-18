import { useMemo } from 'react';
import { Lightbulb, TrendingUp, AlertCircle } from 'lucide-react';
import { generateInsights } from '../../services/ai/insightService';
import { useApp } from '../../context/AppContext';
import { motion } from 'framer-motion';

export default function InsightsWidget() {
  const { expenses, members, currentUser } = useApp();

  const insights = useMemo(() => {
    return generateInsights(expenses, members, currentUser);
  }, [expenses, members, currentUser]);

  if (insights.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <h2 className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
        <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
        Gợi ý AI
      </h2>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-3 flex items-start gap-2.5 bg-dark-800 border border-white/5 border-l-2 border-l-purple-500/40"
          >
            {insight.includes('Chú ý') || insight.includes('nhiều hơn') ? (
              <AlertCircle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
            )}
            <p className="text-xs text-gray-300 leading-relaxed">{insight}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
