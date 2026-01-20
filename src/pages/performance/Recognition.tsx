import { useState, useEffect } from 'react';
import { Award, Star, Heart, Zap, Users, Lightbulb, Send, Sparkles, PartyPopper, X } from 'lucide-react';
import { Recognition as RecognitionType } from '../../types';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';

const badgeConfig = {
  star_performer: {
    icon: Star,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    gradient: 'from-amber-400 to-orange-500',
    shadowColor: 'shadow-amber-200',
    label: 'Star Performer'
  },
  team_player: {
    icon: Users,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    gradient: 'from-blue-400 to-indigo-500',
    shadowColor: 'shadow-blue-200',
    label: 'Team Player'
  },
  innovator: {
    icon: Lightbulb,
    color: 'text-violet-500',
    bg: 'bg-violet-50',
    gradient: 'from-violet-400 to-purple-500',
    shadowColor: 'shadow-violet-200',
    label: 'Innovator'
  },
  helping_hand: {
    icon: Heart,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    gradient: 'from-rose-400 to-pink-500',
    shadowColor: 'shadow-rose-200',
    label: 'Helping Hand'
  },
  quick_learner: {
    icon: Zap,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    gradient: 'from-emerald-400 to-teal-500',
    shadowColor: 'shadow-emerald-200',
    label: 'Quick Learner'
  },
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
      <div className="p-6 min-h-screen bg-gradient-to-br from-rose-50/30 via-white to-violet-50/30">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-white/60 rounded-xl w-1/3"></div>
          <div className="h-32 bg-white/60 rounded-2xl"></div>
          <div className="grid grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-56 bg-white/60 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-rose-50/30 via-white to-violet-50/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl shadow-lg shadow-rose-200">
            <Award className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recognition Wall</h1>
            <p className="text-gray-500">Celebrate achievements and appreciate your colleagues</p>
          </div>
        </div>
        <button
          onClick={() => setShowGiveModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-rose-200 transition-all duration-300 font-medium"
        >
          <Sparkles className="w-4 h-4" />
          Give Recognition
        </button>
      </div>

      {/* My Recognitions */}
      {myRecognitions.length > 0 && (
        <div className="mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-rose-400/10 to-violet-400/10 rounded-2xl" />
          <div className="relative bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <PartyPopper className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">Your Achievements</h2>
              <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                {myRecognitions.length} received
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
              {myRecognitions.slice(0, 5).map((rec) => {
                const badge = badgeConfig[rec.badge as keyof typeof badgeConfig] || badgeConfig.star_performer;
                const BadgeIcon = badge.icon;
                return (
                  <div
                    key={rec.id}
                    className="flex-shrink-0 bg-white rounded-xl p-4 shadow-sm border border-gray-100 w-72 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${badge.gradient} shadow-lg ${badge.shadowColor}`}>
                        <BadgeIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-900">{badge.label}</span>
                        <p className="text-xs text-gray-500">From {rec.nominator_name}</p>
                      </div>
                    </div>
                    <p className="font-medium text-gray-800 line-clamp-2">{rec.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recognition Wall */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {recognitions.length === 0 ? (
          <div className="col-span-3 bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-violet-100 rounded-full flex items-center justify-center">
              <Award className="w-10 h-10 text-rose-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Recognitions Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Be the first to spread positivity! Recognize a colleague for their great work.
            </p>
            <button
              onClick={() => setShowGiveModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-rose-200 transition-all duration-300 font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Give Your First Recognition
            </button>
          </div>
        ) : (
          recognitions.map((rec, index) => {
            const badge = badgeConfig[rec.badge as keyof typeof badgeConfig] || badgeConfig.star_performer;
            const BadgeIcon = badge.icon;
            return (
              <div
                key={rec.id}
                className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-gray-100/50 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Badge Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${badge.gradient} shadow-lg ${badge.shadowColor} group-hover:scale-110 transition-transform duration-300`}>
                      <BadgeIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.bg} ${badge.color}`}>
                        {badge.label}
                      </span>
                      <h3 className="font-semibold text-gray-900 mt-1.5 leading-tight">{rec.title}</h3>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{getTimeAgo(rec.created_at)}</span>
                </div>

                {/* Message */}
                <p className="text-gray-600 text-sm mb-5 leading-relaxed">{rec.message}</p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${badge.gradient} flex items-center justify-center shadow-md ${badge.shadowColor}`}>
                      <span className="text-white font-bold text-sm">
                        {rec.recipient_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{rec.recipient_name}</p>
                      <p className="text-xs text-gray-500">{rec.recipient_department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Recognized by</p>
                    <p className="text-xs font-medium text-gray-600">{rec.nominator_name}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Give Recognition Modal */}
      {showGiveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="relative p-6 pb-4">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-rose-500 to-pink-600 rounded-t-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Give Recognition</h2>
                    <p className="text-rose-100 text-sm">Appreciate a colleague</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGiveModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-5">
              {/* Recipient */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Who do you want to recognize?
                </label>
                <select
                  value={formData.recipient_id}
                  onChange={(e) => setFormData({ ...formData, recipient_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-gray-50 transition-colors"
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

              {/* Badge Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Choose a badge
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {Object.entries(badgeConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = formData.badge === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, badge: key })}
                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? `border-transparent bg-gradient-to-br ${config.gradient} shadow-lg ${config.shadowColor}`
                            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                        }`}
                        title={config.label}
                      >
                        <Icon className={`w-6 h-6 mx-auto ${isSelected ? 'text-white' : config.color}`} />
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${config.gradient}`} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">
                  {badgeConfig[formData.badge as keyof typeof badgeConfig]?.label}
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Recognition title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-gray-50 transition-colors"
                  placeholder="e.g., Amazing teamwork on the project!"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-gray-50 transition-colors resize-none"
                  placeholder="Share why you're recognizing this person..."
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGiveModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition-all duration-300"
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
