import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Clock,
  MapPin,
  Plus,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Calendar,
  Users,
  Mail,
  Hash,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Settings() {
  const { hrmsSettings, setHrmsSettings, users } = useApp();
  const [activeTab, setActiveTab] = useState('time');

  // Time Settings State
  const [lateTime, setLateTime] = useState(hrmsSettings.timeSettings.lateTime);
  const [halfDayTime, setHalfDayTime] = useState(hrmsSettings.timeSettings.halfDayTime);

  // Location Modal State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<{ id: string; name: string } | null>(null);
  const [newLocationName, setNewLocationName] = useState('');

  // Leave Type Modal State
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<any>(null);

  // Holiday Modal State
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [selectedYear, setSelectedYear] = useState(2026);

  // HOD Selection
  const [hodSearch, setHodSearch] = useState('');

  // Slack Settings
  const [slackEnabled, setSlackEnabled] = useState(hrmsSettings.slackNotifications.enabled);
  const [slackChannelId, setSlackChannelId] = useState(hrmsSettings.slackNotifications.channelId);

  const handleSaveTimeSettings = () => {
    setHrmsSettings(prev => ({
      ...prev,
      timeSettings: { lateTime, halfDayTime },
    }));
  };

  const handleToggleLocationVisibility = (id: string) => {
    setHrmsSettings(prev => ({
      ...prev,
      locationOptions: prev.locationOptions.map(loc =>
        loc.id === id ? { ...loc, isVisible: !loc.isVisible } : loc
      ),
    }));
  };

  const handleDeleteLocation = (id: string) => {
    setHrmsSettings(prev => ({
      ...prev,
      locationOptions: prev.locationOptions.filter(loc => loc.id !== id),
    }));
  };

  const handleSaveLocation = () => {
    if (editingLocation) {
      setHrmsSettings(prev => ({
        ...prev,
        locationOptions: prev.locationOptions.map(loc =>
          loc.id === editingLocation.id ? { ...loc, name: newLocationName } : loc
        ),
      }));
    } else {
      setHrmsSettings(prev => ({
        ...prev,
        locationOptions: [
          ...prev.locationOptions,
          { id: Date.now().toString(), name: newLocationName, isVisible: true },
        ],
      }));
    }
    setShowLocationModal(false);
    setNewLocationName('');
    setEditingLocation(null);
  };

  const handleToggleLeaveTypeActive = (id: string) => {
    setHrmsSettings(prev => ({
      ...prev,
      leaveTypes: prev.leaveTypes.map(lt =>
        lt.id === id ? { ...lt, isActive: !lt.isActive } : lt
      ),
    }));
  };

  const handleSaveWeeklyOff = () => {
    // Save is implicit through state
    console.log('Weekly off settings saved');
  };

  const handleAddHoliday = () => {
    if (newHoliday.name && newHoliday.date) {
      setHrmsSettings(prev => ({
        ...prev,
        holidays: [
          ...prev.holidays,
          {
            id: Date.now().toString(),
            name: newHoliday.name,
            date: newHoliday.date,
            year: selectedYear,
          },
        ],
      }));
      setNewHoliday({ name: '', date: '' });
      setShowHolidayModal(false);
    }
  };

  const handleDeleteHoliday = (id: string) => {
    setHrmsSettings(prev => ({
      ...prev,
      holidays: prev.holidays.filter(h => h.id !== id),
    }));
  };

  const handleAddHOD = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user && !hrmsSettings.hodUsers.find(h => h.id === userId)) {
      setHrmsSettings(prev => ({
        ...prev,
        hodUsers: [...prev.hodUsers, user],
      }));
    }
  };

  const handleRemoveHOD = (userId: string) => {
    setHrmsSettings(prev => ({
      ...prev,
      hodUsers: prev.hodUsers.filter(h => h.id !== userId),
    }));
  };

  const filteredHolidays = hrmsSettings.holidays.filter(h => h.year === selectedYear);

  const weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const weekOffOptions = [
    { value: 'both_weeks', label: 'Both Weeks' },
    { value: 'week1_only', label: 'Week 1 Only (Odd)' },
    { value: 'week2_only', label: 'Week 2 Only (Even)' },
    { value: 'not_weekly_off', label: 'Not Weekly Off' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-gray-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HRMS Settings</h1>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Time Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Time Settings</h2>
          <p className="text-sm text-gray-500 mb-4">Configure late and half day times</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Late Time</label>
              <input
                type="text"
                value={lateTime}
                onChange={(e) => setLateTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Check-ins after this time will be marked as late</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Half Day Time</label>
              <input
                type="text"
                value={halfDayTime}
                onChange={(e) => setHalfDayTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Check-ins after this time will be marked as half day</p>
            </div>

            <button
              onClick={handleSaveTimeSettings}
              className="w-full py-2 bg-danger-500 text-white rounded-lg text-sm font-medium hover:bg-danger-600 transition-colors"
            >
              Save Time Settings
            </button>
          </div>
        </div>

        {/* Location Options */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Location Options</h2>
              <p className="text-sm text-gray-500">
                {hrmsSettings.locationOptions.filter(l => l.isVisible).length} visible, {hrmsSettings.locationOptions.filter(l => !l.isVisible).length} hidden
              </p>
            </div>
            <button
              onClick={() => {
                setEditingLocation(null);
                setNewLocationName('');
                setShowLocationModal(true);
              }}
              className="p-2 bg-danger-500 text-white rounded-lg hover:bg-danger-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {hrmsSettings.locationOptions.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <span className="text-sm text-gray-700">{location.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleLocationVisibility(location.id)}
                    className={`p-1.5 rounded transition-colors ${
                      location.isVisible ? 'text-primary-600 hover:bg-primary-50' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {location.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setEditingLocation(location);
                      setNewLocationName(location.name);
                      setShowLocationModal(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLocation(location.id)}
                    className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slack Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Slack Notifications</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Send check-in/check-out messages to Slack</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Enable Slack Notifications</span>
              <button
                onClick={() => setSlackEnabled(!slackEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  slackEnabled ? 'bg-primary-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    slackEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slack Channel ID</label>
              <input
                type="text"
                value={slackChannelId}
                onChange={(e) => setSlackChannelId(e.target.value)}
                placeholder="C024F4VK0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can find the channel ID in Slack by right-clicking the channel → View channel details
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Leave Types */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Leave Types</h2>
          <p className="text-sm text-gray-500 mb-4">
            {hrmsSettings.leaveTypes.filter(lt => lt.isActive).length} active, {hrmsSettings.leaveTypes.filter(lt => !lt.isActive).length} inactive
          </p>

          <div className="space-y-2">
            {hrmsSettings.leaveTypes.map((leaveType) => (
              <div
                key={leaveType.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">{leaveType.name}</span>
                  <span className="text-xs text-gray-500">
                    ({leaveType.daysPerYear === 'unlimited' ? 'Unlimited' : `${leaveType.daysPerYear}/year`})
                  </span>
                  {leaveType.requiresDocument && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">D</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleLeaveTypeActive(leaveType.id)}
                    className={`p-1.5 rounded transition-colors ${
                      leaveType.isActive ? 'text-primary-600 hover:bg-primary-50' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {leaveType.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Off Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Weekly Off Settings</h2>
          </div>

          <div className="space-y-3">
            {weekDays.map((day) => (
              <div key={day} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                <select
                  value={hrmsSettings.weeklyOffSettings[day]}
                  onChange={(e) => {
                    setHrmsSettings(prev => ({
                      ...prev,
                      weeklyOffSettings: {
                        ...prev.weeklyOffSettings,
                        [day]: e.target.value as any,
                      },
                    }));
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {weekOffOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveWeeklyOff}
            className="w-full mt-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            Save Settings
          </button>
        </div>

        {/* Working Day Overrides */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Working Day Overrides</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Override specific dates to be working days even if they fall on weekly off days
          </p>

          <div className="flex gap-2">
            <input
              type="date"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button className="px-4 py-2 bg-danger-500 text-white rounded-lg text-sm font-medium hover:bg-danger-600 transition-colors">
              + Add
            </button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            No overrides added
          </div>
        </div>
      </div>

      {/* Third Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Head of Department (HOD) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Head of Department (HOD)</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Select users who will act as Head of Department</p>

          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Select HOD users..."
                value={hodSearch}
                onChange={(e) => setHodSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <p className="text-sm font-medium text-gray-700">
              Selected HOD Users ({hrmsSettings.hodUsers.length})
            </p>

            <div className="space-y-2">
              {hrmsSettings.hodUsers.map((hod) => (
                <div
                  key={hod.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{hod.name}</p>
                    <p className="text-xs text-gray-500">{hod.email}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveHOD(hod.id)}
                    className="p-1 text-gray-400 hover:text-danger-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* HR Email Recipients */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">HR Email Recipients</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Select users who will receive HR-related emails</p>

          <div className="relative">
            <input
              type="text"
              placeholder="Select users..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            No HR email recipients selected
          </div>
        </div>

        {/* Holidays */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Holidays</h2>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
              <button
                onClick={() => setShowHolidayModal(true)}
                className="px-3 py-1 bg-primary-500 text-white rounded text-sm font-medium hover:bg-primary-600 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-3">
            Manage company holidays and festivals
          </p>

          <p className="text-sm font-medium text-gray-700 mb-2">
            {selectedYear} Holidays ({filteredHolidays.length})
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredHolidays.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{holiday.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(holiday.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteHoliday(holiday.id)}
                    className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingLocation ? 'Edit Location' : 'Add Location'}
              </h3>
              <button
                onClick={() => setShowLocationModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name
                </label>
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="e.g., In Office (Mumbai)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLocation}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Add Holiday</h3>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Holiday Name
                </label>
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Christmas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowHolidayModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHoliday}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600"
                >
                  Add Holiday
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
