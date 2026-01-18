import { useState } from 'react';
import { Plus, Clock, Calendar, Tag, Eye, Trash2, X, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import CreateTaskModal from '../../components/modals/CreateTaskModal';
import { Task } from '../../types';

export default function DelegatedTasks() {
  const { users, getDelegatedTasks, deleteTask } = useApp();
  const { success } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const delegatedTasks = getDelegatedTasks();

  const filteredTasks = filter === 'all'
    ? delegatedTasks
    : delegatedTasks.filter(t => t.status === filter);

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

  const handleDelete = () => {
    if (deletingTask) {
      deleteTask(deletingTask.id);
      success('Task deleted', `"${deletingTask.title}" has been removed`);
      setDeletingTask(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Delegated Tasks</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-danger-500 text-white rounded-lg text-sm font-medium hover:bg-danger-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-primary-50 rounded-xl p-4">
          <p className="text-xs font-medium text-primary-600 uppercase">Total Delegated</p>
          <p className="text-3xl font-bold text-primary-700 mt-1">{delegatedTasks.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Completed</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {delegatedTasks.filter(t => t.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">In Progress</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {delegatedTasks.filter(t => t.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Pending</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {delegatedTasks.filter(t => t.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Delayed</p>
          <p className="text-3xl font-bold text-red-600 mt-1">
            {delegatedTasks.filter(t => t.status === 'delayed').length}
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
            <p className="text-gray-500">No delegated tasks found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-primary-500 text-sm font-medium hover:text-primary-600"
            >
              Delegate your first task
            </button>
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
                      <p className="text-sm text-gray-500">Assigned to {getAssigneeName(task.assignedTo)}</p>
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
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                    <button
                      onClick={() => setViewingTask(task)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingTask(task)}
                      className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTaskModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* View Task Modal */}
      {viewingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
              <button
                onClick={() => setViewingTask(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="text-gray-900 font-medium mt-1">{viewingTask.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Assigned To</label>
                  <p className="text-gray-900 mt-1">{getAssigneeName(viewingTask.assignedTo)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="mt-1">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingTask.status)}`}>
                      {viewingTask.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Due Date</label>
                  <p className="text-gray-900 mt-1">{viewingTask.dueDate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Due Time</label>
                  <p className="text-gray-900 mt-1">{viewingTask.dueTime}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Priority</label>
                <p className="mt-1">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    viewingTask.priority === 'high' ? 'bg-red-100 text-red-700' :
                    viewingTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {viewingTask.priority.charAt(0).toUpperCase() + viewingTask.priority.slice(1)}
                  </span>
                </p>
              </div>
              {viewingTask.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {viewingTask.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setViewingTask(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 text-center">Delete Task?</h2>
              <p className="text-gray-500 text-center mt-2">
                Are you sure you want to delete "{deletingTask.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setDeletingTask(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
