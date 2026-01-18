import { useState } from 'react';
import { Plus, Search, Settings, MoreVertical, ChevronDown, X, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

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
  const { success, info } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'profiles'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    department: '',
    designation: '',
    profile: 'Standard' as 'Standard' | 'Admin' | 'Manager',
  });

  // Initial team members data
  const initialTeamMembers: TeamMember[] = [
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

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);

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

  const handleStatusChange = (memberId: string, newStatus: 'Active' | 'Inactive') => {
    setTeamMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, status: newStatus } : m
    ));
    const member = teamMembers.find(m => m.id === memberId);
    if (member) {
      info('Status Updated', `${member.name}'s status changed to ${newStatus}`);
    }
  };

  const handleAddMember = () => {
    if (newMember.name && newMember.email && newMember.department && newMember.designation) {
      const member: TeamMember = {
        id: Date.now().toString(),
        name: newMember.name,
        email: newMember.email,
        profile: newMember.profile,
        department: newMember.department,
        designation: newMember.designation,
        inProbation: true,
        createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        lastLogin: '-',
        status: 'Active',
      };
      setTeamMembers(prev => [...prev, member]);
      success('Member Added', `${newMember.name} has been added to the team`);
      setNewMember({ name: '', email: '', department: '', designation: '', profile: 'Standard' });
      setShowAddModal(false);
    }
  };

  const handleEditMember = () => {
    if (editingMember) {
      setTeamMembers(prev => prev.map(m =>
        m.id === editingMember.id ? editingMember : m
      ));
      success('Member Updated', `${editingMember.name}'s profile has been updated`);
      setEditingMember(null);
    }
  };

  const handleDeleteMember = () => {
    if (deletingMember) {
      setTeamMembers(prev => prev.filter(m => m.id !== deletingMember.id));
      success('Member Removed', `${deletingMember.name} has been removed from the team`);
      setDeletingMember(null);
    }
  };

  const openSettings = () => {
    info('Settings', 'Team settings will open here');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={openSettings}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-500" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-danger-500 text-white rounded-lg text-sm font-medium hover:bg-danger-600 transition-colors"
          >
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
                            onChange={(e) => handleStatusChange(member.id, e.target.value as 'Active' | 'Inactive')}
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
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === member.id ? null : member.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          {actionMenuOpen === member.id && (
                            <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                              <button
                                onClick={() => {
                                  setEditingMember(member);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingMember(member);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
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

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Add Team Member</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="email@wowevents.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={newMember.department}
                    onChange={(e) => setNewMember({ ...newMember, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Tech"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={newMember.designation}
                    onChange={(e) => setNewMember({ ...newMember, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Developer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile</label>
                <select
                  value={newMember.profile}
                  onChange={(e) => setNewMember({ ...newMember, profile: e.target.value as 'Standard' | 'Admin' | 'Manager' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Standard">Standard</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                className="flex-1 px-4 py-2 text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Edit Team Member</h2>
              <button
                onClick={() => setEditingMember(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingMember.email}
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editingMember.department}
                    onChange={(e) => setEditingMember({ ...editingMember, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={editingMember.designation}
                    onChange={(e) => setEditingMember({ ...editingMember, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile</label>
                <select
                  value={editingMember.profile}
                  onChange={(e) => setEditingMember({ ...editingMember, profile: e.target.value as 'Standard' | 'Admin' | 'Manager' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Standard">Standard</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setEditingMember(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditMember}
                className="flex-1 px-4 py-2 text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 text-center">Remove Team Member?</h2>
              <p className="text-gray-500 text-center mt-2">
                Are you sure you want to remove "{deletingMember.name}" from the team? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setDeletingMember(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMember}
                className="flex-1 px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
