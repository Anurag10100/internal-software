import { useState } from 'react';
import { X, Target, Users } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';

interface CreateKPIModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateKPIModal({ onClose, onSuccess }: CreateKPIModalProps) {
  const { users } = useApp();
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    title: '',
    description: '',
    metric_type: 'number',
    target_value: '',
    unit: '',
    period: 'monthly',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id || !formData.title || !formData.target_value || !formData.unit) {
      showError('Validation Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await api.createKPI({
        ...formData,
        target_value: parseFloat(formData.target_value),
      });

      if (data) {
        success('KPI Created', 'KPI has been assigned successfully');
        onSuccess();
      } else if (error) {
        showError('Failed to create KPI', error);
      }
    } catch (err) {
      showError('Error', 'Failed to create KPI');
    } finally {
      setIsSubmitting(false);
    }
  };

  const employees = users.filter(u => u.role !== 'admin');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="relative p-6 pb-4">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-t-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create KPI</h2>
                <p className="text-blue-100 text-sm">Assign performance indicator</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Assign to Employee *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                required
              >
                <option value="">Select an employee</option>
                {employees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.department}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* KPI Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              KPI Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              placeholder="e.g., Monthly Sales Target"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 resize-none"
              placeholder="Describe the KPI objective..."
            />
          </div>

          {/* Metric Type and Target */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Metric Type *
              </label>
              <select
                value={formData.metric_type}
                onChange={(e) => setFormData({ ...formData, metric_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              >
                <option value="number">Number</option>
                <option value="percentage">Percentage</option>
                <option value="currency">Currency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Target Value *
              </label>
              <input
                type="number"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                placeholder="100"
                min="0"
                step="0.1"
                required
              />
            </div>
          </div>

          {/* Unit and Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Unit *
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                placeholder="e.g., %, points, $"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Period *
              </label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-200 disabled:opacity-50 font-medium transition-all duration-300"
            >
              {isSubmitting ? 'Creating...' : 'Create KPI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
