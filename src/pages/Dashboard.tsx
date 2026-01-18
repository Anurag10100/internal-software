import { useState } from 'react';
import { Calendar, CheckCircle, Clock, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import DailyCheckInModal from '../components/modals/DailyCheckInModal';

export default function Dashboard() {
  const { tasks, leaveRequests, currentUser } = useApp();
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  const myTasks = tasks.filter(t => t.assignedTo === currentUser.id);
  const pendingTasks = myTasks.filter(t => t.status !== 'completed');
  const completedTasks = myTasks.filter(t => t.status === 'completed');

  const pendingLeaves = leaveRequests.filter(lr => lr.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
        <p className="mt-1 text-primary-100">Here's what's happening today</p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setShowCheckInModal(true)}
            className="px-4 py-2 bg-white text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors"
          >
            Check In Now
          </button>
          <button className="px-4 py-2 bg-primary-400 text-white rounded-lg text-sm font-medium hover:bg-primary-300 transition-colors">
            View Schedule
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{pendingTasks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedTasks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Leave Requests</p>
              <p className="text-2xl font-bold text-gray-900">{pendingLeaves.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Performance</p>
              <p className="text-2xl font-bold text-gray-900">85%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Today's Tasks</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {pendingTasks.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <p className="text-gray-500">All caught up! No pending tasks.</p>
              </div>
            ) : (
              pendingTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Due: {task.dueDate} at {task.dueTime}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {pendingTasks.length > 5 && (
            <div className="p-4 border-t border-gray-100">
              <a href="/tasks/my-tasks" className="text-primary-600 text-sm font-medium hover:text-primary-700">
                View all {pendingTasks.length} tasks →
              </a>
            </div>
          )}
        </div>

        {/* Quick Actions & Announcements */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCheckInModal(true)}
                className="flex items-center gap-2 p-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <Clock className="w-5 h-5" />
                <span className="text-sm font-medium">Check In</span>
              </button>
              <a
                href="/hrms/my-leaves"
                className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-medium">Apply Leave</span>
              </a>
              <a
                href="/tasks/my-tasks"
                className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">My Tasks</span>
              </a>
              <a
                href="/hrms/attendance"
                className="flex items-center gap-2 p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">Attendance</span>
              </a>
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Announcements</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Holiday Notice</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Republic Day holiday on January 26th. Office will remain closed.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">Team Meeting</p>
                  <p className="text-xs text-green-700 mt-1">
                    Weekly team sync scheduled for Monday at 10 AM.
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
