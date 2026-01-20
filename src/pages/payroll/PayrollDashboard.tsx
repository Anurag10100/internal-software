import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  Download,
  Search,
  ChevronRight,
  Wallet,
  CreditCard,
  PieChart,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../../components/ui/Charts';

interface PayrollStats {
  totalPayroll: number;
  pendingPayslips: number;
  processedPayslips: number;
  pendingReimbursements: number;
  activeLoans: number;
  monthlyTrend: number;
}

interface Payslip {
  id: string;
  employee_name: string;
  employee_id: string;
  month: string;
  year: string;
  gross_salary: number;
  net_salary: number;
  status: 'draft' | 'approved' | 'paid';
  payment_date?: string;
}

export default function PayrollDashboard() {
  const { success, error: showError } = useToast();
  const [stats, setStats] = useState<PayrollStats | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filter, setFilter] = useState<'all' | 'draft' | 'approved' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPayrollData();
  }, [selectedMonth]);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, payslipsRes] = await Promise.all([
        api.getPayrollDashboard(),
        api.getPayslips({ month: selectedMonth.split('-')[1], year: selectedMonth.split('-')[0] }),
      ]);

      if (dashboardRes.data) {
        setStats(dashboardRes.data);
      }
      if (payslipsRes.data) {
        setPayslips(payslipsRes.data);
      }
    } catch (error) {
      showError('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayslips = async () => {
    try {
      const [year, month] = selectedMonth.split('-');
      const result = await api.generatePayslips({ month, year });
      if (result.data) {
        success('Payslips generated successfully');
        fetchPayrollData();
      } else {
        showError(result.error || 'Failed to generate payslips');
      }
    } catch (error) {
      showError('Failed to generate payslips');
    }
  };

  const handleApprovePayslip = async (id: string) => {
    try {
      const result = await api.approvePayslip(id);
      if (result.data) {
        success('Payslip approved');
        fetchPayrollData();
      }
    } catch (error) {
      showError('Failed to approve payslip');
    }
  };

  const filteredPayslips = payslips.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (searchQuery && !p.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-500">Manage salaries, payslips, and compensation</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleGeneratePayslips}
            className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Generate Payslips
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Payroll"
          value={formatCurrency(stats?.totalPayroll || 0)}
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
          change={stats?.monthlyTrend || 0}
          trend={stats?.monthlyTrend && stats.monthlyTrend > 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Pending Payslips"
          value={stats?.pendingPayslips || 0}
          icon={<Clock className="w-5 h-5 text-yellow-600" />}
          iconBg="bg-yellow-100"
        />
        <StatCard
          title="Processed"
          value={stats?.processedPayslips || 0}
          icon={<CheckCircle className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Active Loans"
          value={stats?.activeLoans || 0}
          icon={<Wallet className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/payroll/salary-structures"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-500 transition-colors">
            <PieChart className="w-5 h-5 text-primary-600 group-hover:text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Salary Structures</p>
            <p className="text-xs text-gray-500">Manage pay grades</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
        </Link>
        <Link
          to="/payroll/reimbursements"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-500 transition-colors">
            <CreditCard className="w-5 h-5 text-green-600 group-hover:text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Reimbursements</p>
            <p className="text-xs text-gray-500">{stats?.pendingReimbursements || 0} pending</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
        </Link>
        <Link
          to="/payroll/loans"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-colors">
            <Wallet className="w-5 h-5 text-purple-600 group-hover:text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Employee Loans</p>
            <p className="text-xs text-gray-500">{stats?.activeLoans || 0} active</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
        </Link>
        <Link
          to="/payroll/tax-declarations"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center group-hover:bg-yellow-500 transition-colors">
            <FileText className="w-5 h-5 text-yellow-600 group-hover:text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Tax Declarations</p>
            <p className="text-xs text-gray-500">IT declarations</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
        </Link>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Payslips - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
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
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Gross Salary</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Deductions</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Net Salary</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayslips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-500">No payslips found for this period</p>
                      <button
                        onClick={handleGeneratePayslips}
                        className="mt-3 text-primary-600 text-sm font-medium hover:text-primary-700"
                      >
                        Generate Payslips
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayslips.map((payslip) => (
                  <tr key={payslip.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {payslip.employee_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{payslip.employee_name}</p>
                          <p className="text-sm text-gray-500">ID: {payslip.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-900 font-medium">
                      {formatCurrency(payslip.gross_salary)}
                    </td>
                    <td className="px-5 py-4 text-red-600">
                      -{formatCurrency(payslip.gross_salary - payslip.net_salary)}
                    </td>
                    <td className="px-5 py-4 text-green-600 font-semibold">
                      {formatCurrency(payslip.net_salary)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        payslip.status === 'paid' ? 'bg-green-100 text-green-700' :
                        payslip.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payslip.status.charAt(0).toUpperCase() + payslip.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {payslip.status === 'draft' && (
                          <button
                            onClick={() => handleApprovePayslip(payslip.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
