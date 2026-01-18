import { useState } from 'react';
import { Calendar, Clock, MapPin, Image } from 'lucide-react';

export default function CheckIns() {
  const [dateFilter, setDateFilter] = useState('today');

  // Mock check-in data
  const checkIns = [
    {
      id: '1',
      date: '2026-01-18',
      checkInTime: '9:45 AM',
      checkOutTime: '6:30 PM',
      location: 'In Office (Gurugram)',
      status: 'on_time',
      priorities: ['Complete project documentation', 'Team meeting at 3 PM', 'Review pull requests'],
    },
    {
      id: '2',
      date: '2026-01-17',
      checkInTime: '10:15 AM',
      checkOutTime: '7:00 PM',
      location: 'Work From Home',
      status: 'late',
      priorities: ['Client call at 11 AM', 'Bug fixes', 'Sprint planning'],
    },
    {
      id: '3',
      date: '2026-01-16',
      checkInTime: '9:30 AM',
      checkOutTime: '6:00 PM',
      location: 'In Office (Delhi)',
      status: 'on_time',
      priorities: ['Design review', 'Update dashboards', 'Vendor meeting'],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_time':
        return 'bg-green-100 text-green-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'half_day':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on_time':
        return 'On Time';
      case 'late':
        return 'Late';
      case 'half_day':
        return 'Half Day';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Check-ins</h1>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Check-ins</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{checkIns.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">On Time</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {checkIns.filter(c => c.status === 'on_time').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Late</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {checkIns.filter(c => c.status === 'late').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Half Day</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {checkIns.filter(c => c.status === 'half_day').length}
          </p>
        </div>
      </div>

      {/* Check-in List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="divide-y divide-gray-100">
          {checkIns.map((checkIn) => (
            <div key={checkIn.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {new Date(checkIn.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(checkIn.status)}`}>
                        {getStatusLabel(checkIn.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        In: {checkIn.checkInTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Out: {checkIn.checkOutTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {checkIn.location}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Daily Priorities:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {checkIn.priorities.map((priority, index) => (
                          <li key={index}>{priority}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
