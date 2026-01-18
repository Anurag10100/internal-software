import { useState, useMemo } from 'react';
import { Download, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';

type AttendanceStatus = 'P' | 'L' | 'LV' | 'HD' | 'HO' | 'WO' | 'A';

interface EmployeeAttendance {
  id: string;
  name: string;
  email: string;
  attendance: Record<number, AttendanceStatus>;
}

export default function Attendance() {
  const { hrmsSettings } = useApp();
  const [selectedMonth, setSelectedMonth] = useState('January');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [searchQuery, setSearchQuery] = useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthIndex = months.indexOf(selectedMonth);
  const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Working days calculation (excluding Sundays and Saturday W1)
  const workingDays = days.filter(day => {
    const date = new Date(selectedYear, monthIndex, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) return false; // Sunday
    if (dayOfWeek === 6) {
      // Saturday - check if week 1 (odd)
      const weekNumber = Math.ceil(day / 7);
      if (weekNumber % 2 === 1) return false;
    }
    return true;
  }).length;

  // Generate mock attendance data
  const generateAttendance = (userId: string): Record<number, AttendanceStatus> => {
    const attendance: Record<number, AttendanceStatus> = {};
    const seed = userId.charCodeAt(0);

    days.forEach(day => {
      const date = new Date(selectedYear, monthIndex, day);
      const dayOfWeek = date.getDay();

      // Check if holiday
      const isHoliday = hrmsSettings.holidays.some(h => {
        const holidayDate = new Date(h.date);
        return holidayDate.getDate() === day &&
               holidayDate.getMonth() === monthIndex &&
               holidayDate.getFullYear() === selectedYear;
      });

      if (isHoliday) {
        attendance[day] = 'HO';
      } else if (dayOfWeek === 0) {
        // Sunday
        attendance[day] = 'WO';
      } else if (dayOfWeek === 6) {
        // Saturday - check week number
        const weekNumber = Math.ceil(day / 7);
        if (weekNumber % 2 === 1) {
          attendance[day] = 'WO';
        } else {
          // Regular working Saturday
          const rand = ((seed * day) % 100) / 100;
          if (rand > 0.9) attendance[day] = 'A';
          else if (rand > 0.8) attendance[day] = 'L';
          else if (rand > 0.7) attendance[day] = 'HD';
          else if (rand > 0.65) attendance[day] = 'LV';
          else attendance[day] = 'P';
        }
      } else {
        // Weekday
        const rand = ((seed * day) % 100) / 100;
        if (rand > 0.9) attendance[day] = 'A';
        else if (rand > 0.8) attendance[day] = 'L';
        else if (rand > 0.7) attendance[day] = 'HD';
        else if (rand > 0.65) attendance[day] = 'LV';
        else attendance[day] = 'P';
      }
    });

    return attendance;
  };

  // Extended user list with attendance data
  const employees: EmployeeAttendance[] = useMemo(() => [
    { id: '1', name: 'Aarohi', email: 'aarohi@wowevents.in', attendance: generateAttendance('1') },
    { id: '2', name: 'Aditi', email: 'aditi@wowevents.in', attendance: generateAttendance('2') },
    { id: '3', name: 'Amit Talwar', email: 'amit@wowevents.in', attendance: generateAttendance('3') },
    { id: '4', name: 'Animesh', email: 'animesh@wowevents.in', attendance: generateAttendance('4') },
    { id: '5', name: 'Ankush Kumar Jha', email: 'wowaccounts@wowevents.in', attendance: generateAttendance('5') },
    { id: '6', name: 'Aradhana', email: 'aradhana@wowevents.in', attendance: generateAttendance('6') },
    { id: '7', name: 'Arya', email: 'arya@wowevents.in', attendance: generateAttendance('7') },
    { id: '8', name: 'Ayushi', email: 'careers@wowevents.in', attendance: generateAttendance('8') },
    { id: '9', name: 'Bhanu', email: 'bhanu@wowevents.in', attendance: generateAttendance('9') },
    { id: '10', name: 'Sachin Talwar', email: 'sachin@wowevents.in', attendance: generateAttendance('10') },
  ], [selectedMonth, selectedYear]);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusStyle = (status: AttendanceStatus) => {
    switch (status) {
      case 'P': return 'bg-green-500 text-white';
      case 'L': return 'bg-yellow-500 text-white';
      case 'LV': return 'bg-purple-500 text-white';
      case 'HD': return 'bg-blue-500 text-white';
      case 'HO': return 'bg-orange-500 text-white';
      case 'WO': return 'bg-gray-400 text-white';
      case 'A': return 'bg-red-500 text-white';
      default: return 'bg-gray-200 text-gray-600';
    }
  };

  const calculateStats = (attendance: Record<number, AttendanceStatus>) => {
    let present = 0;
    Object.values(attendance).forEach(status => {
      if (status === 'P') present += 1;
      else if (status === 'HD') present += 0.5;
    });
    const presentPercent = workingDays > 0 ? ((present / workingDays) * 100).toFixed(2) : '0.00';
    return { present, presentPercent };
  };

  const currentDate = new Date();
  const todayFormatted = `${currentDate.getDate()} ${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {months.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-48 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
            <Download className="w-4 h-4" />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 uppercase">Working Days</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{workingDays}</p>
          <p className="text-sm text-gray-500">{selectedMonth} {selectedYear}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 uppercase">Current Date</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{todayFormatted}</p>
          <p className="text-sm text-gray-500">Today's date</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">P</span>
          <span className="text-sm text-gray-600">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-medium">L</span>
          <span className="text-sm text-gray-600">Late</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-medium">LV</span>
          <span className="text-sm text-gray-600">Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">HD</span>
          <span className="text-sm text-gray-600">Half Day</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-medium">HO</span>
          <span className="text-sm text-gray-600">Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium">WO</span>
          <span className="text-sm text-gray-600">Sunday, Saturday (W1)</span>
        </div>
      </div>

      {/* Attendance Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary-500 text-white">
                <th className="px-3 py-3 text-left font-medium sticky left-0 bg-primary-500 z-10 min-w-[50px]">NO.</th>
                <th className="px-3 py-3 text-left font-medium sticky left-[50px] bg-primary-500 z-10 min-w-[180px]">NAME</th>
                <th className="px-3 py-3 text-center font-medium min-w-[80px]">PRESENT %</th>
                <th className="px-3 py-3 text-center font-medium min-w-[60px]">TOTAL</th>
                {days.map((day) => {
                  const date = new Date(selectedYear, monthIndex, day);
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 3);
                  return (
                    <th key={day} className="px-1 py-3 text-center font-medium min-w-[36px]">
                      <div className="text-xs">{day}</div>
                      <div className="text-[10px] font-normal opacity-75">{dayName}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((employee, index) => {
                const stats = calculateStats(employee.attendance);
                return (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-500 sticky left-0 bg-white z-10">{index + 1}</td>
                    <td className="px-3 py-3 sticky left-[50px] bg-white z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary-700">
                            {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 whitespace-nowrap">{employee.name}</p>
                          <p className="text-xs text-gray-500">{employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">{stats.presentPercent}%</td>
                    <td className="px-3 py-3 text-center font-medium text-gray-900">{stats.present}</td>
                    {days.map((day) => {
                      const status = employee.attendance[day];
                      return (
                        <td key={day} className="px-1 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
                            {status}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">No employees found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
