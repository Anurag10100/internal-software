import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Target,
  Zap,
  Sun,
  Moon,
  CloudSun,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import DailyCheckInModal from '../components/modals/DailyCheckInModal';
import { ProgressRing, MiniBarChart, StatCard, DonutChart } from '../components/ui/Charts';
import { ActivityTimeline, sampleActivities } from '../components/ui/ActivityTimeline';
import { PageSkeleton } from '../components/ui/Skeleton';

// Get greeting based on time of day
function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: Sun };
  if (hour < 17) return { text: 'Good afternoon', icon: CloudSun };
  return { text: 'Good evening', icon: Moon };
}

// Get motivational quote
function getMotivationalQuote(): string {
  const quotes = [
    "Let's make today productive!",
    "Small progress is still progress.",
    "Focus on what matters most.",
    "You're doing great work!",
    "Every task completed is a step forward.",
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export default function Dashboard() {
  const { currentUser, getMyTasks, getMyLeaveRequests } = useApp();
  const { isAdmin } = useAuth();
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // Simulate loading for smooth animation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const myTasks = getMyTasks();
  const pendingTasks = myTasks.filter(t => t.status !== 'completed');
  const completedTasks = myTasks.filter(t => t.status === 'completed');
  const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high');

  const approvedLeaves = getMyLeaveRequests().filter(lr => lr.status === 'approved');

  const userName = currentUser?.name?.split(' ')[0] || 'User';
  const completionRate = myTasks.length > 0 ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;

  // Weekly task data for chart
  const weeklyData = [
    { label: 'Mon', value: 4, color: '#6366f1' },
    { label: 'Tue', value: 7, color: '#6366f1' },
    { label: 'Wed', value: 5, color: '#6366f1' },
    { label: 'Thu', value: 8, color: '#6366f1' },
    { label: 'Fri', value: 6, color: '#6366f1' },
  ];

  // Task distribution for donut chart
  const taskDistribution = [
    { label: 'Completed', value: completedTasks.length, color: '#10b981' },
    { label: 'In Progress', value: pendingTasks.filter(t => t.status === 'in_progress').length, color: '#6366f1' },
    { label: 'Pending', value: pendingTasks.filter(t => t.status === 'pending').length, color: '#f59e0b' },
  ];

  // Sparkline data (simulated weekly trend)
  const sparklineData = [3, 5, 4, 7, 6, 8, completedTasks.length];

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section - Enhanced */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-primary-200 mb-2">
            <GreetingIcon className="w-5 h-5" />
            <span className="text-sm font-medium">{greeting.text}</span>
            <span className="text-xs opacity-75">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {userName}!</h1>
          <p className="mt-1 text-primary-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {getMotivationalQuote()}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setShowCheckInModal(true)}
              className="px-5 py-2.5 bg-white text-primary-600 rounded-xl text-sm font-semibold hover:bg-primary-50 transition-all hover:shadow-lg hover:scale-105 flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Check In Now
            </button>
            <Link
              to="/tasks/my-tasks"
              className="px-5 py-2.5 bg-primary-400/30 text-white rounded-xl text-sm font-semibold hover:bg-primary-400/50 transition-all backdrop-blur-sm flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              View My Tasks
            </Link>
          </div>

          {/* Quick Stats Pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            <div className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>{completedTasks.length} tasks done today</span>
            </div>
            {highPriorityTasks.length > 0 && (
              <div className="px-3 py-1.5 bg-red-500/20 backdrop-blur-sm rounded-full text-sm flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                <span>{highPriorityTasks.length} high priority</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid - Enhanced */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Tasks"
          value={pendingTasks.length}
          change={12}
          trend="up"
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
          sparklineData={[2, 4, 3, 5, 4, 6, pendingTasks.length]}
        />
        <StatCard
          title="Completed"
          value={completedTasks.length}
          change={8}
          trend="up"
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
          sparklineData={sparklineData}
        />
        <StatCard
          title="Leave Balance"
          value={`${12 - approvedLeaves.length}`}
          icon={<Calendar className="w-5 h-5 text-yellow-600" />}
          iconBg="bg-yellow-100"
        />
        <StatCard
          title="Performance"
          value={`${completionRate}%`}
          change={5}
          trend={completionRate >= 70 ? 'up' : 'down'}
          icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Tasks & Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Overview with Charts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Task Overview</h2>
                <p className="text-sm text-gray-500">Your weekly productivity</p>
              </div>
              <Link
                to="/tasks/my-tasks"
                className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Weekly Bar Chart */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-4">Tasks Completed This Week</p>
                <MiniBarChart data={weeklyData} height={80} />
              </div>

              {/* Task Distribution Donut */}
              <div className="flex items-center justify-center gap-6">
                <DonutChart
                  data={taskDistribution}
                  size={100}
                  strokeWidth={16}
                  centerValue={`${myTasks.length}`}
                  centerLabel="Total"
                />
                <div className="space-y-2">
                  {taskDistribution.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-600">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Today's Tasks */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Today's Tasks</h2>
                <p className="text-sm text-gray-500">{pendingTasks.length} tasks remaining</p>
              </div>
              <div className="flex items-center gap-2">
                <ProgressRing
                  progress={completionRate}
                  size={48}
                  strokeWidth={4}
                  color="#10b981"
                  label={`${completionRate}%`}
                />
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {pendingTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="font-medium text-gray-900">All caught up!</h3>
                  <p className="text-gray-500 text-sm mt-1">No pending tasks for today.</p>
                </div>
              ) : (
                pendingTasks.slice(0, 5).map((task, index) => (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-gray-50 transition-colors group cursor-pointer"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        task.priority === 'high' ? 'bg-red-100' :
                        task.priority === 'medium' ? 'bg-yellow-100' :
                        'bg-gray-100'
                      }`}>
                        <Target className={`w-5 h-5 ${
                          task.priority === 'high' ? 'text-red-600' :
                          task.priority === 'medium' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                          {task.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Due: {task.dueDate} at {task.dueTime}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            {pendingTasks.length > 5 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <Link
                  to="/tasks/my-tasks"
                  className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center justify-center gap-1"
                >
                  View all {pendingTasks.length} tasks <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Activity & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCheckInModal(true)}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-primary-50 to-primary-100 text-primary-700 rounded-xl hover:from-primary-100 hover:to-primary-200 transition-all hover:scale-105"
              >
                <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium">Check In</span>
              </button>
              <Link
                to="/hrms/my-leaves"
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700 rounded-xl hover:from-yellow-100 hover:to-yellow-200 transition-all hover:scale-105"
              >
                <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium">Apply Leave</span>
              </Link>
              <Link
                to="/tasks/my-tasks"
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all hover:scale-105"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium">My Tasks</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/team/management"
                  className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all hover:scale-105"
                >
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium">Team</span>
                </Link>
              )}
              {!isAdmin && (
                <Link
                  to="/hrms/attendance"
                  className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all hover:scale-105"
                >
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium">Attendance</span>
                </Link>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <span className="text-xs text-gray-400">Last 24 hours</span>
            </div>
            <ActivityTimeline activities={sampleActivities} maxItems={4} />
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Announcements</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Holiday Notice</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Republic Day holiday on January 26th.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Team Meeting</p>
                  <p className="text-xs text-green-700 mt-1">
                    Weekly sync Monday at 10 AM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCheckInModal && (
        <DailyCheckInModal onClose={() => setShowCheckInModal(false)} />
      )}
    </div>
  );
}
