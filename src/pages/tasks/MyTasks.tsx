import React, { useState } from 'react';
import { Plus, Check, Clock, Calendar, Tag, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import CreateTaskModal from '../../components/modals/CreateTaskModal';
import MarkCompleteModal from '../../components/modals/MarkCompleteModal';

export default function MyTasks() {
  const { tasks, setTasks, currentUser } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('Current Week');

  const myTasks = tasks.filter(t => t.assignedTo === currentUser.id);

  const stats = {
    totalTasks: myTasks.length,
    completed: myTasks.filter(t => t.status === 'completed').length,
    inRequest: myTasks.filter(t => t.status === 'pending').length,
    inProgress: myTasks.filter(t => t.status === 'in_progress').length,
    delayed: myTasks.filter(t => t.status === 'delayed').length,
    delayedPercentage: myTasks.length > 0
      ? Math.round((myTasks.filter(t => t.status === 'delayed').length / myTasks.length) * 100)
      : 0,
  };

  const acePerformance = {
    total: myTasks.length,
    completed: stats.completed,
    onTime: stats.completed,
    onTimePercentage: myTasks.length > 0
      ? Math.round((stats.completed / myTasks.length) * 100)
      : 0,
  };

  const handleMarkCompleteClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowCompleteModal(true);
  };

  const handleMarkComplete = (imageUrl: string | null) => {
    if (selectedTaskId) {
      setTasks(prev =>
        prev.map(t => t.id === selectedTaskId ? { ...t, status: 'completed' } : t)
      );
    }
    setShowCompleteModal(false);
    setSelectedTaskId(null);
  };

  // Mock leaderboard data
  const leaderboard = [
    { rank: 1, name: 'John Doe', assigned: 6, completed: 5, onTime: 4, compPercent: 83, onTimePercent: 80, score: 173, status: 'green' },
    { rank: 2, name: 'Jane Smith', assigned: 8, completed: 6, onTime: 5, compPercent: 75, onTimePercent: 83, score: 171, status: 'green' },
    { rank: 3, name: 'Bob Wilson', assigned: 8, completed: 6, onTime: 5, compPercent: 75, onTimePercent: 83, score: 171, status: 'green' },
    { rank: 4, name: 'Alice Brown', assigned: 6, completed: 4, onTime: 4, compPercent: 67, onTimePercent: 100, score: 170, status: 'green' },
    { rank: 5, name: 'Charlie Davis', assigned: 6, completed: 4, onTime: 4, compPercent: 67, onTimePercent: 100, score: 170, status: 'green' },
    { rank: 6, name: 'Diana Evans', assigned: 8, completed: 5, onTime: 5, compPercent: 63, onTimePercent: 100, score: 169, status: 'green' },
    { rank: 7, name: 'Edward Fox', assigned: 13, completed: 7, onTime: 7, compPercent: 54, onTimePercent: 100, score: 168, status: 'yellow' },
    { rank: 8, name: 'Fiona Green', assigned: 7, completed: 4, onTime: 4, compPercent: 57, onTimePercent: 100, score: 165, status: 'green' },
    { rank: 9, name: 'George Harris', assigned: 12, completed: 6, onTime: 6, compPercent: 50, onTimePercent: 100, score: 164, status: 'green' },
    { rank: 10, name: 'Helen Irving', assigned: 2, completed: 1, onTime: 1, compPercent: 50, onTimePercent: 100, score: 157, status: 'green' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <div className="flex items-center gap-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option>Current Week</option>
            <option>Last Week</option>
            <option>This Month</option>
            <option>Last Month</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-danger-500 text-white rounded-lg text-sm font-medium hover:bg-danger-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-primary-50 rounded-xl p-4">
          <p className="text-xs font-medium text-primary-600 uppercase">Total Tasks</p>
          <p className="text-3xl font-bold text-primary-700 mt-1">{stats.totalTasks}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Completed</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">In Request</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.inRequest}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">In Progress</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Delayed</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.delayed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Delayed %</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.delayedPercentage}%</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Task List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {myTasks.filter(t => t.status !== 'completed').map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-primary-700 font-medium text-sm">
                        {task.assignedBy.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-600">{task.title}</h3>
                      <p className="text-sm text-gray-500">Assign by {task.assignedBy}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {task.dueDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.dueTime}
                        </span>
                        {task.tags.map((tag, i) => (
                          <span key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleMarkCompleteClick(task.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Mark as Complete
                  </button>
                </div>
              </div>
            ))}
            {myTasks.filter(t => t.status !== 'completed').length === 0 && (
              <div className="p-8 text-center">
                <Check className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <p className="text-gray-500">All tasks completed!</p>
              </div>
            )}
          </div>
        </div>

        {/* ACE Performance */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My A.C.E. Performance</h2>
              <button className="text-gray-400 hover:text-gray-600">
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Performance Circle */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="flex gap-1">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-xs text-red-600 font-medium">
                    &lt;50%
                  </div>
                  <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center text-xs text-yellow-600 font-medium">
                    50-79%
                  </div>
                  <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-400 flex items-center justify-center">
                      <span className="text-white font-bold">80%+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-gray-900">{acePerformance.onTimePercentage}%</p>
              <p className="text-sm text-gray-500">100% on-time</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-900">{acePerformance.total}</p>
              </div>
              <div className="bg-primary-50 rounded-lg p-3 text-center">
                <p className="text-xs text-primary-600">Completed</p>
                <p className="text-xl font-bold text-primary-700">{acePerformance.completed}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600">On Time</p>
                <p className="text-xl font-bold text-green-700">{acePerformance.onTime}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{acePerformance.completed} / {acePerformance.total}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${(acePerformance.completed / acePerformance.total) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-primary-500 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">A.C.E. Ranking</th>
                    <th className="px-3 py-2 text-center font-medium">Assigned</th>
                    <th className="px-3 py-2 text-center font-medium">Completed</th>
                    <th className="px-3 py-2 text-center font-medium">On-Time</th>
                    <th className="px-3 py-2 text-center font-medium">Comp %</th>
                    <th className="px-3 py-2 text-center font-medium">OnTime %</th>
                    <th className="px-3 py-2 text-center font-medium text-danger-300">Status</th>
                    <th className="px-3 py-2 text-center font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaderboard.map((entry) => (
                    <tr key={entry.rank} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs font-medium text-yellow-700">
                            {entry.rank}
                          </span>
                          <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-primary-700">
                              {entry.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">{entry.assigned}</td>
                      <td className="px-3 py-2 text-center text-primary-600">{entry.completed}</td>
                      <td className="px-3 py-2 text-center">{entry.onTime}</td>
                      <td className="px-3 py-2 text-center">{entry.compPercent}%</td>
                      <td className="px-3 py-2 text-center">{entry.onTimePercent}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor(entry.status)}`} />
                      </td>
                      <td className="px-3 py-2 text-center font-medium">{entry.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateTaskModal onClose={() => setShowCreateModal(false)} />
      )}

      {showCompleteModal && selectedTaskId && (
        <MarkCompleteModal
          taskTitle={myTasks.find(t => t.id === selectedTaskId)?.title || ''}
          onClose={() => {
            setShowCompleteModal(false);
            setSelectedTaskId(null);
          }}
          onComplete={handleMarkComplete}
        />
      )}
    </div>
  );
}
