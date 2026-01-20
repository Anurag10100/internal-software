import { useState, useEffect } from 'react';
import { Target, Award, TrendingUp, AlertCircle, Users, Zap, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { KPI, PerformanceDashboardStats } from '../../types';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function PerformanceDashboard() {
  const [stats, setStats] = useState<PerformanceDashboardStats | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { error: showError } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardRes, kpisRes] = await Promise.all([
        api.getPerformanceDashboard(),
        api.getAllKPIs(),
      ]);

      if (dashboardRes.data) {
        setStats(dashboardRes.data);
      }
      if (kpisRes.data) {
        setKpis(kpisRes.data);
      }
    } catch (err) {
      showError('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'achieved': return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
      case 'on_track': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
      case 'at_risk': return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
      case 'behind': return { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
    }
  };

  const getProgressPercent = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-white/60 rounded-xl w-1/3"></div>
          <div className="grid grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-white/60 rounded-2xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="h-72 bg-white/60 rounded-2xl"></div>
            <div className="h-72 bg-white/60 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalKpis = stats?.kpis?.total || 0;
  const achievedPercent = totalKpis > 0 ? Math.round(((stats?.kpis?.achieved || 0) / totalKpis) * 100) : 0;

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-200">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
            <p className="text-gray-500">Organization-wide performance metrics overview</p>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Total KPIs */}
        <div className="group relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-200/50">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                <ArrowUpRight className="w-4 h-4" />
                {achievedPercent}%
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{totalKpis}</p>
            <p className="text-sm text-gray-500">Total KPIs Tracked</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                {stats?.kpis?.achieved || 0} achieved
              </span>
            </div>
          </div>
        </div>

        {/* On Track */}
        <div className="group relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg shadow-emerald-200/50">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-600 mb-1">{stats?.kpis?.on_track || 0}</p>
            <p className="text-sm text-gray-500">KPIs On Track</p>
            <div className="mt-3 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-1000"
                style={{ width: `${totalKpis > 0 ? ((stats?.kpis?.on_track || 0) / totalKpis) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Need Attention */}
        <div className="group relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-amber-100/50 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-200/50">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              {((stats?.kpis?.at_risk || 0) + (stats?.kpis?.behind || 0)) > 0 && (
                <div className="flex items-center gap-1 text-rose-600 text-sm font-medium">
                  <ArrowDownRight className="w-4 h-4" />
                  Risk
                </div>
              )}
            </div>
            <p className="text-3xl font-bold text-amber-600 mb-1">
              {(stats?.kpis?.at_risk || 0) + (stats?.kpis?.behind || 0)}
            </p>
            <p className="text-sm text-gray-500">Need Attention</p>
            <div className="mt-3 flex gap-2">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                {stats?.kpis?.at_risk || 0} at risk
              </span>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">
                {stats?.kpis?.behind || 0} behind
              </span>
            </div>
          </div>
        </div>

        {/* Recognitions */}
        <div className="group relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-200/50">
                <Award className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                This Month
              </span>
            </div>
            <p className="text-3xl font-bold text-violet-600 mb-1">{stats?.recentRecognitions || 0}</p>
            <p className="text-sm text-gray-500">Recognitions Given</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              <Users className="w-3.5 h-3.5" />
              Team appreciations
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* KPI Status Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">KPI Status Distribution</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {totalKpis} total
            </span>
          </div>
          <div className="space-y-5">
            {[
              { label: 'Achieved', value: stats?.kpis?.achieved || 0, gradient: 'from-emerald-500 to-green-400', bg: 'bg-emerald-50' },
              { label: 'On Track', value: stats?.kpis?.on_track || 0, gradient: 'from-blue-500 to-cyan-400', bg: 'bg-blue-50' },
              { label: 'At Risk', value: stats?.kpis?.at_risk || 0, gradient: 'from-amber-500 to-orange-400', bg: 'bg-amber-50' },
              { label: 'Behind', value: stats?.kpis?.behind || 0, gradient: 'from-rose-500 to-red-400', bg: 'bg-rose-50' },
            ].map((item) => {
              const percent = totalKpis > 0 ? Math.round((item.value / totalKpis) * 100) : 0;
              return (
                <div key={item.label} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${item.gradient}`} />
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{item.value}</span>
                      <span className="text-xs text-gray-400">({percent}%)</span>
                    </div>
                  </div>
                  <div className={`h-2.5 ${item.bg} rounded-full overflow-hidden`}>
                    <div
                      className={`h-full bg-gradient-to-r ${item.gradient} rounded-full transition-all duration-700 ease-out group-hover:shadow-lg`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Goals Progress Ring */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Goals Progress</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {stats?.goals?.completed || 0}/{stats?.goals?.total || 0} done
            </span>
          </div>
          <div className="flex items-center justify-center py-4">
            <div className="relative">
              {/* Background ring */}
              <svg className="w-44 h-44 transform -rotate-90">
                <circle
                  className="text-gray-100"
                  strokeWidth="12"
                  stroke="currentColor"
                  fill="transparent"
                  r="70"
                  cx="88"
                  cy="88"
                />
                {/* Progress ring */}
                <circle
                  className="text-primary-500 transition-all duration-1000 ease-out"
                  strokeWidth="12"
                  strokeLinecap="round"
                  stroke="url(#progressGradient)"
                  fill="transparent"
                  r="70"
                  cx="88"
                  cy="88"
                  strokeDasharray={`${(stats?.goals?.avg_progress || 0) * 4.4} 440`}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent">
                  {Math.round(stats?.goals?.avg_progress || 0)}%
                </span>
                <span className="text-sm text-gray-500 mt-1">Avg Progress</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stats?.goals?.total || 0}</p>
              <p className="text-xs text-gray-500">Total Goals</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats?.goals?.completed || 0}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-600">{stats?.activePips || 0}</p>
              <p className="text-xs text-gray-500">Active PIPs</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All KPIs by Employee</h2>
            <span className="text-sm text-gray-500">{kpis.length} KPIs</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">KPI</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kpis.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No KPIs found</p>
                    <p className="text-sm text-gray-400 mt-1">KPIs will appear here once created</p>
                  </td>
                </tr>
              ) : (
                kpis.map((kpi) => {
                  const progress = getProgressPercent(kpi.current_value, kpi.target_value);
                  const statusConfig = getStatusConfig(kpi.status);
                  return (
                    <tr key={kpi.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-violet-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary-700">
                              {kpi.user_name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{kpi.user_name}</p>
                            <p className="text-sm text-gray-500">{kpi.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{kpi.title}</p>
                          <p className="text-sm text-gray-500">
                            {kpi.current_value} / {kpi.target_value} {kpi.unit}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-36">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-gray-700">{progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                kpi.status === 'achieved' ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                                kpi.status === 'on_track' ? 'bg-gradient-to-r from-blue-500 to-cyan-400' :
                                kpi.status === 'at_risk' ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                                'bg-gradient-to-r from-rose-500 to-red-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                          {kpi.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
