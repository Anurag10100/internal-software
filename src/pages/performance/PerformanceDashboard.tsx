import { useState, useEffect } from 'react';
import { Target, Award, TrendingUp, AlertCircle } from 'lucide-react';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'bg-green-100 text-green-700';
      case 'on_track': return 'bg-blue-100 text-blue-700';
      case 'at_risk': return 'bg-yellow-100 text-yellow-700';
      case 'behind': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getProgressPercent = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
        <p className="text-gray-500 mt-1">Organization-wide performance metrics overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              (stats?.kpis?.achieved || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {stats?.kpis?.achieved || 0} achieved
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">{stats?.kpis?.total || 0}</p>
          <p className="text-sm text-gray-500">Total KPIs</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
              On Track
            </span>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-3">{stats?.kpis?.on_track || 0}</p>
          <p className="text-sm text-gray-500">KPIs on track</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
              At Risk
            </span>
          </div>
          <p className="text-2xl font-bold text-yellow-600 mt-3">
            {(stats?.kpis?.at_risk || 0) + (stats?.kpis?.behind || 0)}
          </p>
          <p className="text-sm text-gray-500">Need attention</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
              This Month
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-3">{stats?.recentRecognitions || 0}</p>
          <p className="text-sm text-gray-500">Recognitions</p>
        </div>
      </div>

      {/* KPIs Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KPI Status Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">KPI Status Distribution</h2>
          <div className="space-y-4">
            {[
              { label: 'Achieved', value: stats?.kpis?.achieved || 0, color: 'bg-green-500' },
              { label: 'On Track', value: stats?.kpis?.on_track || 0, color: 'bg-blue-500' },
              { label: 'At Risk', value: stats?.kpis?.at_risk || 0, color: 'bg-yellow-500' },
              { label: 'Behind', value: stats?.kpis?.behind || 0, color: 'bg-red-500' },
            ].map((item) => {
              const total = stats?.kpis?.total || 1;
              const percent = Math.round((item.value / total) * 100);
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium">{item.value} ({percent}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Goals Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Goals Progress</h2>
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="relative inline-flex">
                <svg className="w-32 h-32">
                  <circle
                    className="text-gray-200"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r="56"
                    cx="64"
                    cy="64"
                  />
                  <circle
                    className="text-primary-600"
                    strokeWidth="10"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="56"
                    cx="64"
                    cy="64"
                    strokeDasharray={`${(stats?.goals?.avg_progress || 0) * 3.52} 352`}
                    strokeDashoffset="0"
                    transform="rotate(-90 64 64)"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                  {Math.round(stats?.goals?.avg_progress || 0)}%
                </span>
              </div>
              <p className="text-gray-500 mt-2">Average Goal Progress</p>
              <p className="text-sm text-gray-400">
                {stats?.goals?.completed || 0} of {stats?.goals?.total || 0} completed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* All KPIs Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All KPIs by Employee</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KPI</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {kpis.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No KPIs found
                  </td>
                </tr>
              ) : (
                kpis.map((kpi) => {
                  const progress = getProgressPercent(kpi.current_value, kpi.target_value);
                  return (
                    <tr key={kpi.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{kpi.user_name}</p>
                          <p className="text-sm text-gray-500">{kpi.department}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{kpi.title}</p>
                          <p className="text-sm text-gray-500">
                            {kpi.current_value} / {kpi.target_value} {kpi.unit}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">{progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                kpi.status === 'achieved' ? 'bg-green-500' :
                                kpi.status === 'on_track' ? 'bg-blue-500' :
                                kpi.status === 'at_risk' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(kpi.status)}`}>
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
