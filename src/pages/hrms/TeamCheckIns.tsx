import React, { useState } from 'react';
import { Users, UserCheck, Clock, Calendar as CalendarIcon, Coffee, X, Search, Image } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'present' | 'late' | 'half_day' | 'leave' | 'absent';
  selfieUrl?: string;
  presence?: string;
  location?: string;
}

export default function TeamCheckIns() {
  const { users } = useApp();
  const [selectedDate, setSelectedDate] = useState('2026-01-07');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock team check-in data
  const teamMembers: TeamMember[] = [
    { id: '1', name: 'Divya Mahour', email: 'mktg@wowevents.in', status: 'absent' },
    { id: '2', name: 'Rajat', email: 'rajat@wowevents.in', status: 'absent' },
    { id: '3', name: 'Roopali Talwar', email: 'roopali@wowevents.in', status: 'absent' },
    { id: '4', name: 'Shweta', email: 'shweta@wowevents.in', status: 'absent' },
    { id: '5', name: 'WOWBOT', email: 'wowbot@wowevents.in', status: 'absent' },
    { id: '6', name: 'Sachin Talwar', email: 'sachin@wowevents.in', checkInTime: '9:30 AM', checkOutTime: '6:30 PM', status: 'present', location: 'In Office (Gurugram)' },
    { id: '7', name: 'Amit Talwar', email: 'amit@wowevents.in', checkInTime: '10:45 AM', status: 'late', location: 'Work From Home' },
    { id: '8', name: 'Priya Sharma', email: 'priya@wowevents.in', checkInTime: '11:15 AM', status: 'half_day', location: 'In Office (Delhi)' },
    { id: '9', name: 'Neeti Choudhary', email: 'neeti@wowevents.in', status: 'leave' },
    { id: '10', name: 'Animesh', email: 'animesh@wowevents.in', status: 'leave' },
  ];

  const stats = {
    totalEmployees: 46,
    present: 39,
    late: 18,
    halfDay: 13,
    leave: 2,
    absent: 5,
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Present</span>;
      case 'late':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Late</span>;
      case 'half_day':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Half Day</span>;
      case 'leave':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Leave</span>;
      case 'absent':
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Absent</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Team Check-in</h1>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mb-3">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalEmployees}</p>
          <p className="text-sm text-gray-500">Total Employees</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg mb-3">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.present}</p>
          <p className="text-sm text-gray-500">Present</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg mb-3">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-600">{stats.late}</p>
          <p className="text-sm text-gray-500">Late</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mb-3">
            <Coffee className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{stats.halfDay}</p>
          <p className="text-sm text-gray-500">Half Day</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg mb-3">
            <CalendarIcon className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-600">{stats.leave}</p>
          <p className="text-sm text-gray-500">Leave</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg mb-3">
            <X className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.absent}</p>
          <p className="text-sm text-gray-500">Absent</p>
        </div>
      </div>

      {/* Team Check-ins Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Team Check-ins</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, location, status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-80 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  <div className="flex items-center gap-1">
                    NAME
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">CHECK-IN</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">CHECK-OUT</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">STATUS</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">SELFIE</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">PRESENCE</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">LOCATION</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.map((member, index) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                        member.avatar ? '' : 'bg-primary-100 text-primary-700'
                      }`}>
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          member.name.split(' ').map(n => n[0]).join('').slice(0, 2)
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {member.checkInTime || 'Not Checked In'}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {member.checkOutTime || '-'}
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(member.status)}
                  </td>
                  <td className="px-4 py-4 text-gray-500">
                    {member.selfieUrl ? (
                      <Image className="w-5 h-5 text-primary-500" />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-500">
                    {member.presence || '-'}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {member.location || '-'}
                  </td>
                  <td className="px-4 py-4 text-gray-500">
                    -
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMembers.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">No team members found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
