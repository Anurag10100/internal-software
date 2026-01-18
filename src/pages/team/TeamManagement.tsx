import React, { useState } from 'react';
import { Plus, Search, Settings, MoreVertical, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  profile: 'Standard' | 'Admin' | 'Manager';
  department: string;
  designation: string;
  inProbation: boolean;
  createdAt: string;
  lastLogin: string;
  status: 'Active' | 'Inactive';
  avatar?: string;
}

export default function TeamManagement() {
  const { users } = useApp();
  const [activeTab, setActiveTab] = useState<'users' | 'profiles'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Mock team members data
  const teamMembers: TeamMember[] = [
    { id: '1', name: 'Sachin', email: 'sachin@wowevents.com', profile: 'Admin', department: 'Management', designation: 'CEO', inProbation: false, createdAt: '15 Jan 2024', lastLogin: '07 Jan 2026', status: 'Active' },
    { id: '2', name: 'Amit T', email: 'amit@wowevents.com', profile: 'Manager', department: 'Tech', designation: 'Tech Lead', inProbation: false, createdAt: '20 Feb 2024', lastLogin: '07 Jan 2026', status: 'Active' },
    { id: '3', name: 'Tarun Fuloria', email: 'tarun@wowevents.com', profile: 'Standard', department: 'Tech', designation: 'Developer', inProbation: false, createdAt: '01 Mar 2024', lastLogin: '07 Jan 2026', status: 'Active' },
    { id: '4', name: 'Priya S', email: 'priya@wowevents.com', profile: 'Standard', department: 'HR', designation: 'HR Manager', inProbation: false, createdAt: '15 Mar 2024', lastLogin: '06 Jan 2026', status: 'Active' },
    { id: '5', name: 'Rahul K', email: 'rahul@wowevents.com', profile: 'Standard', department: '3D', designation: '3D Artist', inProbation: true, createdAt: '01 Apr 2024', lastLogin: '07 Jan 2026', status: 'Active' },
    { id: '6', name: 'Neeti Choudhary', email: 'neeti@wowevents.com', profile: 'Standard', department: 'Concept & Copy', designation: 'Content Writer', inProbation: false, createdAt: '10 Apr 2024', lastLogin: '05 Jan 2026', status: 'Active' },
    { id: '7', name: 'Animesh', email: 'animesh@wowevents.com', profile: 'Standard', department: '2D', designation: 'Graphic Designer', inProbation: false, createdAt: '20 Apr 2024', lastLogin: '07 Jan 2026', status: 'Active' },
    { id: '8', name: 'Mahima', email: 'mahima@wowevents.com', profile: 'Standard', department: 'Concept & Copy', designation: 'Copywriter', inProbation: true, createdAt: '01 May 2024', lastLogin: '07 Jan 2026', status: 'Active' },
    { id: '9', name: 'Arya', email: 'arya@wowevents.com', profile: 'Standard', department: 'Video', designation: 'Video Editor', inProbation: false, createdAt: '15 May 2024', lastLogin: '06 Jan 2026', status: 'Active' },
    { id: '10', name: 'Pankaj', email: 'pankaj@wowevents.com', profile: 'Standard', department: 'Ops & Production', designation: 'Operations Manager', inProbation: false, createdAt: '01 Jun 2024', lastLogin: '07 Jan 2026', status: 'Active' },
    { id: '11', name: 'Ankit Singh', email: 'ankit@wowevents.com', profile: 'Standard', department: 'Concept & Copy', designation: 'Senior Writer', inProbation: false, createdAt: '15 Jun 2024', lastLogin: '07 Jan 2026', status: 'Active' },
    { id: '12', name: 'Divya M', email: 'divya@wowevents.com', profile: 'Standard', department: 'NBD & CS', designation: 'Business Dev', inProbation: false, createdAt: '01 Jul 2024', lastLogin: '05 Jan 2026', status: 'Active' },
    { id: '13', name: 'Tanvi', email: 'tanvi@wowevents.com', profile: 'Standard', department: 'HR', designation: 'HR Executive', inProbation: true, createdAt: '15 Jul 2024', lastLogin: '07 Jan 2026', status: 'Active' },
    { id: '14', name: 'Prakrati Maheshwari', email: 'prakrati@wowevents.com', profile: 'Standard', department: 'NBD & CS', designation: 'Client Success', inProbation: false, createdAt: '01 Aug 2024', lastLogin: '06 Jan 2026', status: 'Active' },
  ];

  const stats = {
    totalMembers: 46,
    thisWeek: 5,
    lastWeek: 36,
    active: 46,
    inactive: 0,
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map(m => m.id));
    }
  };

  const handleSelectMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const getProfileBadgeColor = (profile: string) => {
    switch (profile) {
      case 'Admin':
        return 'bg-purple-100 text-purple-700';
      case 'Manager':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-gray-500" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-danger-500 text-white rounded-lg text-sm font-medium hover:bg-danger-600 transition-colors">
            <Plus className="w-4 h-4" />
            Add Team Member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'profiles'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Profiles
          </button>
        </nav>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-primary-50 rounded-xl p-4">
              <p className="text-xs font-medium text-primary-600 uppercase">Total Members</p>
              <p className="text-3xl font-bold text-primary-700 mt-1">{stats.totalMembers}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase">This Week</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.thisWeek}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase">Last Week</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.lastWeek}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase">Active</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase">Inactive</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.inactive}</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Team Members Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Profile</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Department</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Designation</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs">In Probation</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Created At</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Last Login</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => handleSelectMember(member.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-primary-700">
                              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getProfileBadgeColor(member.profile)}`}>
                          {member.profile}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{member.department}</td>
                      <td className="px-4 py-3 text-gray-600">{member.designation}</td>
                      <td className="px-4 py-3 text-center">
                        {member.inProbation ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-yellow-100 rounded-full">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{member.createdAt}</td>
                      <td className="px-4 py-3 text-gray-500">{member.lastLogin}</td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <select
                            value={member.status}
                            onChange={() => {}}
                            className={`appearance-none pr-8 pl-3 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer ${
                              member.status === 'Active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 pointer-events-none" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
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
        </>
      )}

      {activeTab === 'profiles' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">User Profiles</h3>
            <p className="text-gray-500">Manage user profiles and permissions here.</p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <span className="text-purple-700 font-bold">A</span>
                </div>
                <h4 className="font-medium text-gray-900">Admin</h4>
                <p className="text-xs text-gray-500 mt-1">Full system access</p>
                <p className="text-sm text-gray-600 mt-2">2 users</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <span className="text-blue-700 font-bold">M</span>
                </div>
                <h4 className="font-medium text-gray-900">Manager</h4>
                <p className="text-xs text-gray-500 mt-1">Team management access</p>
                <p className="text-sm text-gray-600 mt-2">8 users</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <span className="text-gray-700 font-bold">S</span>
                </div>
                <h4 className="font-medium text-gray-900">Standard</h4>
                <p className="text-xs text-gray-500 mt-1">Basic user access</p>
                <p className="text-sm text-gray-600 mt-2">36 users</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
