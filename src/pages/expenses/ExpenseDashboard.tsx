import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  DollarSign,
  Clock,
  CheckCircle,
  Plus,
  FileText,
  CreditCard,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../../components/ui/Charts';

interface ExpenseStats {
  totalExpenses: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  pendingReports: number;
  monthlyTrend: number;
}

interface ExpenseReport {
  id: string;
  title: string;
  employee_name: string;
  total_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  items_count: number;
  submitted_at?: string;
  created_at: string;
}

export default function ExpenseDashboard() {
  const { success, error: showError } = useToast();
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [myReports, setMyReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'my-reports'>('pending');
  const [filter, setFilter] = useState<'all' | 'submitted' | 'approved' | 'paid'>('all');

  useEffect(() => {
    fetchExpenseData();
  }, []);

  const fetchExpenseData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, reportsRes, myReportsRes] = await Promise.all([
        api.getExpenseDashboard(),
        api.getExpenseReports({ status: 'submitted' }),
        api.getMyExpenseReports(),
      ]);

      if (dashboardRes.data) setStats(dashboardRes.data);
      if (reportsRes.data) setReports(reportsRes.data);
      if (myReportsRes.data) setMyReports(myReportsRes.data);
    } catch (error) {
      showError('Failed to load expense data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const result = await api.approveExpenseReport(id);
      if (result.data) {
        success('Expense report approved');
        fetchExpenseData();
      }
    } catch (error) {
      showError('Failed to approve report');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      paid: 'bg-emerald-100 text-emerald-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const filteredMyReports = myReports.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-500">Track and manage expense reports</p>
        </div>
        <Link
          to="/expenses/new"
          className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2 w-fit"
        >
          <Plus className="w-4 h-4" />
          New Expense Report
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats?.totalExpenses || 0)}
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
          change={stats?.monthlyTrend || 0}
          trend={stats?.monthlyTrend && stats.monthlyTrend > 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Pending Approval"
          value={formatCurrency(stats?.pendingAmount || 0)}
          icon={<Clock className="w-5 h-5 text-yellow-600" />}
          iconBg="bg-yellow-100"
        />
        <StatCard
          title="Approved"
          value={formatCurrency(stats?.approvedAmount || 0)}
          icon={<CheckCircle className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Pending Reports"
          value={stats?.pendingReports || 0}
          icon={<FileText className="w-5 h-5 text-red-600" />}
          iconBg="bg-red-100"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/expenses/categories"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Categories</p>
            <p className="text-xs text-gray-500">Manage types</p>
          </div>
        </Link>
        <Link
          to="/expenses/policies"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Policies</p>
            <p className="text-xs text-gray-500">Spending rules</p>
          </div>
        </Link>
        <Link
          to="/expenses/analytics"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Analytics</p>
            <p className="text-xs text-gray-500">Spending trends</p>
          </div>
        </Link>
        <Link
          to="/payroll/reimbursements"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Reimbursements</p>
            <p className="text-xs text-gray-500">Quick claims</p>
          </div>
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === 'pending'
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending Approval
              {reports.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                  {reports.length}
                </span>
              )}
              {activeTab === 'pending' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('my-reports')}
              className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === 'my-reports'
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Reports
              {activeTab === 'my-reports' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
          </div>
        </div>

        <div className="p-5">
          {activeTab === 'pending' && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                  <p className="text-gray-500">No pending expense reports</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-primary-200 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-medium">
                        {report.employee_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{report.title}</h3>
                        <p className="text-sm text-gray-500">
                          {report.employee_name} • {report.items_count} items
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(report.total_amount)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(report.submitted_at || report.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(report.id)}
                          className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Approve
                        </button>
                        <button className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'my-reports' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="space-y-4">
                {filteredMyReports.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No expense reports found</p>
                    <Link
                      to="/expenses/new"
                      className="mt-3 inline-flex items-center gap-2 text-primary-600 text-sm font-medium hover:text-primary-700"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Report
                    </Link>
                  </div>
                ) : (
                  filteredMyReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-primary-200 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                          <Receipt className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{report.title}</h3>
                          <p className="text-sm text-gray-500">{report.items_count} items</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(report.total_amount)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(report.status)}`}>
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </span>
                        </div>
                        <Link
                          to={`/expenses/${report.id}`}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
