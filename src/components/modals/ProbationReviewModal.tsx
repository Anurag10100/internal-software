import { useState } from 'react';
import { X, Star, CheckCircle, Clock, AlertTriangle, Calendar, MessageSquare } from 'lucide-react';
import { Probation, ProbationReview, ProbationChecklist } from '../../types';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

interface ProbationReviewModalProps {
  probation: Probation;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProbationReviewModal({ probation, onClose, onSuccess }: ProbationReviewModalProps) {
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'reviews' | 'action'>('overview');
  const [checklists, setChecklists] = useState<ProbationChecklist[]>(probation.checklists || []);
  const [reviews, setReviews] = useState<ProbationReview[]>(probation.reviews || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review form
  const [reviewForm, setReviewForm] = useState({
    milestone: '30-day',
    rating: 3,
    feedback: '',
    recommendation: 'continue',
  });

  // Action form (extend/confirm/terminate)
  const [actionForm, setActionForm] = useState({
    action: 'confirm',
    extended_till: '',
    extension_reason: '',
    notes: '',
  });

  const getDaysRemaining = () => {
    const end = new Date(probation.end_date);
    const today = new Date();
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleChecklistToggle = async (item: ProbationChecklist) => {
    try {
      const { data } = await api.updateChecklistItem(probation.id, item.id, !item.is_completed);
      if (data) {
        setChecklists(prev =>
          prev.map(c => c.id === item.id ? { ...c, is_completed: !c.is_completed } : c)
        );
      }
    } catch (err) {
      showError('Error', 'Failed to update checklist');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data, error } = await api.addProbationReview(probation.id, reviewForm);
      if (data) {
        success('Review Added', 'Probation review has been recorded');
        setReviews(prev => [data, ...prev]);
        setReviewForm({ milestone: '30-day', rating: 3, feedback: '', recommendation: 'continue' });
      } else if (error) {
        showError('Failed to add review', error);
      }
    } catch (err) {
      showError('Error', 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let updateData: any = {};

      if (actionForm.action === 'confirm') {
        updateData = {
          status: 'confirmed',
          confirmed_by: 'current-user',
          confirmed_at: new Date().toISOString(),
          notes: actionForm.notes,
        };
      } else if (actionForm.action === 'extend') {
        updateData = {
          status: 'extended',
          extended_till: actionForm.extended_till,
          extension_reason: actionForm.extension_reason,
          notes: actionForm.notes,
        };
      } else if (actionForm.action === 'terminate') {
        updateData = {
          status: 'terminated',
          notes: actionForm.notes,
        };
      }

      const { data, error } = await api.updateProbation(probation.id, updateData);
      if (data) {
        success('Action Completed', `Probation has been ${actionForm.action}ed`);
        onSuccess();
      } else if (error) {
        showError('Failed to update probation', error);
      }
    } catch (err) {
      showError('Error', 'Failed to process action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysRemaining = getDaysRemaining();
  const progress = Math.min(100, Math.max(0, ((probation.duration_days - daysRemaining) / probation.duration_days) * 100));
  const completedItems = checklists.filter(c => c.is_completed).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-semibold">
                {probation.user_name?.charAt(0) || '?'}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{probation.user_name}</h2>
              <p className="text-sm text-gray-500">{probation.department} • {probation.designation}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {['overview', 'checklist', 'reviews', 'action'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Progress Card */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Probation Progress</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    probation.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                    probation.status === 'extended' ? 'bg-yellow-100 text-yellow-700' :
                    probation.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {probation.status.charAt(0).toUpperCase() + probation.status.slice(1)}
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      progress >= 80 ? 'bg-red-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Day {Math.round((probation.duration_days * progress) / 100)} of {probation.duration_days}</span>
                  <span className={`font-medium ${daysRemaining <= 14 ? 'text-red-600' : 'text-gray-700'}`}>
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Period ended'}
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Start Date
                  </div>
                  <p className="font-medium">{new Date(probation.start_date).toLocaleDateString()}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    End Date
                  </div>
                  <p className="font-medium">{new Date(probation.end_date).toLocaleDateString()}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <CheckCircle className="w-4 h-4" />
                    Checklist
                  </div>
                  <p className="font-medium">{completedItems} / {checklists.length} completed</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <MessageSquare className="w-4 h-4" />
                    Reviews
                  </div>
                  <p className="font-medium">{reviews.length} review(s)</p>
                </div>
              </div>

              {/* Notes */}
              {probation.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">{probation.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <div className="space-y-2">
              {checklists.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    item.is_completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleChecklistToggle(item)}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    item.is_completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  }`}>
                    {item.is_completed && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className={item.is_completed ? 'text-green-700 line-through' : 'text-gray-700'}>
                    {item.item}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {/* Add Review Form */}
              <form onSubmit={handleSubmitReview} className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="font-medium text-gray-900">Add Review</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Milestone</label>
                    <select
                      value={reviewForm.milestone}
                      onChange={(e) => setReviewForm({ ...reviewForm, milestone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="30-day">30-Day Review</option>
                      <option value="60-day">60-Day Review</option>
                      <option value="90-day">90-Day Review</option>
                      <option value="final">Final Review</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          className="p-1"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Feedback</label>
                  <textarea
                    value={reviewForm.feedback}
                    onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Provide feedback on employee's performance..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Recommendation</label>
                  <select
                    value={reviewForm.recommendation}
                    onChange={(e) => setReviewForm({ ...reviewForm, recommendation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="continue">Continue Probation</option>
                    <option value="confirm">Recommend Confirmation</option>
                    <option value="extend">Recommend Extension</option>
                    <option value="terminate">Recommend Termination</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>

              {/* Review History */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Review History</h3>
                {reviews.length === 0 ? (
                  <p className="text-gray-500 text-sm">No reviews yet</p>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{review.milestone}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{review.feedback}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>By {review.reviewer_name}</span>
                        <span>{new Date(review.review_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Action Tab */}
          {activeTab === 'action' && probation.status === 'ongoing' && (
            <form onSubmit={handleAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'confirm', label: 'Confirm', icon: CheckCircle, color: 'green' },
                    { value: 'extend', label: 'Extend', icon: Clock, color: 'yellow' },
                    { value: 'terminate', label: 'Terminate', icon: AlertTriangle, color: 'red' },
                  ].map((action) => (
                    <button
                      key={action.value}
                      type="button"
                      onClick={() => setActionForm({ ...actionForm, action: action.value })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        actionForm.action === action.value
                          ? `border-${action.color}-500 bg-${action.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <action.icon className={`w-6 h-6 mx-auto mb-1 text-${action.color}-600`} />
                      <span className="text-sm font-medium">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {actionForm.action === 'extend' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Extend Till</label>
                    <input
                      type="date"
                      value={actionForm.extended_till}
                      onChange={(e) => setActionForm({ ...actionForm, extended_till: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Extension Reason</label>
                    <textarea
                      value={actionForm.extension_reason}
                      onChange={(e) => setActionForm({ ...actionForm, extension_reason: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={actionForm.notes}
                  onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Additional notes..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full px-4 py-2 rounded-lg text-white font-medium ${
                  actionForm.action === 'confirm' ? 'bg-green-600 hover:bg-green-700' :
                  actionForm.action === 'extend' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {isSubmitting ? 'Processing...' : `${actionForm.action.charAt(0).toUpperCase() + actionForm.action.slice(1)} Employee`}
              </button>
            </form>
          )}

          {activeTab === 'action' && probation.status !== 'ongoing' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">This probation has already been {probation.status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
