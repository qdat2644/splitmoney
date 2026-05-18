// InsightsSection.jsx - Full insights panel for PersonalDashboard
import { motion } from 'framer-motion';
import { Bot, Cpu, RefreshCw, Sparkles } from 'lucide-react';
import { useDashboardInsights } from '../../hooks/useDashboardInsights';
import InsightCard from './InsightCard';

function InsightSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="flex gap-3 rounded-xl border border-white/5 p-4 animate-pulse">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/5 rounded bg-white/5" />
            <div className="h-2.5 w-4/5 rounded bg-white/5" />
            <div className="h-2.5 w-3/5 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InsightsSection() {
  const { data, loading, error, refetch } = useDashboardInsights();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card flex flex-col gap-4 p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-200">Phân tích tài chính AI</h3>
          {data && !loading && (
            <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-500">
              {data.source === 'ai' ? (
                <>
                  <Bot className="h-2.5 w-2.5" /> Gemini
                </>
              ) : (
                <>
                  <Cpu className="h-2.5 w-2.5" /> Quy tắc
                </>
              )}
            </span>
          )}
        </div>

        {!loading && (
          <button
            onClick={refetch}
            className="btn-icon h-7 w-7 text-gray-500 hover:text-gray-300"
            title="Làm mới phân tích"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {loading && <InsightSkeleton />}

      {!loading && error && (
        <div className="py-4 text-center">
          <p className="text-xs text-gray-500">{error}</p>
          <button onClick={refetch} className="mt-2 text-xs text-blue-400 hover:underline">
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {data.insights.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-500">
              Bắt đầu theo dõi chi tiêu để Zyra hiểu rõ hơn thói quen tài chính của bạn.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} index={index} />
              ))}
            </div>
          )}

          <p className="mt-1 text-right text-[10px] text-gray-600">
            Cập nhật: {new Date(data.generatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </>
      )}
    </motion.div>
  );
}
