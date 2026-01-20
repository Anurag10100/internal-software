import { useState } from 'react';
import { X, FileText, Users, ThumbsUp, AlertCircle, Eye } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';

interface CreateNoteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateNoteModal({ onClose, onSuccess }: CreateNoteModalProps) {
  const { users } = useApp();
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    type: 'observation',
    content: '',
    is_private: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id || !formData.content.trim()) {
      showError('Validation Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await api.createNote({
        ...formData,
        content: formData.content.trim(),
      });

      if (data) {
        success('Note Added', 'Performance note has been recorded');
        onSuccess();
      } else if (error) {
        showError('Failed to add note', error);
      }
    } catch (err) {
      showError('Error', 'Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const employees = users.filter(u => u.role !== 'admin');

  const noteTypes = [
    { id: 'praise', label: 'Praise', icon: ThumbsUp, color: 'emerald', description: 'Positive feedback or recognition' },
    { id: 'concern', label: 'Concern', icon: AlertCircle, color: 'red', description: 'Performance issues to address' },
    { id: 'observation', label: 'Observation', icon: Eye, color: 'blue', description: 'General performance note' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="relative p-6 pb-4">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-t-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Add Performance Note</h2>
                <p className="text-violet-100 text-sm">Record feedback or observation</p>
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
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-gray-50"
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

          {/* Note Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Note Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {noteTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.type === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.id })}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                      isSelected
                        ? type.color === 'emerald' ? 'border-emerald-500 bg-emerald-50' :
                          type.color === 'red' ? 'border-red-500 bg-red-50' :
                          'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${
                      isSelected
                        ? type.color === 'emerald' ? 'text-emerald-600' :
                          type.color === 'red' ? 'text-red-600' :
                          'text-blue-600'
                        : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      isSelected ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              {noteTypes.find(t => t.id === formData.type)?.description}
            </p>
          </div>

          {/* Note Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Note Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-gray-50 resize-none"
              placeholder="Describe the performance feedback or observation..."
              required
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">Private Note</p>
              <p className="text-sm text-gray-500">Only visible to managers and HR</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_private: !formData.is_private })}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                formData.is_private ? 'bg-violet-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  formData.is_private ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
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
              className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-200 disabled:opacity-50 font-medium transition-all duration-300"
            >
              {isSubmitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
