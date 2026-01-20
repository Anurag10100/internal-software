import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  Calendar,
  Users,
  Bell,
  Plus,
  Clock,
  MapPin,
  Cake,
  Gift,
  Star,
  Heart,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../../components/ui/Charts';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'general' | 'urgent' | 'policy' | 'event';
  priority: 'low' | 'medium' | 'high';
  author_name: string;
  published_at: string;
  is_read: boolean;
}

interface CompanyEvent {
  id: string;
  title: string;
  description: string;
  type: 'meeting' | 'celebration' | 'training' | 'social' | 'other';
  start_date: string;
  end_date?: string;
  location: string;
  is_virtual: boolean;
  attendees_count: number;
  is_registered: boolean;
}

interface Celebration {
  birthdays: { id: string; name: string; date: string }[];
  anniversaries: { id: string; name: string; years: number; date: string }[];
}

export default function AnnouncementCenter() {
  const { success, error: showError } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [celebrations, setCelebrations] = useState<Celebration | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'announcements' | 'events' | 'celebrations'>('announcements');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [announcementsRes, eventsRes, celebrationsRes] = await Promise.all([
        api.getAnnouncements(),
        api.getCompanyEvents(),
        api.getCelebrations(),
      ]);

      if (announcementsRes.data) setAnnouncements(announcementsRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (celebrationsRes.data) setCelebrations(celebrationsRes.data);
    } catch (error) {
      showError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markAnnouncementRead(id);
      setAnnouncements(prev =>
        prev.map(a => a.id === id ? { ...a, is_read: true } : a)
      );
    } catch (error) {
      // Silent fail
    }
  };

  const handleRegisterEvent = async (id: string) => {
    try {
      const result = await api.registerForEvent(id);
      if (result.data) {
        success('Registered for event');
        fetchData();
      }
    } catch (error) {
      showError('Failed to register');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return AlertCircle;
      case 'medium': return Info;
      default: return Bell;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-600 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      default: return 'bg-blue-100 text-blue-600 border-blue-200';
    }
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      meeting: 'bg-blue-100 text-blue-700',
      celebration: 'bg-pink-100 text-pink-700',
      training: 'bg-purple-100 text-purple-700',
      social: 'bg-green-100 text-green-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const filteredAnnouncements = announcements.filter(a => {
    if (filter === 'unread') return !a.is_read;
    return true;
  });

  const unreadCount = announcements.filter(a => !a.is_read).length;
  const upcomingEvents = events.filter(e => new Date(e.start_date) >= new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements & Events</h1>
          <p className="text-gray-500">Stay updated with company news and events</p>
        </div>
        <Link
          to="/announcements/new"
          className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2 w-fit"
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Unread"
          value={unreadCount}
          icon={<Bell className="w-5 h-5 text-red-600" />}
          iconBg="bg-red-100"
        />
        <StatCard
          title="Announcements"
          value={announcements.length}
          icon={<Megaphone className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Upcoming Events"
          value={upcomingEvents.length}
          icon={<Calendar className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100"
        />
        <StatCard
          title="This Month"
          value={(celebrations?.birthdays.length || 0) + (celebrations?.anniversaries.length || 0)}
          icon={<Cake className="w-5 h-5 text-pink-600" />}
          iconBg="bg-pink-100"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex">
            {['announcements', 'events', 'celebrations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'announcements' && unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === 'announcements' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Announcements</option>
                  <option value="unread">Unread Only</option>
                </select>
              </div>

              <div className="space-y-4">
                {filteredAnnouncements.length === 0 ? (
                  <div className="text-center py-12">
                    <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No announcements</p>
                  </div>
                ) : (
                  filteredAnnouncements.map((announcement) => {
                    const PriorityIcon = getPriorityIcon(announcement.priority);
                    return (
                      <div
                        key={announcement.id}
                        onClick={() => handleMarkRead(announcement.id)}
                        className={`p-5 border rounded-xl transition-all cursor-pointer ${
                          !announcement.is_read
                            ? 'border-primary-200 bg-primary-50/50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getPriorityColor(announcement.priority)}`}>
                            <PriorityIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                              {!announcement.is_read && (
                                <span className="w-2 h-2 bg-primary-500 rounded-full" />
                              )}
                            </div>
                            <p className="text-gray-600 text-sm line-clamp-2">{announcement.content}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                              <span>{announcement.author_name}</span>
                              <span>{new Date(announcement.published_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No upcoming events</p>
                </div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="p-5 border border-gray-100 rounded-xl hover:border-primary-200 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex flex-col items-center justify-center text-white">
                          <span className="text-xs font-medium">
                            {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold">
                            {new Date(event.start_date).getDate()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{event.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getEventTypeColor(event.type)}`}>
                              {event.type}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">{event.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.is_virtual ? 'Virtual' : event.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {event.attendees_count} attending
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        {event.is_registered ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Registered
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRegisterEvent(event.id)}
                            className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
                          >
                            Register
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'celebrations' && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Birthdays */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                    <Cake className="w-4 h-4 text-pink-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Birthdays This Month</h3>
                </div>
                <div className="space-y-3">
                  {celebrations?.birthdays && celebrations.birthdays.length > 0 ? (
                    celebrations.birthdays.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl border border-pink-100"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-medium">
                          {person.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{person.name}</p>
                          <p className="text-sm text-pink-600">
                            {new Date(person.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        <button className="p-2 text-pink-400 hover:text-pink-600 hover:bg-pink-100 rounded-lg transition-colors">
                          <Gift className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-gray-500">No birthdays this month</p>
                  )}
                </div>
              </div>

              {/* Work Anniversaries */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Work Anniversaries</h3>
                </div>
                <div className="space-y-3">
                  {celebrations?.anniversaries && celebrations.anniversaries.length > 0 ? (
                    celebrations.anniversaries.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                          {person.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{person.name}</p>
                          <p className="text-sm text-purple-600">{person.years} year{person.years > 1 ? 's' : ''} at company</p>
                        </div>
                        <button className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors">
                          <Heart className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-gray-500">No anniversaries this month</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
