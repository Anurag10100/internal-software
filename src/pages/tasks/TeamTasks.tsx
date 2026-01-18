import { useState } from 'react';
import { Plus, Check, Clock, Tag } from 'lucide-react';
import CreateTaskModal from '../../components/modals/CreateTaskModal';

interface TeamTask {
  id: string;
  title: string;
  assignedTo: string;
  assignedBy: string;
  dueDate: string;
  dueTime: string;
  daysAgo: number;
  department: string;
  tags: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
}

export default function TeamTasks() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('Current Week');

  // Department counts
  const departments = [
    { id: 'all', name: 'All', count: 128 },
    { id: '2d', name: '2D', count: 13 },
    { id: '3d', name: '3D', count: 11 },
    { id: 'accounts', name: 'Accounts', count: 2 },
    { id: 'concept', name: 'Concept & Copy', count: 10 },
    { id: 'hr', name: 'HR', count: 6 },
    { id: 'management', name: 'Management', count: 11 },
    { id: 'mdo', name: 'MDO', count: 5 },
    { id: 'nbd', name: 'NBD & CS', count: 19 },
    { id: 'ops', name: 'Ops & Production', count: 27 },
    { id: 'tech', name: 'Tech', count: 15 },
    { id: 'video', name: 'Video', count: 9 },
  ];

  // Mock extended task data
  const teamTasks: TeamTask[] = [
    { id: '1', title: 'Add Mail Subscribe Widget in WOWOS Website', assignedTo: 'Tarun Fuloria', assignedBy: 'Sachin', dueDate: 'Dec 26', dueTime: '5:30 PM', daysAgo: 12, department: 'tech', tags: [], status: 'in_progress' },
    { id: '2', title: 'Zoom call - 2 Web Developer', assignedTo: 'Tanvi', assignedBy: 'Sachin', dueDate: 'Jan 2', dueTime: '6:00 PM', daysAgo: 5, department: 'hr', tags: [], status: 'in_progress' },
    { id: '3', title: 'Share cost with KM Client - PAMEX', assignedTo: 'Prakrati Maheshwari', assignedBy: 'Sachin', dueDate: 'Jan 2', dueTime: '8:00 PM', daysAgo: 5, department: 'nbd', tags: [], status: 'in_progress' },
    { id: '4', title: 'IJ- Couture', assignedTo: 'Mahima', assignedBy: 'Sachin', dueDate: 'Jan 5', dueTime: '12:00 AM', daysAgo: 2, department: 'concept', tags: [], status: 'in_progress' },
    { id: '5', title: 'Leave Management System in WOWOS APP', assignedTo: 'Tarun Fuloria', assignedBy: 'Sachin', dueDate: 'Jan 5', dueTime: '5:00 PM', daysAgo: 2, department: 'tech', tags: ['daily-priority'], status: 'in_progress' },
    { id: '6', title: 'WOWOS Video 2', assignedTo: 'Arya', assignedBy: 'Sachin', dueDate: 'Jan 5', dueTime: '5:00 PM', daysAgo: 2, department: 'video', tags: ['daily-priority'], status: 'in_progress' },
    { id: '7', title: 'Laminator Meet Vendor Costing', assignedTo: 'Pankaj', assignedBy: 'Sachin', dueDate: 'Jan 5', dueTime: '5:00 PM', daysAgo: 2, department: 'ops', tags: ['daily-priority'], status: 'in_progress' },
    { id: '8', title: 'Sleepwell Content', assignedTo: 'Ankit Singh', assignedBy: 'Sachin', dueDate: 'Jan 5', dueTime: '5:00 PM', daysAgo: 2, department: 'concept', tags: [], status: 'in_progress' },
  ];

  const filteredTasks = departmentFilter === 'all'
    ? teamTasks
    : teamTasks.filter(t => t.department === departmentFilter);

  const stats = {
    totalTasks: 352,
    completed: 224,
    inRequest: 5,
    inProgress: 79,
    delayed: 44,
    delayedPercentage: 13,
  };

  // Leaderboard data
  const leaderboard = [
    { rank: 1, name: 'Sachin T', assigned: 8, completed: 8, onTime: 8, compPercent: 100, onTimePercent: 100, score: 192, status: 'green' },
    { rank: 2, name: 'Amit T', assigned: 8, completed: 6, onTime: 5, compPercent: 100, onTimePercent: 83, score: 184, status: 'green' },
    { rank: 3, name: 'Tarun F', assigned: 8, completed: 7, onTime: 6, compPercent: 88, onTimePercent: 86, score: 180, status: 'green' },
    { rank: 4, name: 'Priya S', assigned: 8, completed: 6, onTime: 5, compPercent: 75, onTimePercent: 83, score: 171, status: 'green' },
    { rank: 5, name: 'Rahul K', assigned: 6, completed: 4, onTime: 4, compPercent: 67, onTimePercent: 100, score: 170, status: 'green' },
    { rank: 6, name: 'Neeti C', assigned: 6, completed: 4, onTime: 4, compPercent: 67, onTimePercent: 100, score: 170, status: 'green' },
    { rank: 7, name: 'Animesh', assigned: 12, completed: 7, onTime: 7, compPercent: 58, onTimePercent: 100, score: 170, status: 'green' },
    { rank: 8, name: 'Mahima', assigned: 13, completed: 7, onTime: 7, compPercent: 54, onTimePercent: 100, score: 168, status: 'yellow' },
    { rank: 9, name: 'Arya', assigned: 7, completed: 4, onTime: 4, compPercent: 57, onTimePercent: 100, score: 165, status: 'green' },
    { rank: 10, name: 'Pankaj', assigned: 2, completed: 1, onTime: 1, compPercent: 50, onTimePercent: 100, score: 157, status: 'green' },
    { rank: 11, name: 'Ankit S', assigned: 13, completed: 13, onTime: 10, compPercent: 100, onTimePercent: 77, score: 143, status: 'yellow' },
    { rank: 12, name: 'Divya M', assigned: 14, completed: 12, onTime: 8, compPercent: 86, onTimePercent: 67, score: 131, status: 'yellow' },
    { rank: 13, name: 'Tanvi', assigned: 12, completed: 10, onTime: 7, compPercent: 83, onTimePercent: 70, score: 128, status: 'yellow' },
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
        <h1 className="text-2xl font-bold text-gray-900">Team Tasks</h1>
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
          <p className="text-3xl font-bold text-danger-600 mt-1">{stats.delayedPercentage}%</p>
        </div>
      </div>

      {/* Department Filters */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">TEAM</p>
        <div className="flex flex-wrap gap-2">
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setDepartmentFilter(dept.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                departmentFilter === dept.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {dept.name}
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                departmentFilter === dept.id ? 'bg-primary-400' : 'bg-gray-100'
              }`}>
                {dept.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Task List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredTasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-primary-700 font-medium text-sm">
                        {task.assignedTo.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-600">{task.title}</h3>
                      <p className="text-sm text-gray-500">Assign to {task.assignedTo}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1 text-danger-500">
                          <Clock className="w-3 h-3" />
                          {task.dueDate}, {task.dueTime}
                        </span>
                        <span className="text-danger-500 font-medium">| {task.daysAgo} days ago</span>
                        {task.tags.map((tag, i) => (
                          <span key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors whitespace-nowrap">
                    <Check className="w-4 h-4" />
                    Mark as Complete
                  </button>
                </div>
              </div>
            ))}
            {filteredTasks.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-gray-500">No team tasks found for this department</p>
              </div>
            )}
          </div>
        </div>

        {/* A.C.E. Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary-500 text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">A.C.E.</th>
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

      {showCreateModal && (
        <CreateTaskModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
