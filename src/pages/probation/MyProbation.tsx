import { useState, useEffect } from 'react';
import { Clock, CheckCircle, Calendar, FileText, Star, AlertCircle } from 'lucide-react';
import { Probation } from '../../types';
import api from '../../services/api';

export default function MyProbation() {
  const [probation, setProbation] = useState<Probation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMyProbation();
  }, []);

  const loadMyProbation = async () => {
    try {
      const { data } = await api.getMyProbation();
      setProbation(data);
    } catch (err) {
      console.error('Failed to load probation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-48 bg-gray-200 rounded-xl"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!probation) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Active Probation</h1>
          <p className="text-gray-500">
            You are not currently on probation or your probation has been completed.
          </p>
        </div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(probation.end_date);
  const progress = Math.min(100, Math.max(0, ((probation.duration_days - daysRemaining) / probation.duration_days) * 100));
  const checklists = probation.checklists || [];
  const reviews = probation.reviews || [];
  const completedItems = checklists.filter(c => c.is_completed).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Probation Status</h1>
        <p className="text-gray-500 mt-1">Track your probation period progress</p>
      </div>

      {/* Main Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              probation.status === 'ongoing' ? 'bg-blue-100' :
              probation.status === 'confirmed' ? 'bg-green-100' :
              probation.status === 'extended' ? 'bg-yellow-100' :
              'bg-red-100'
            }`}>
              <Clock className={`w-8 h-8 ${
                probation.status === 'ongoing' ? 'text-blue-600' :
                probation.status === 'confirmed' ? 'text-green-600' :
                probation.status === 'extended' ? 'text-yellow-600' :
                'text-red-600'
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {probation.status === 'ongoing' ? 'Probation In Progress' :
                 probation.status === 'confirmed' ? 'Probation Completed!' :
                 probation.status === 'extended' ? 'Probation Extended' :
                 'Probation Ended'}
              </h2>
              <p className="text-gray-500">
                {probation.duration_days} day probation period
              </p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            probation.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
            probation.status === 'confirmed' ? 'bg-green-100 text-green-700' :
            probation.status === 'extended' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {probation.status.charAt(0).toUpperCase() + probation.status.slice(1)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium text-gray-900">{Math.round(progress)}%</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress >= 80 ? 'bg-red-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Start Date</p>
            <p className="font-semibold">{new Date(probation.start_date).toLocaleDateString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">End Date</p>
            <p className="font-semibold">{new Date(probation.end_date).toLocaleDateString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Days Remaining</p>
            <p className={`font-semibold ${daysRemaining <= 14 ? 'text-red-600' : ''}`}>
              {daysRemaining > 0 ? daysRemaining : 'Ended'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Tasks Done</p>
            <p className="font-semibold">{completedItems}/{checklists.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Onboarding Checklist</h3>
          <div className="space-y-3">
            {checklists.length === 0 ? (
              <p className="text-gray-500 text-sm">No checklist items</p>
            ) : (
              checklists.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    item.is_completed ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    item.is_completed ? 'bg-green-500' : 'border-2 border-gray-300'
                  }`}>
                    {item.is_completed && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className={item.is_completed ? 'text-green-700 line-through' : 'text-gray-700'}>
                    {item.item}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Reviews</h3>
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500 text-sm">No reviews yet</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-primary-600">{review.milestone}</span>
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
      </div>

      {/* Tips */}
      {probation.status === 'ongoing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Tips for Success</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Complete all onboarding tasks on time</li>
                <li>• Ask questions and seek feedback regularly</li>
                <li>• Document your achievements and contributions</li>
                <li>• Build relationships with your team members</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
