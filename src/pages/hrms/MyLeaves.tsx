import React, { useState } from 'react';
import { Plus, Calendar, Clock, User, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import RequestLeaveModal from '../../components/modals/RequestLeaveModal';

export default function MyLeaves() {
  const { leaveRequests, currentUser, hrmsSettings } = useApp();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [filter, setFilter] = useState('all');

  const myLeaves = leaveRequests.filter(lr => lr.userId === currentUser.id);

  const filteredLeaves = filter === 'all'
    ? myLeaves
    : myLeaves.filter(lr => lr.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const leaveBalance = hrmsSettings.leaveTypes.filter(lt => lt.isActive).map(lt => ({
    ...lt,
    used: myLeaves.filter(ml => ml.leaveType.id === lt.id && ml.status === 'approved').length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Leaves</h1>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Request Leave
        </button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {leaveBalance.map((leave) => (
          <div key={leave.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-600 truncate">{leave.name}</h3>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {leave.used}
              </span>
              <span className="text-sm text-gray-500">
                / {leave.daysPerYear === 'unlimited' ? '∞' : leave.daysPerYear}
              </span>
            </div>
            {leave.requiresDocument && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                D
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Leave Requests List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {filteredLeaves.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No leave requests found</p>
            <button
              onClick={() => setShowRequestModal(true)}
              className="mt-4 text-primary-500 text-sm font-medium hover:text-primary-600"
            >
              Request your first leave
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLeaves.map((leave) => (
              <div key={leave.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{leave.leaveType.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {leave.fromDate} - {leave.toDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          HOD: {leave.hodName}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 flex items-start gap-1">
                        <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {leave.reason}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                    {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showRequestModal && (
        <RequestLeaveModal onClose={() => setShowRequestModal(false)} />
      )}
    </div>
  );
}
