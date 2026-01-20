import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LogOut,
  CheckCircle,
  Plus,
  Search,
  FileText,
  Calendar,
  DollarSign,
  ClipboardList,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../../components/ui/Charts';

interface OffboardingStats {
  activeExits: number;
  pendingClearance: number;
  pendingSettlements: number;
  completedThisMonth: number;
}

interface ExitRequest {
  id: string;
  employee_name: string;
  employee_id: string;
  department: string;
  type: 'resignation' | 'termination' | 'retirement' | 'end_of_contract';
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  resignation_date: string;
  last_working_day: string;
  reason: string;
  clearance_progress: number;
}

export default function OffboardingDashboard() {
  const { success, error: showError } = useToast();
  const [stats, setStats] = useState<OffboardingStats | null>(null);
  const [exitRequests, setExitRequests] = useState<ExitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOffboardingData();
  }, []);

  const fetchOffboardingData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, requestsRes] = await Promise.all([
        api.getOffboardingDashboard(),
        api.getExitRequests(),
      ]);

      if (dashboardRes.data) setStats(dashboardRes.data);
      if (requestsRes.data) setExitRequests(requestsRes.data);
    } catch (error) {
      showError('Failed to load offboarding data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExit = async (id: string) => {
    try {
      const result = await api.approveExitRequest(id, { approved_last_working_day: null });
      if (result.data) {
        success('Exit request approved');
        fetchOffboardingData();
      }
    } catch (error) {
      showError('Failed to approve request');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      resignation: 'Resignation',
      termination: 'Termination',
      retirement: 'Retirement',
      end_of_contract: 'Contract End',
    };
    return labels[type] || type;
  };

  const filteredRequests = exitRequests.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (searchQuery && !r.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offboarding Management</h1>
          <p className="text-gray-500">Manage employee exits and clearance process</p>
        </div>
        <Link
          to="/offboarding/new"
          className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2 w-fit"
        >
          <Plus className="w-4 h-4" />
          New Exit Request
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Exits"
          value={stats?.activeExits || 0}
          icon={<LogOut className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Pending Clearance"
          value={stats?.pendingClearance || 0}
          icon={<ClipboardList className="w-5 h-5 text-yellow-600" />}
          iconBg="bg-yellow-100"
        />
        <StatCard
          title="Pending Settlements"
          value={stats?.pendingSettlements || 0}
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
        />
        <StatCard
          title="Completed This Month"
          value={stats?.completedThisMonth || 0}
          icon={<CheckCircle className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/offboarding/clearance"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Clearance</p>
            <p className="text-xs text-gray-500">Track progress</p>
          </div>
        </Link>
        <Link
          to="/offboarding/exit-interviews"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Exit Interviews</p>
            <p className="text-xs text-gray-500">Schedule & review</p>
          </div>
        </Link>
        <Link
          to="/offboarding/settlements"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Settlements</p>
            <p className="text-xs text-gray-500">Final & Full</p>
          </div>
        </Link>
        <Link
          to="/offboarding/knowledge-transfer"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">KT Tracker</p>
            <p className="text-xs text-gray-500">Knowledge transfer</p>
          </div>
        </Link>
      </div>

      {/* Exit Requests List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Exit Requests</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <LogOut className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No exit requests found</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div
                key={request.id}
                className="p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                      {request.employee_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{request.employee_name}</h3>
                      <p className="text-sm text-gray-500">{request.department} • {getTypeLabel(request.type)}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          LWD: {new Date(request.last_working_day).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {request.status === 'in_progress' && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Clearance Progress</p>
                        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full transition-all"
                            style={{ width: `${request.clearance_progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-primary-600 mt-1">{request.clearance_progress}%</p>
                      </div>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ').charAt(0).toUpperCase() + request.status.replace('_', ' ').slice(1)}
                    </span>
                    {request.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveExit(request.id)}
                          className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Approve
                        </button>
                        <button className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                          Reject
                        </button>
                      </div>
                    )}
                    <Link
                      to={`/offboarding/${request.id}`}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
