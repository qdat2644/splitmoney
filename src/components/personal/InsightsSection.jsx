// InsightsSection.jsx — Full insights panel for PersonalDashboard
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, Bot, Cpu } from 'lucide-react';
import { useDashboardInsights } from '../../hooks/useDashboardInsights';
import InsightCard from './InsightCard';

// Loading skeleton rows
function InsightSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3 p-4 rounded-xl border border-white/5 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-white/5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/5 rounded w-2/5" />
            <div className="h-2.5 bg-white/5 rounded w-4/5" />
            <div className="h-2.5 bg-white/5 rounded w-3/5" />
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
      className="glass-card p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-200">Phân tích tài chính AI</h3>
          {/* Source badge */}
          {data && !loading && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500">
              {data.source === 'ai'
                ? <><Bot className="w-2.5 h-2.5" /> Gemini</>
                : <><Cpu className="w-2.5 h-2.5" /> Quy tắc</>
              }
            </span>
          )}
        </div>

        {/* Retry button */}
        {!loading && (
          <button
            onClick={refetch}
            className="btn-icon w-7 h-7 text-gray-500 hover:text-gray-300"
            title="Làm mới phân tích"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading && <InsightSkeleton />}

      {!loading && error && (
        <div className="text-center py-4">
          <p className="text-xs text-gray-500">{error}</p>
          <button onClick={refetch} className="text-xs text-blue-400 mt-2 hover:underline">
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {data.insights.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">
              Chưa đủ dữ liệu để tạo phân tích tài chính.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} index={i} />
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className="text-[10px] text-gray-600 text-right mt-1">
            Cập nhật: {new Date(data.generatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </>
      )}
    </motion.div>
  );
}
