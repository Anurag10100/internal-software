import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Edit3,
  Loader2,
  X,
  Check,
  Mail,
  Phone,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useBoothPilot } from '../../../context/BoothPilotContext';
import type { BPTeamMember, BPUserCreate, BPUserUpdate } from '../../../types/boothpilot';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: BPTeamMember;
}

const UserModal: React.FC<ModalProps & { onSave: (data: BPUserCreate | BPUserUpdate) => Promise<void> }> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    phone: user?.phone || '',
    role: user?.role || 'staff',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        phone: user.phone || '',
        role: user.role,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'staff',
      });
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl transform transition-all sm:max-w-md sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {user ? 'Edit Team Member' : 'Add Team Member'}
                </h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    disabled={!!user}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {user && <span className="text-gray-400">(leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    required={!user}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {user ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const BPSettingsUsers: React.FC = () => {
  const { teamMembers, fetchTeamMembers, createUser, updateUser, user: currentUser } = useBoothPilot();
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<BPTeamMember | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      await fetchTeamMembers();
      setLoading(false);
    };
    load();
  }, [fetchTeamMembers]);

  const handleAdd = () => {
    setEditingUser(undefined);
    setModalOpen(true);
  };

  const handleEdit = (member: BPTeamMember) => {
    setEditingUser(member);
    setModalOpen(true);
  };

  const handleSave = async (data: BPUserCreate | BPUserUpdate) => {
    if (editingUser) {
      await updateUser(editingUser.id, data);
    } else {
      await createUser(data as BPUserCreate);
    }
  };

  const handleToggleActive = async (member: BPTeamMember) => {
    await updateUser(member.id, { isActive: !member.isActive });
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    staff: 'bg-gray-100 text-gray-700',
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-500">Manage your booth team</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Team List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {teamMembers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No team members</h3>
            <p className="text-gray-500 mb-4">Add your first team member to get started</p>
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className={`flex items-center gap-4 p-4 ${!member.isActive ? 'bg-gray-50 opacity-60' : ''}`}
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-lg">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-medium text-gray-900">{member.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${roleColors[member.role]}`}>
                      {member.role}
                    </span>
                    {!member.isActive && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {member.email}
                    </span>
                    {member.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {member.phone}
                      </span>
                    )}
                  </div>
                  {member.lastLoginAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      Last login: {new Date(member.lastLoginAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {member.id !== currentUser?.id && (
                    <>
                      <button
                        onClick={() => handleToggleActive(member)}
                        className={`p-2 rounded-lg transition-colors ${
                          member.isActive
                            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={member.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {member.isActive ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleEdit(member)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <UserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        user={editingUser}
        onSave={handleSave}
      />
    </div>
  );
};

export default BPSettingsUsers;
