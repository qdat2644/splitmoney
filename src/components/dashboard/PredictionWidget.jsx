import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { getSpendingPredictions } from '../../services/ai/predictionService';
import { useApp } from '../../context/AppContext';

export default function PredictionWidget() {
  const { expenses } = useApp();

  const prediction = useMemo(() => getSpendingPredictions(expenses), [expenses]);

  return (
    <div className="glass-card p-5 mt-4 space-y-4 border border-purple-500/20 bg-gradient-to-br from-dark-800 to-dark-900">
      <h2 className="text-base font-semibold text-white flex items-center gap-2">
        <Activity className="w-4 h-4 text-purple-400" />
        AI Dự phóng chi tiêu
      </h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">TB mỗi ngày</p>
          <p className="text-lg font-bold text-gray-200">
            {prediction.dailyAverage.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Dự kiến cuối tháng</p>
          <p className="text-lg font-bold text-purple-400">
            {prediction.predictedTotal.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ
          </p>
        </div>
      </div>
      
      <div className="pt-2 border-t border-white/5">
        <p className="text-xs text-gray-500 mb-2">Dự kiến theo danh mục</p>
        <div className="space-y-1.5">
          {prediction.predictedCategories.sort((a, b) => b.predictedMonthTotal - a.predictedMonthTotal).slice(0, 3).map(cat => (
            <div key={cat.category} className="flex justify-between text-xs">
              <span className="text-gray-400 capitalize">{cat.category}</span>
              <span className="text-gray-300 font-medium">{cat.predictedMonthTotal.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
