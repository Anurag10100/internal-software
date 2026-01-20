import { useState, useEffect } from 'react';
import { Target, Plus, TrendingUp, CheckCircle, Clock, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Goal } from '../../types';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import CreateGoalModal from '../../components/modals/CreateGoalModal';
import UpdateGoalModal from '../../components/modals/UpdateGoalModal';

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const { data, error } = await api.getMyGoals();
      if (data) {
        setGoals(data);
      } else if (error) {
        showError('Failed to load goals', error);
      }
    } catch (err) {
      showError('Error', 'Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await api.deleteGoal(goalId);
      setGoals(prev => prev.filter(g => g.id !== goalId));
      success('Goal Deleted', 'Goal has been removed');
    } catch (err) {
      showError('Error', 'Failed to delete goal');
    }
    setActiveMenu(null);
  };

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowUpdateModal(true);
    setActiveMenu(null);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'performance': return 'bg-blue-100 text-blue-700';
      case 'learning': return 'bg-purple-100 text-purple-700';
      case 'project': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const avgProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Goals</h1>
          <p className="text-gray-500 mt-1">Track and manage your performance goals</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
              <p className="text-sm text-gray-500">Total Goals</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{activeGoals.length}</p>
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
              <p className="text-2xl font-bold text-green-600">{completedGoals.length}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600">{avgProgress}%</p>
              <p className="text-sm text-gray-500">Avg Progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Goals</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {activeGoals.length === 0 ? (
            <div className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No active goals</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-3 text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                Create your first goal
              </button>
            </div>
          ) : (
            activeGoals.map((goal) => (
              <div key={goal.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{goal.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(goal.category)}`}>
                        {goal.category}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-gray-500 mb-2">{goal.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Due: {new Date(goal.target_date).toLocaleDateString()}</span>
                      {goal.weightage > 0 && <span>Weight: {goal.weightage}%</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium">{goal.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getProgressColor(goal.progress)}`}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === goal.id ? null : goal.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                      {activeMenu === goal.id && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-36">
                          <button
                            onClick={() => handleEditGoal(goal)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" /> Update Progress
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Completed Goals</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {completedGoals.map((goal) => (
              <div key={goal.id} className="p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <h3 className="font-medium text-gray-700">{goal.title}</h3>
                      <p className="text-sm text-gray-500">{goal.category}</p>
                    </div>
                  </div>
                  <span className="text-green-600 font-medium">100%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateGoalModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadGoals();
          }}
        />
      )}

      {showUpdateModal && selectedGoal && (
        <UpdateGoalModal
          goal={selectedGoal}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedGoal(null);
          }}
          onSuccess={() => {
            setShowUpdateModal(false);
            setSelectedGoal(null);
            loadGoals();
          }}
        />
      )}
    </div>
  );
}
