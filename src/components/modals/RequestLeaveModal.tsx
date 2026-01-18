import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface RequestLeaveModalProps {
  onClose: () => void;
}

export default function RequestLeaveModal({ onClose }: RequestLeaveModalProps) {
  const { hrmsSettings, setLeaveRequests, currentUser } = useApp();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [leaveCategory, setLeaveCategory] = useState('full_day');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [hodId, setHodId] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) return;

    const selectedLeaveType = hrmsSettings.leaveTypes.find(lt => lt.id === leaveTypeId);
    const selectedHod = hrmsSettings.hodUsers.find(h => h.id === hodId);

    if (!selectedLeaveType || !selectedHod) return;

    const newLeaveRequest = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      fromDate,
      toDate,
      leaveType: selectedLeaveType,
      leaveCategory: leaveCategory as 'full_day' | 'half_day' | 'short_leave',
      hodId: selectedHod.id,
      hodName: selectedHod.name,
      reason,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    setLeaveRequests(prev => [...prev, newLeaveRequest]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Request Leave</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Leave Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave <span className="text-danger-500">*</span>
            </label>
            <select
              value={leaveCategory}
              onChange={(e) => setLeaveCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="full_day">Full Day</option>
              <option value="half_day">Half Day</option>
              <option value="short_leave">Short Leave</option>
            </select>
          </div>

          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Type <span className="text-danger-500">*</span>
            </label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-primary-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">- Select -</option>
              {hrmsSettings.leaveTypes
                .filter(lt => lt.isActive)
                .map((leaveType) => (
                  <option key={leaveType.id} value={leaveType.id}>
                    {leaveType.name}
                  </option>
                ))}
            </select>
          </div>

          {/* HOD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HOD <span className="text-danger-500">*</span>
            </label>
            <select
              value={hodId}
              onChange={(e) => setHodId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select HOD</option>
              {hrmsSettings.hodUsers.map((hod) => (
                <option key={hod.id} value={hod.id}>
                  {hod.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Reason (Required) <span className="text-danger-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={4}
              placeholder="Enter your leave reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-danger-500 text-white rounded-lg text-sm font-medium hover:bg-danger-600 transition-colors"
            >
              Request Leave
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
