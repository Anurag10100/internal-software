import { useState } from 'react';
import { X, AlertTriangle, Users, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';

interface CreatePIPModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePIPModal({ onClose, onSuccess }: CreatePIPModalProps) {
  const { users } = useApp();
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    goals: [''],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id || !formData.start_date || !formData.end_date || !formData.reason) {
      showError('Validation Error', 'Please fill in all required fields');
      return;
    }

    const validGoals = formData.goals.filter(g => g.trim() !== '');
    if (validGoals.length === 0) {
      showError('Validation Error', 'Please add at least one improvement goal');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await api.createPIP({
        ...formData,
        goals: validGoals,
      });

      if (data) {
        success('PIP Created', 'Performance Improvement Plan has been created');
        onSuccess();
      } else if (error) {
        showError('Failed to create PIP', error);
      }
    } catch (err) {
      showError('Error', 'Failed to create PIP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addGoal = () => {
    setFormData({ ...formData, goals: [...formData.goals, ''] });
  };

  const removeGoal = (index: number) => {
    const newGoals = formData.goals.filter((_, i) => i !== index);
    setFormData({ ...formData, goals: newGoals.length > 0 ? newGoals : [''] });
  };

  const updateGoal = (index: number, value: string) => {
    const newGoals = [...formData.goals];
    newGoals[index] = value;
    setFormData({ ...formData, goals: newGoals });
  };

  const employees = users.filter(u => u.role !== 'admin');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="sticky top-0 relative p-6 pb-4 bg-white rounded-t-2xl z-10">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-t-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create PIP</h2>
                <p className="text-amber-100 text-sm">Performance Improvement Plan</p>
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
              Employee *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-gray-50"
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

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-gray-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-gray-50"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for PIP *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-gray-50 resize-none"
              placeholder="Describe the performance concerns..."
              required
            />
          </div>

          {/* Improvement Goals */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Improvement Goals *
              </label>
              <button
                type="button"
                onClick={addGoal}
                className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Goal
              </button>
            </div>
            <div className="space-y-2">
              {formData.goals.map((goal, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => updateGoal(index, e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-gray-50"
                    placeholder={`Goal ${index + 1}...`}
                  />
                  {formData.goals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGoal(index)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Warning Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Important Notice</p>
                <p>PIPs are serious performance measures. Ensure all documentation is accurate and the employee has been notified.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
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
              className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:shadow-lg hover:shadow-amber-200 disabled:opacity-50 font-medium transition-all duration-300"
            >
              {isSubmitting ? 'Creating...' : 'Create PIP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
