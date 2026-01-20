import { useState } from 'react';
import { X, Target, TrendingUp } from 'lucide-react';
import { KPI } from '../../types';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

interface UpdateKPIModalProps {
  kpi: KPI;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UpdateKPIModal({ kpi, onClose, onSuccess }: UpdateKPIModalProps) {
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentValue, setCurrentValue] = useState(kpi.current_value);

  const getProgressPercent = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Determine status based on progress
    const progress = getProgressPercent(currentValue, kpi.target_value);
    let status = 'on_track';
    if (progress >= 100) status = 'achieved';
    else if (progress >= 80) status = 'on_track';
    else if (progress >= 50) status = 'at_risk';
    else status = 'behind';

    try {
      const { data, error } = await api.updateKPI(kpi.id, {
        current_value: currentValue,
        status,
      });
      if (data) {
        success('KPI Updated', 'Your progress has been recorded');
        onSuccess();
      } else if (error) {
        showError('Failed to update KPI', error);
      }
    } catch (err) {
      showError('Error', 'Failed to update KPI');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = getProgressPercent(currentValue, kpi.target_value);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Update KPI Progress</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* KPI Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-primary-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">{kpi.title}</h3>
                {kpi.description && (
                  <p className="text-sm text-gray-500 mt-1">{kpi.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>Target: {kpi.target_value} {kpi.unit}</span>
                  <span>Period: {kpi.period}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Value Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Value
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(parseFloat(e.target.value) || 0)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                step="0.1"
                min="0"
              />
              <span className="text-gray-500 font-medium">{kpi.unit}</span>
            </div>
          </div>

          {/* Progress Preview */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Progress</span>
              <span className={`font-bold ${
                progress >= 100 ? 'text-green-600' :
                progress >= 80 ? 'text-blue-600' :
                progress >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {progress}%
              </span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress >= 100 ? 'bg-green-500' :
                  progress >= 80 ? 'bg-blue-500' :
                  progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span>
              <span>{kpi.target_value} {kpi.unit}</span>
            </div>
          </div>

          {/* Quick Value Buttons */}
          <div className="flex gap-2">
            {[25, 50, 75, 100].map((percent) => {
              const value = Math.round((kpi.target_value * percent) / 100 * 10) / 10;
              return (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setCurrentValue(value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentValue === value
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {percent}%
                </button>
              );
            })}
          </div>

          {/* Status Preview */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Status will be:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              progress >= 100 ? 'bg-green-100 text-green-700' :
              progress >= 80 ? 'bg-blue-100 text-blue-700' :
              progress >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
            }`}>
              {progress >= 100 ? 'Achieved' :
               progress >= 80 ? 'On Track' :
               progress >= 50 ? 'At Risk' : 'Behind'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Update Progress'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
