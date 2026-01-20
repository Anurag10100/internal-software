import { useState, useEffect } from 'react';
import { ClipboardList, Star, Clock, CheckCircle, ChevronRight, FileText } from 'lucide-react';
import { Appraisal } from '../../types';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import SelfReviewModal from '../../components/modals/SelfReviewModal';

export default function MyAppraisals() {
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const { error: showError } = useToast();

  useEffect(() => {
    loadAppraisals();
  }, []);

  const loadAppraisals = async () => {
    try {
      const { data, error } = await api.getMyAppraisals();
      if (data) {
        setAppraisals(data);
      } else if (error) {
        showError('Failed to load appraisals', error);
      }
    } catch (err) {
      showError('Error', 'Failed to load appraisal data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700';
      case 'self_review': return 'bg-blue-100 text-blue-700';
      case 'manager_review': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Self-Review';
      case 'self_review': return 'Awaiting Manager Review';
      case 'manager_review': return 'In Manager Review';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const handleOpenReview = (appraisal: Appraisal) => {
    setSelectedAppraisal(appraisal);
    setShowReviewModal(true);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pendingAppraisals = appraisals.filter(a => a.status === 'pending');
  const inProgressAppraisals = appraisals.filter(a => a.status === 'self_review' || a.status === 'manager_review');
  const completedAppraisals = appraisals.filter(a => a.status === 'completed');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Appraisals</h1>
        <p className="text-gray-500 mt-1">View and complete your performance appraisals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{pendingAppraisals.length}</p>
              <p className="text-sm text-gray-500">Pending Action</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{inProgressAppraisals.length}</p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{completedAppraisals.length}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Appraisals */}
      {pendingAppraisals.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">Action Required</h2>
          <div className="space-y-3">
            {pendingAppraisals.map((appraisal) => (
              <div
                key={appraisal.id}
                className="bg-white rounded-lg p-4 border border-yellow-200 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleOpenReview(appraisal)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{appraisal.cycle_name}</h3>
                    <p className="text-sm text-gray-500">{appraisal.cycle_type} Review</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-yellow-700 font-medium">Submit Self-Review</span>
                    <ChevronRight className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Appraisals List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Appraisals</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {appraisals.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No appraisals found</p>
            </div>
          ) : (
            appraisals.map((appraisal) => (
              <div
                key={appraisal.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleOpenReview(appraisal)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <ClipboardList className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{appraisal.cycle_name}</h3>
                      <p className="text-sm text-gray-500">
                        {appraisal.cycle_type} • Manager: {appraisal.manager_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {appraisal.final_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{appraisal.final_rating.toFixed(1)}</span>
                      </div>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appraisal.status)}`}>
                      {getStatusLabel(appraisal.status)}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Self Review Modal */}
      {showReviewModal && selectedAppraisal && (
        <SelfReviewModal
          appraisal={selectedAppraisal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedAppraisal(null);
          }}
          onSuccess={() => {
            setShowReviewModal(false);
            setSelectedAppraisal(null);
            loadAppraisals();
          }}
        />
      )}
    </div>
  );
}
