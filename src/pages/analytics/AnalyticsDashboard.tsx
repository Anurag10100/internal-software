import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  TrendingDown,
  Calendar,
  Clock,
  DollarSign,
  Target,
  Briefcase,
  Download,
  RefreshCw,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatCard, DonutChart, MiniBarChart } from '../../components/ui/Charts';

interface HROverview {
  totalEmployees: number;
  newHires: number;
  attrition: number;
  averageTenure: number;
  headcountTrend: { month: string; count: number }[];
  departmentDistribution: { name: string; count: number }[];
  genderDistribution: { label: string; value: number; color: string }[];
}

interface AttendanceAnalytics {
  averageAttendance: number;
  onTimePercentage: number;
  latePercentage: number;
  absentPercentage: number;
  trends: { day: string; value: number }[];
}

interface PerformanceAnalytics {
  averageRating: number;
  topPerformers: number;
  needsImprovement: number;
  ratingDistribution: { rating: string; count: number }[];
}

export default function AnalyticsDashboard() {
  const { error: showError } = useToast();
  const [hrOverview, setHROverview] = useState<HROverview | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceAnalytics | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [hrRes, attendanceRes, performanceRes] = await Promise.all([
        api.getHROverview(),
        api.getAttendanceAnalytics(),
        api.getPerformanceAnalytics(),
      ]);

      if (hrRes.data) setHROverview(hrRes.data);
      if (attendanceRes.data) setAttendanceData(attendanceRes.data);
      if (performanceRes.data) setPerformanceData(performanceRes.data);
    } catch (error) {
      showError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Mock data for demonstration
  const headcountData = hrOverview?.headcountTrend || [
    { label: 'Jan', value: 120, color: '#6366f1' },
    { label: 'Feb', value: 125, color: '#6366f1' },
    { label: 'Mar', value: 130, color: '#6366f1' },
    { label: 'Apr', value: 128, color: '#6366f1' },
    { label: 'May', value: 135, color: '#6366f1' },
    { label: 'Jun', value: 142, color: '#6366f1' },
  ];

  const genderData = hrOverview?.genderDistribution || [
    { label: 'Male', value: 65, color: '#6366f1' },
    { label: 'Female', value: 35, color: '#ec4899' },
  ];

  const departmentData = hrOverview?.departmentDistribution || [
    { name: 'Engineering', count: 45 },
    { name: 'Sales', count: 30 },
    { name: 'Marketing', count: 20 },
    { name: 'HR', count: 15 },
    { name: 'Finance', count: 12 },
  ];

  const attendanceTrends = attendanceData?.trends || [
    { label: 'Mon', value: 95, color: '#10b981' },
    { label: 'Tue', value: 92, color: '#10b981' },
    { label: 'Wed', value: 88, color: '#f59e0b' },
    { label: 'Thu', value: 91, color: '#10b981' },
    { label: 'Fri', value: 85, color: '#f59e0b' },
  ];

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
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-500">Insights and metrics across your organization</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={fetchAnalyticsData}
            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={hrOverview?.totalEmployees || 142}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
          change={hrOverview?.newHires || 8}
          trend="up"
        />
        <StatCard
          title="Avg. Attendance"
          value={`${attendanceData?.averageAttendance || 92}%`}
          icon={<Clock className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
          change={2}
          trend="up"
        />
        <StatCard
          title="Attrition Rate"
          value={`${hrOverview?.attrition || 5}%`}
          icon={<TrendingDown className="w-5 h-5 text-red-600" />}
          iconBg="bg-red-100"
          change={-1}
          trend="down"
        />
        <StatCard
          title="Avg. Performance"
          value={(performanceData?.averageRating || 3.8).toFixed(1)}
          icon={<Target className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100"
          change={5}
          trend="up"
        />
      </div>

      {/* Quick Access Reports */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { icon: Users, label: 'Headcount', link: '/analytics/headcount', color: 'blue' },
          { icon: Clock, label: 'Attendance', link: '/analytics/attendance', color: 'green' },
          { icon: Calendar, label: 'Leave', link: '/analytics/leave', color: 'yellow' },
          { icon: Target, label: 'Performance', link: '/analytics/performance', color: 'purple' },
          { icon: Briefcase, label: 'Recruitment', link: '/analytics/recruitment', color: 'pink' },
          { icon: DollarSign, label: 'Payroll', link: '/analytics/payroll', color: 'emerald' },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.link}
            className={`flex flex-col items-center gap-2 p-4 bg-${item.color}-50 rounded-xl border border-${item.color}-100 hover:border-${item.color}-300 transition-all hover:shadow-md`}
          >
            <div className={`w-10 h-10 bg-${item.color}-100 rounded-xl flex items-center justify-center`}>
              <item.icon className={`w-5 h-5 text-${item.color}-600`} />
            </div>
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Headcount Trends */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Headcount Trends</h2>
              <p className="text-sm text-gray-500">Employee count over time</p>
            </div>
            <Link to="/analytics/headcount" className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center gap-1">
              Details <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <MiniBarChart data={headcountData as any} height={150} />
        </div>

        {/* Gender Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Gender Distribution</h2>
              <p className="text-sm text-gray-500">Workforce diversity</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-8">
            <DonutChart
              data={genderData}
              size={140}
              strokeWidth={24}
              centerValue={`${hrOverview?.totalEmployees || 142}`}
              centerLabel="Total"
            />
            <div className="space-y-3">
              {genderData.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold text-gray-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Department Distribution</h2>
              <p className="text-sm text-gray-500">Employees by department</p>
            </div>
          </div>
          <div className="space-y-4">
            {departmentData.map((dept) => {
              const maxCount = Math.max(...departmentData.map(d => d.count));
              const percentage = (dept.count / maxCount) * 100;
              return (
                <div key={dept.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{dept.name}</span>
                    <span className="font-medium text-gray-900">{dept.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance Overview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Attendance This Week</h2>
              <p className="text-sm text-gray-500">Daily attendance percentage</p>
            </div>
            <Link to="/analytics/attendance" className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center gap-1">
              Details <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <MiniBarChart data={attendanceTrends as any} height={150} />
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-green-600">{attendanceData?.onTimePercentage || 85}%</p>
              <p className="text-xs text-green-700">On Time</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-yellow-600">{attendanceData?.latePercentage || 10}%</p>
              <p className="text-xs text-yellow-700">Late</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-red-600">{attendanceData?.absentPercentage || 5}%</p>
              <p className="text-xs text-red-700">Absent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Reports */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Saved Reports</h2>
            <p className="text-sm text-gray-500">Your custom reports</p>
          </div>
          <Link
            to="/analytics/reports/new"
            className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center gap-1"
          >
            Create Report <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { name: 'Monthly HR Summary', type: 'Scheduled', lastRun: '2 days ago' },
            { name: 'Quarterly Performance Review', type: 'Manual', lastRun: '1 week ago' },
            { name: 'Annual Compensation Analysis', type: 'Scheduled', lastRun: '1 month ago' },
          ].map((report, index) => (
            <div
              key={index}
              className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{report.name}</p>
                  <p className="text-sm text-gray-500">{report.type} • Last run: {report.lastRun}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-primary-50 text-primary-600 text-sm rounded-lg hover:bg-primary-100 transition-colors">
                  Run Now
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
