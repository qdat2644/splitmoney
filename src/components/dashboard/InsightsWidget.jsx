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
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-white flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-yellow-400" />
        AI Insights
      </h2>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-3 flex items-start gap-3 bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-l-2 border-l-purple-500"
          >
            {insight.includes('Chú ý') || insight.includes('nhiều hơn') ? (
              <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
            ) : (
              <TrendingUp className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
            )}
            <p className="text-sm text-gray-300">{insight}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
