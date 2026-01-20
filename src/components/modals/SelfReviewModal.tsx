import { useState } from 'react';
import { X, Star, Send } from 'lucide-react';
import { Appraisal } from '../../types';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

interface SelfReviewModalProps {
  appraisal: Appraisal;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SelfReviewModal({ appraisal, onClose, onSuccess }: SelfReviewModalProps) {
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    self_rating: appraisal.self_rating || 3,
    self_comments: appraisal.self_comments || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.self_comments.trim()) {
      showError('Validation Error', 'Please provide your self-assessment comments');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await api.submitSelfReview(appraisal.id, formData);
      if (data) {
        success('Review Submitted', 'Your self-review has been submitted for manager review');
        onSuccess();
      } else if (error) {
        showError('Failed to submit review', error);
      }
    } catch (err) {
      showError('Error', 'Failed to submit self-review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditable = appraisal.status === 'pending';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{appraisal.cycle_name}</h2>
            <p className="text-sm text-gray-500">{appraisal.cycle_type} Performance Review</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Status Banner */}
          {!isEditable && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                {appraisal.status === 'self_review' && 'Your self-review has been submitted. Awaiting manager review.'}
                {appraisal.status === 'completed' && 'This appraisal has been completed.'}
              </p>
            </div>
          )}

          {/* Review Period */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              <strong>Review Period:</strong> {appraisal.cycle_start ? new Date(appraisal.cycle_start).toLocaleDateString() : 'N/A'} - {appraisal.cycle_end ? new Date(appraisal.cycle_end).toLocaleDateString() : 'N/A'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Manager:</strong> {appraisal.manager_name}
            </p>
          </div>

          {/* Self Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Self Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => isEditable && setFormData({ ...formData, self_rating: star })}
                  disabled={!isEditable}
                  className="p-1 disabled:cursor-not-allowed"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= formData.self_rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-lg font-semibold text-gray-700">
                {formData.self_rating}/5
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Rate your overall performance during this review period
            </p>
          </div>

          {/* Self Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Self Assessment <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.self_comments}
              onChange={(e) => setFormData({ ...formData, self_comments: e.target.value })}
              rows={6}
              disabled={!isEditable}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="Describe your key achievements, challenges faced, and areas for improvement..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Include specific examples of your accomplishments and growth areas
            </p>
          </div>

          {/* Manager Review Section (if completed) */}
          {appraisal.status === 'completed' && appraisal.manager_rating && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="font-medium text-gray-900 mb-3">Manager's Review</h3>
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= (appraisal.manager_rating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 font-medium">{appraisal.manager_rating}/5</span>
              </div>
              {appraisal.manager_comments && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  {appraisal.manager_comments}
                </p>
              )}
              {appraisal.final_rating && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Final Rating:</span>
                  <span className="text-lg font-bold text-primary-600">{appraisal.final_rating.toFixed(1)}/5</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {isEditable && (
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
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
