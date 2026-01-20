import { useState } from 'react';
import { X, Target, TrendingUp } from 'lucide-react';
import { Goal } from '../../types';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

interface UpdateGoalModalProps {
  goal: Goal;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UpdateGoalModal({ goal, onClose, onSuccess }: UpdateGoalModalProps) {
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    progress: goal.progress,
    status: goal.status,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data, error } = await api.updateGoal(goal.id, formData);
      if (data) {
        success('Goal Updated', 'Your progress has been saved');
        onSuccess();
      } else if (error) {
        showError('Failed to update goal', error);
      }
    } catch (err) {
      showError('Error', 'Failed to update goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkComplete = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await api.updateGoal(goal.id, { progress: 100, status: 'completed' });
      if (data) {
        success('Goal Completed!', 'Congratulations on achieving your goal');
        onSuccess();
      } else if (error) {
        showError('Failed to complete goal', error);
      }
    } catch (err) {
      showError('Error', 'Failed to complete goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Update Progress</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Goal Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-primary-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">{goal.title}</h3>
                {goal.description && (
                  <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Due: {new Date(goal.target_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Progress</label>
              <span className="text-lg font-bold text-primary-600">{formData.progress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Progress Bar Preview */}
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                formData.progress >= 80 ? 'bg-green-500' :
                formData.progress >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${formData.progress}%` }}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {[25, 50, 75, 100].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData({ ...formData, progress: value })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.progress === value
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {value}%
              </button>
            ))}
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
              {isSubmitting ? 'Saving...' : 'Save Progress'}
            </button>
          </div>

          {/* Mark Complete */}
          {formData.progress < 100 && (
            <button
              type="button"
              onClick={handleMarkComplete}
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Mark as Complete
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
