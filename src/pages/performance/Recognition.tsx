import { useState, useEffect } from 'react';
import { Award, Star, Heart, Zap, Users, Lightbulb, Plus, Send } from 'lucide-react';
import { Recognition as RecognitionType } from '../../types';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';

const badgeConfig = {
  star_performer: { icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Star Performer' },
  team_player: { icon: Users, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Team Player' },
  innovator: { icon: Lightbulb, color: 'text-purple-500', bg: 'bg-purple-100', label: 'Innovator' },
  helping_hand: { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-100', label: 'Helping Hand' },
  quick_learner: { icon: Zap, color: 'text-orange-500', bg: 'bg-orange-100', label: 'Quick Learner' },
};

export default function Recognition() {
  const { users, currentUser } = useApp();
  const [recognitions, setRecognitions] = useState<RecognitionType[]>([]);
  const [myRecognitions, setMyRecognitions] = useState<RecognitionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGiveModal, setShowGiveModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error: showError } = useToast();

  const [formData, setFormData] = useState({
    recipient_id: '',
    type: 'appreciation',
    badge: 'star_performer',
    title: '',
    message: '',
  });

  useEffect(() => {
    loadRecognitions();
  }, []);

  const loadRecognitions = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        api.getAllRecognitions(),
        api.getMyRecognitions(),
      ]);

      if (allRes.data) {
        setRecognitions(allRes.data);
      }
      if (myRes.data) {
        setMyRecognitions(myRes.data);
      }
    } catch (err) {
      showError('Error', 'Failed to load recognitions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipient_id || !formData.title || !formData.message) {
      showError('Validation Error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await api.createRecognition(formData);
      if (data) {
        success('Recognition Sent!', 'Your appreciation has been shared');
        setRecognitions(prev => [data, ...prev]);
        setShowGiveModal(false);
        setFormData({
          recipient_id: '',
          type: 'appreciation',
          badge: 'star_performer',
          title: '',
          message: '',
        });
      } else if (error) {
        showError('Failed to send recognition', error);
      }
    } catch (err) {
      showError('Error', 'Failed to send recognition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recognition Wall</h1>
          <p className="text-gray-500 mt-1">Celebrate achievements and appreciate your colleagues</p>
        </div>
        <button
          onClick={() => setShowGiveModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Give Recognition
        </button>
      </div>

      {/* My Recognitions */}
      {myRecognitions.length > 0 && (
        <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-6 border border-primary-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Recognitions</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {myRecognitions.slice(0, 5).map((rec) => {
              const badge = badgeConfig[rec.badge as keyof typeof badgeConfig] || badgeConfig.star_performer;
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={rec.id}
                  className="flex-shrink-0 bg-white rounded-lg p-4 shadow-sm border border-gray-100 w-64"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${badge.bg}`}>
                      <BadgeIcon className={`w-5 h-5 ${badge.color}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{badge.label}</span>
                  </div>
                  <p className="font-medium text-gray-900 mb-1">{rec.title}</p>
                  <p className="text-sm text-gray-500">From {rec.nominator_name}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recognition Wall */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recognitions.length === 0 ? (
          <div className="col-span-3 bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recognitions Yet</h3>
            <p className="text-gray-500 mb-4">Be the first to appreciate a colleague!</p>
            <button
              onClick={() => setShowGiveModal(true)}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Give Recognition
            </button>
          </div>
        ) : (
          recognitions.map((rec) => {
            const badge = badgeConfig[rec.badge as keyof typeof badgeConfig] || badgeConfig.star_performer;
            const BadgeIcon = badge.icon;
            return (
              <div
                key={rec.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-3 rounded-xl ${badge.bg}`}>
                    <BadgeIcon className={`w-6 h-6 ${badge.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-gray-400">{getTimeAgo(rec.created_at)}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-1">{rec.title}</h3>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4">{rec.message}</p>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-semibold text-sm">
                        {rec.recipient_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{rec.recipient_name}</p>
                      <p className="text-xs text-gray-500">{rec.recipient_department}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">From {rec.nominator_name}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Give Recognition Modal */}
      {showGiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Give Recognition</h2>
              </div>
              <button
                onClick={() => setShowGiveModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Recipient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recognize <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.recipient_id}
                  onChange={(e) => setFormData({ ...formData, recipient_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select a colleague</option>
                  {users.filter(u => u.id !== currentUser?.id).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Badge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Badge</label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(badgeConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, badge: key })}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          formData.badge === key
                            ? `${config.bg} border-primary-500`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={config.label}
                      >
                        <Icon className={`w-6 h-6 mx-auto ${config.color}`} />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {badgeConfig[formData.badge as keyof typeof badgeConfig]?.label}
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Amazing teamwork on the project!"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Share why you're recognizing this person..."
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGiveModal(false)}
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
                  {isSubmitting ? 'Sending...' : 'Send Recognition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
