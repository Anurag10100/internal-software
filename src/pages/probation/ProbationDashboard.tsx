import { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, AlertTriangle, Calendar, ChevronRight, Plus } from 'lucide-react';
import { Probation } from '../../types';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import CreateProbationModal from '../../components/modals/CreateProbationModal';
import ProbationReviewModal from '../../components/modals/ProbationReviewModal';

export default function ProbationDashboard() {
  const [probations, setProbations] = useState<Probation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProbation, setSelectedProbation] = useState<Probation | null>(null);
  const { error: showError } = useToast();

  useEffect(() => {
    loadProbations();
  }, []);

  const loadProbations = async () => {
    try {
      const { data, error } = await api.getProbations();
      if (data) {
        setProbations(data);
      } else if (error) {
        showError('Failed to load probations', error);
      }
    } catch (err) {
      showError('Error', 'Failed to load probation data');
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'bg-blue-100 text-blue-700';
      case 'extended': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'terminated': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const stats = {
    total: probations.length,
    ongoing: probations.filter(p => p.status === 'ongoing').length,
    extended: probations.filter(p => p.status === 'extended').length,
    confirmed: probations.filter(p => p.status === 'confirmed').length,
    endingSoon: probations.filter(p => p.status === 'ongoing' && getDaysRemaining(p.end_date) <= 14).length,
  };

  const handleReview = (probation: Probation) => {
    setSelectedProbation(probation);
    setShowReviewModal(true);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Probation Management</h1>
          <p className="text-gray-500 mt-1">Track and manage employee probation periods</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Probation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.ongoing}</p>
              <p className="text-sm text-gray-500">Ongoing</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.extended}</p>
              <p className="text-sm text-gray-500">Extended</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              <p className="text-sm text-gray-500">Confirmed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Calendar className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.endingSoon}</p>
              <p className="text-sm text-gray-500">Ending Soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Probation List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Probations</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {probations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No probations found</p>
            </div>
          ) : (
            probations.map((probation) => {
              const daysRemaining = getDaysRemaining(probation.end_date);
              const progress = Math.min(100, Math.max(0, ((probation.duration_days - daysRemaining) / probation.duration_days) * 100));

              return (
                <div
                  key={probation.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleReview(probation)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-semibold">
                          {probation.user_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{probation.user_name}</h3>
                        <p className="text-sm text-gray-500">
                          {probation.department} • {probation.designation}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Duration</p>
                        <p className="font-medium">{probation.duration_days} days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Days Remaining</p>
                        <p className={`font-medium ${daysRemaining <= 14 ? 'text-red-600' : 'text-gray-900'}`}>
                          {daysRemaining > 0 ? daysRemaining : 'Ended'}
                        </p>
                      </div>
                      <div className="w-32">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progress >= 80 ? 'bg-red-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(probation.status)}`}>
                        {probation.status.charAt(0).toUpperCase() + probation.status.slice(1)}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateProbationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadProbations();
          }}
        />
      )}

      {showReviewModal && selectedProbation && (
        <ProbationReviewModal
          probation={selectedProbation}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedProbation(null);
          }}
          onSuccess={() => {
            setShowReviewModal(false);
            setSelectedProbation(null);
            loadProbations();
          }}
        />
      )}
    </div>
  );
}
