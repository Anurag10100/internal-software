import React, { useState } from 'react';
import { Filter, Clock, Calendar, Tag, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function TeamTasks() {
  const { tasks, users } = useApp();
  const [filter, setFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  const teamTasks = userFilter === 'all'
    ? tasks
    : tasks.filter(t => t.assignedTo === userFilter);

  const filteredTasks = filter === 'all'
    ? teamTasks
    : teamTasks.filter(t => t.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'delayed':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getAssigneeName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Team Tasks</h1>
        <div className="flex items-center gap-3">
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Team Members</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-primary-50 rounded-xl p-4">
          <p className="text-xs font-medium text-primary-600 uppercase">Total Tasks</p>
          <p className="text-3xl font-bold text-primary-700 mt-1">{teamTasks.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Completed</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {teamTasks.filter(t => t.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">In Progress</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {teamTasks.filter(t => t.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Pending</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {teamTasks.filter(t => t.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Delayed</p>
          <p className="text-3xl font-bold text-red-600 mt-1">
            {teamTasks.filter(t => t.status === 'delayed').length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'pending', 'in_progress', 'completed', 'delayed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No team tasks found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-primary-700 font-medium text-sm">
                        {getAssigneeName(task.assignedTo).split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-600">{task.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {getAssigneeName(task.assignedTo)}
                        </span>
                        <span>•</span>
                        <span>Assigned by {task.assignedBy}</span>
                      </div>
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
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
