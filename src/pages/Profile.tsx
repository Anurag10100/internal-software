import { useState } from 'react';
import {
  User,
  Mail,
  Building2,
  Briefcase,
  Shield,
  Calendar,
  CheckCircle,
  Clock,
  Award,
  TrendingUp,
  Edit3,
  Camera,
  Save,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { ProgressRing, AnimatedCounter } from '../components/ui/Charts';

export default function Profile() {
  const { user, isAdmin } = useAuth();
  const { getMyTasks, getMyLeaveRequests, getMyCheckIns } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');

  if (!user) return null;

  const myTasks = getMyTasks();
  const completedTasks = myTasks.filter((t) => t.status === 'completed');
  const pendingTasks = myTasks.filter((t) => t.status !== 'completed');
  const myLeaves = getMyLeaveRequests();
  const myCheckIns = getMyCheckIns();

  const completionRate = myTasks.length > 0 ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;
  const attendanceRate = 95; // Simulated

  // Achievement badges based on performance
  const badges = [
    { name: 'Task Master', description: 'Complete 10+ tasks', unlocked: completedTasks.length >= 10, icon: CheckCircle, color: 'green' },
    { name: 'Early Bird', description: 'Check in before 9 AM', unlocked: true, icon: Clock, color: 'blue' },
    { name: 'Team Player', description: 'Help 5+ colleagues', unlocked: true, icon: User, color: 'purple' },
    { name: 'Perfect Week', description: '100% attendance', unlocked: attendanceRate >= 100, icon: Award, color: 'yellow' },
  ];

  const stats = [
    { label: 'Tasks Completed', value: completedTasks.length, icon: CheckCircle, color: 'green' },
    { label: 'Pending Tasks', value: pendingTasks.length, icon: Clock, color: 'blue' },
    { label: 'Leave Balance', value: 12 - myLeaves.filter((l) => l.status === 'approved').length, icon: Calendar, color: 'yellow' },
    { label: 'Check-ins', value: myCheckIns.length, icon: TrendingUp, color: 'purple' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6bTAgMGMwLTIgMi00IDItNHMyIDIgMiA0LTIgNC0yIDQtMi0yLTItNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 relative z-10">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white">
                <span className="text-primary-600 font-bold text-3xl">
                  {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Name & Role */}
            <div className="flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-2xl font-bold text-gray-900 border-b-2 border-primary-500 bg-transparent focus:outline-none"
                  />
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditedName(user.name);
                      setIsEditing(false);
                    }}
                    className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <Shield className="w-3 h-3" />
                  {isAdmin ? 'Admin' : 'Employee'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                  <Building2 className="w-3 h-3" />
                  {user.department}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                  <Briefcase className="w-3 h-3" />
                  {user.designation}
                </span>
              </div>
            </div>

            {/* Performance Ring */}
            <div className="hidden md:block">
              <ProgressRing
                progress={completionRate}
                size={80}
                strokeWidth={6}
                color="#10b981"
                label={`${completionRate}%`}
                sublabel="Complete"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              {user.email}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              Joined January 2024
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={stat.value} />
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Achievements & Performance */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Achievements */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Achievements
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.name}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    badge.unlocked
                      ? `border-${badge.color}-200 bg-${badge.color}-50`
                      : 'border-gray-100 bg-gray-50 opacity-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${
                    badge.unlocked ? `bg-${badge.color}-100` : 'bg-gray-200'
                  } flex items-center justify-center mb-2`}>
                    <Icon className={`w-5 h-5 ${
                      badge.unlocked ? `text-${badge.color}-600` : 'text-gray-400'
                    }`} />
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{badge.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{badge.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            Performance Summary
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Task Completion Rate</span>
                <span className="text-sm font-semibold text-gray-900">{completionRate}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-1000"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Attendance Rate</span>
                <span className="text-sm font-semibold text-gray-900">{attendanceRate}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-1000"
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">On-time Delivery</span>
                <span className="text-sm font-semibold text-gray-900">88%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full transition-all duration-1000"
                  style={{ width: '88%' }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-indigo-50 rounded-xl border border-primary-100">
            <p className="text-sm font-medium text-primary-900">Great Progress!</p>
            <p className="text-xs text-primary-700 mt-1">
              You're performing better than 75% of your peers this month. Keep it up!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
