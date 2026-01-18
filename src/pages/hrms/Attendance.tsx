import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Attendance() {
  const { users } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1)); // January 2026

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Mock attendance data
  const getAttendanceStatus = (userId: string, day: number) => {
    const rand = Math.random();
    if (rand > 0.9) return 'absent';
    if (rand > 0.8) return 'late';
    if (rand > 0.7) return 'half_day';
    if (rand > 0.6) return 'wfh';
    return 'present';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-500';
      case 'late':
        return 'bg-yellow-500';
      case 'half_day':
        return 'bg-orange-500';
      case 'absent':
        return 'bg-red-500';
      case 'wfh':
        return 'bg-blue-500';
      case 'holiday':
        return 'bg-purple-500';
      default:
        return 'bg-gray-300';
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-medium min-w-[150px] text-center">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-green-500"></span>
          <span className="text-sm text-gray-600">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-yellow-500"></span>
          <span className="text-sm text-gray-600">Late</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-orange-500"></span>
          <span className="text-sm text-gray-600">Half Day</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-500"></span>
          <span className="text-sm text-gray-600">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-blue-500"></span>
          <span className="text-sm text-gray-600">WFH</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-purple-500"></span>
          <span className="text-sm text-gray-600">Holiday</span>
        </div>
      </div>

      {/* Attendance Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary-500 text-white">
                <th className="px-4 py-3 text-left font-medium sticky left-0 bg-primary-500 z-10">
                  Employee
                </th>
                {days.map((day) => {
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <th
                      key={day}
                      className={`px-2 py-3 text-center font-medium min-w-[40px] ${
                        isWeekend ? 'bg-danger-500' : ''
                      }`}
                    >
                      <div>{day}</div>
                      <div className="text-xs font-normal opacity-75">
                        {date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                      </div>
                    </th>
                  );
                })}
                <th className="px-4 py-3 text-center font-medium bg-primary-600">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                let presentDays = 0;
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary-700">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 whitespace-nowrap">
                          {user.name}
                        </span>
                      </div>
                    </td>
                    {days.map((day) => {
                      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                      const isWeekend = date.getDay() === 0;
                      const status = isWeekend ? 'holiday' : getAttendanceStatus(user.id, day);
                      if (status === 'present' || status === 'late' || status === 'wfh') {
                        presentDays++;
                      } else if (status === 'half_day') {
                        presentDays += 0.5;
                      }
                      return (
                        <td key={day} className="px-2 py-3 text-center">
                          <span
                            className={`inline-block w-6 h-6 rounded ${getStatusColor(status)}`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-medium">{presentDays}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
