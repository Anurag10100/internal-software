import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Flame,
  ThermometerSun,
  Snowflake,
  UserPlus,
  Download,
  ArrowRight,
  Trophy,
  Building,
  Tag,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { useBoothPilot } from '../../context/BoothPilotContext';

const BPDashboard: React.FC = () => {
  const { analytics, fetchAnalytics, leads, fetchLeads, exportLeadsCSV, user } = useBoothPilot();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchAnalytics(), fetchLeads({ limit: 5 })]);
      setLoading(false);
    };
    loadData();
  }, [fetchAnalytics, fetchLeads]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAnalytics(), fetchLeads({ limit: 5 })]);
    setRefreshing(false);
  };

  const handleExport = async () => {
    await exportLeadsCSV();
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Leads',
      value: analytics?.totalLeads || 0,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Hot Leads',
      value: analytics?.hotLeads || 0,
      icon: Flame,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Warm Leads',
      value: analytics?.warmLeads || 0,
      icon: ThermometerSun,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Cold Leads',
      value: analytics?.coldLeads || 0,
      icon: Snowflake,
      color: 'bg-cyan-500',
      bgColor: 'bg-cyan-50',
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name}!</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
          <Link
            to="/boothpilot/booth"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Lead</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${stat.bgColor} rounded-xl p-4 lg:p-6`}>
              <div className="flex items-center gap-3">
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Recent Leads</h2>
            <Link
              to="/boothpilot/leads"
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {leads.slice(0, 5).map((lead) => (
              <Link
                key={lead.id}
                to={`/boothpilot/leads/${lead.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium">
                    {lead.fullName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{lead.fullName}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {lead.companyName || 'No company'} {lead.designation ? `- ${lead.designation}` : ''}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {lead.label ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lead.label === 'HOT'
                          ? 'bg-red-100 text-red-800'
                          : lead.label === 'WARM'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-cyan-100 text-cyan-800'
                      }`}
                    >
                      {lead.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Unscored
                    </span>
                  )}
                </div>
              </Link>
            ))}
            {leads.length === 0 && (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No leads captured yet</p>
                <Link
                  to="/boothpilot/booth"
                  className="inline-flex items-center gap-2 mt-3 text-indigo-600 hover:text-indigo-700"
                >
                  <UserPlus className="w-4 h-4" />
                  Add your first lead
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Staff Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 p-4 border-b border-gray-200">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-gray-900">Staff Leaderboard</h2>
            </div>
            <div className="p-4 space-y-3">
              {analytics?.staffLeaderboard?.slice(0, 5).map((staff, index) => (
                <div key={staff.id} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? 'bg-amber-100 text-amber-700'
                        : index === 1
                        ? 'bg-gray-200 text-gray-700'
                        : index === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{staff.name}</p>
                    <p className="text-xs text-gray-500">{staff.totalLeads} leads</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-700">{staff.hotLeads}</span>
                  </div>
                </div>
              ))}
              {(!analytics?.staffLeaderboard || analytics.staffLeaderboard.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No data yet</p>
              )}
            </div>
          </div>

          {/* Top Industries */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 p-4 border-b border-gray-200">
              <Building className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Top Industries</h2>
            </div>
            <div className="p-4 space-y-2">
              {analytics?.topIndustries?.map((industry) => (
                <div key={industry.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{industry.name}</span>
                  <span className="text-sm font-medium text-gray-900">{industry.count}</span>
                </div>
              ))}
              {(!analytics?.topIndustries || analytics.topIndustries.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-2">No data yet</p>
              )}
            </div>
          </div>

          {/* Top Interest Tags */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 p-4 border-b border-gray-200">
              <Tag className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Top Interests</h2>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {analytics?.topInterests?.map((interest) => (
                <span
                  key={interest.name}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                >
                  {interest.name}
                  <span className="bg-indigo-200 text-indigo-800 rounded-full px-1.5 text-xs font-medium">
                    {interest.count}
                  </span>
                </span>
              ))}
              {(!analytics?.topInterests || analytics.topInterests.length === 0) && (
                <p className="text-sm text-gray-500 w-full text-center py-2">No data yet</p>
              )}
            </div>
          </div>

          {/* Follow-up Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Follow-ups</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{analytics?.followups?.sent || 0}</p>
                <p className="text-sm text-gray-500">Sent</p>
              </div>
              <div className="w-px h-12 bg-gray-200" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{analytics?.followups?.total || 0}</p>
                <p className="text-sm text-gray-500">Generated</p>
              </div>
              <div className="w-px h-12 bg-gray-200" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {analytics?.followups?.total
                    ? Math.round((analytics.followups.sent / analytics.followups.total) * 100)
                    : 0}%
                </p>
                <p className="text-sm text-gray-500">Rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BPDashboard;
