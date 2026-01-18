import { useState } from 'react';
import { Plus, Calendar, Clock, User, FileText, RefreshCw, PartyPopper } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import RequestLeaveModal from '../../components/modals/RequestLeaveModal';

interface CircularProgressProps {
  value: number;
  max: number | 'unlimited';
  color: string;
  size?: number;
}

function CircularProgress({ value, max, color, size = 120 }: CircularProgressProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const isUnlimited = max === 'unlimited';
  const percentage = isUnlimited ? 100 : (max > 0 ? ((max - value) / max) * 100 : 0);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold text-gray-800">
          {isUnlimited ? '∞' : (max - value)}
        </span>
      </div>
    </div>
  );
}

export default function MyLeaves() {
  const { leaveRequests, currentUser } = useApp();
  const [showRequestModal, setShowRequestModal] = useState(false);

  const myLeaves = leaveRequests.filter(lr => lr.userId === currentUser.id);

  // Leave balance data with colors
  const leaveBalance = [
    { id: '1', name: 'Casual Leave', total: 7, used: 0, color: '#22c55e' },
    { id: '2', name: 'Earned Leaves', total: 12, used: 0, color: '#ef4444' },
    { id: '3', name: 'Sick Leave', total: 7, used: 0, color: '#f97316' },
    { id: '4', name: 'Unpaid Leave', total: 'unlimited' as const, used: 0, color: '#22c55e' },
    { id: '5', name: 'Work from Home', total: 'unlimited' as const, used: 0, color: '#ef4444' },
  ];

  // Today on Leave mock data
  const todayOnLeave = [
    { id: '1', name: 'Neeti Choudhary', date: '07 Jan 2026', type: 'Full Day' },
    { id: '2', name: 'Animesh', date: '07 Jan 2026', type: 'Full Day' },
  ];

  // Holiday list
  const holidayList = [
    { name: 'New Year', date: '01 Jan' },
    { name: 'Republic Day', date: '26 Jan' },
    { name: 'Holi', date: '04 Mar' },
    { name: 'Independence Day', date: '15 Aug' },
    { name: 'Dussehra', date: '20 Oct' },
    { name: 'Diwali', date: '08 Nov' },
    { name: 'Christmas', date: '25 Dec' },
  ];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Leaves</h1>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-danger-500 text-white rounded-lg text-sm font-medium hover:bg-danger-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Apply Leave
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Leave Balance Cards */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {leaveBalance.map((leave) => (
              <div key={leave.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
                <CircularProgress
                  value={leave.used}
                  max={leave.total}
                  color={leave.color}
                />
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Total: {leave.total === 'unlimited' ? 'Unlimited' : leave.total} Used: {leave.used}
                  </p>
                  <p className="font-medium text-gray-900 mt-1">{leave.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Today on Leave */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold text-gray-900">Today on Leave</h3>
            </div>
            <div className="space-y-3">
              {todayOnLeave.map((person) => (
                <div key={person.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-700">
                      {person.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{person.name}</p>
                    <p className="text-xs text-gray-500">{person.date} | {person.type}</p>
                  </div>
                </div>
              ))}
              {todayOnLeave.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">No one on leave today</p>
              )}
            </div>
          </div>

          {/* Holiday List */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <PartyPopper className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold text-gray-900">Holiday list</h3>
            </div>
            <div className="space-y-2">
              {holidayList.map((holiday, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">{holiday.name}</span>
                  <span className="text-sm text-gray-500">{holiday.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leaves Stats Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Leaves Stats</h2>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {myLeaves.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-900 font-medium">No leave records found</p>
            <p className="text-sm text-gray-500 mt-1">You haven't applied for any leaves yet.</p>
            <button
              onClick={() => setShowRequestModal(true)}
              className="mt-4 text-primary-500 text-sm font-medium hover:text-primary-600"
            >
              Apply for your first leave
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {myLeaves.map((leave) => (
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
