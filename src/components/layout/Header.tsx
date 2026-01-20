import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  LogOut,
  User,
  ChevronDown,
  Shield,
  Settings,
  CheckCircle,
  Calendar,
  FileText,
  Clock,
  Command,
  Zap,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DailyCheckInModal from '../modals/DailyCheckInModal';

interface HeaderProps {
  onMenuClick?: () => void;
}

interface Notification {
  id: string;
  type: 'task' | 'leave' | 'announcement';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  { id: '1', type: 'task', title: 'Task Completed', message: 'Amit completed "API Integration"', time: '5 min ago', read: false },
  { id: '2', type: 'leave', title: 'Leave Request', message: 'New leave request from Neeti', time: '1 hour ago', read: false },
  { id: '3', type: 'announcement', title: 'Holiday Notice', message: 'Office closed on Jan 26th', time: '2 hours ago', read: true },
  { id: '4', type: 'task', title: 'New Task Assigned', message: 'You have a new task from Sachin', time: '3 hours ago', read: true },
];

// Helper to get page title from path
const getPageTitle = (pathname: string): { title: string; breadcrumbs: string[] } => {
  const parts = pathname.split('/').filter(Boolean);
  const titles: Record<string, string> = {
    'crm': 'Dashboard',
    'tasks': 'Tasks',
    'my-tasks': 'My Tasks',
    'delegated': 'Delegated Tasks',
    'team': 'Team Tasks',
    'ace-meeting': 'A.C.E. Meeting',
    'hrms': 'HRMS',
    'my-leaves': 'My Leaves',
    'all-leaves': 'All Leaves',
    'check-ins': 'Check-ins',
    'team-check-ins': 'Team Check-ins',
    'attendance': 'Attendance',
    'settings': 'Settings',
    'performance': 'Performance',
    'dashboard': 'Dashboard',
    'my-kpis': 'My KPIs',
    'goals': 'Goals',
    'recognition': 'Recognition',
    'appraisals': 'Appraisals',
    'my-appraisals': 'My Appraisals',
    'probation': 'Probation',
    'my-status': 'My Status',
    'employees': 'Employees',
    'departments': 'Departments',
    'company-settings': 'Company Settings',
  };

  const breadcrumbs = parts.map(part => titles[part] || part.charAt(0).toUpperCase() + part.slice(1));
  const title = breadcrumbs[breadcrumbs.length - 1] || 'Dashboard';

  return { title, breadcrumbs };
};

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState(mockNotifications);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const { title, breadcrumbs } = getPageTitle(location.pathname);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task': return <CheckCircle className="w-4 h-4 text-success-500" />;
      case 'leave': return <Calendar className="w-4 h-4 text-warning-500" />;
      case 'announcement': return <FileText className="w-4 h-4 text-info-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!user) return null;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/80">
        <div className="h-16 px-4 lg:px-6 flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Breadcrumbs */}
            <div className="hidden md:flex items-center gap-2">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                  <span className={`text-sm ${
                    index === breadcrumbs.length - 1
                      ? 'font-semibold text-gray-900'
                      : 'text-gray-500'
                  }`}>
                    {crumb}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile Title */}
            <h1 className="md:hidden text-lg font-semibold text-gray-900">{title}</h1>
          </div>

          {/* Center - Search */}
          <div className="hidden lg:block flex-1 max-w-md mx-8">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-100 hover:bg-gray-200/70 rounded-xl text-sm text-gray-500 transition-all group"
            >
              <Search className="w-4 h-4" />
              <span className="flex-1 text-left">Search anything...</span>
              <kbd className="hidden lg:flex items-center gap-1 px-2 py-1 bg-white rounded-md text-xs text-gray-400 border border-gray-200 shadow-sm group-hover:border-gray-300">
                <Command className="w-3 h-3" />
                <span>K</span>
              </kbd>
            </button>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Check In Button */}
            <button
              onClick={() => setShowCheckInModal(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-primary-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Clock className="w-4 h-4" />
              <span>Check In</span>
            </button>

            {/* Mobile Check In */}
            <button
              onClick={() => setShowCheckInModal(true)}
              className="sm:hidden p-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              <Clock className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse-soft">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in-down">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                            !notif.read ? 'bg-primary-50/30' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notif.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                              <p className="text-xs text-gray-400 mt-1.5">{notif.time}</p>
                            </div>
                            {!notif.read && (
                              <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                    <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-1">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-200 mx-1 hidden sm:block" />

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-200/50">
                  <span className="text-white font-semibold text-sm">
                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-semibold text-gray-900">{user.name.split(' ')[0]}</p>
                  <p className="text-xs text-gray-500">{user.designation || user.department}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 hidden lg:block transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in-down">
                  {/* User Card */}
                  <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200/50">
                        <span className="text-white font-bold text-lg">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-medium">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-primary-100 text-primary-700 rounded-lg text-xs font-medium">
                          Employee
                        </span>
                      )}
                      <span className="px-2.5 py-1 bg-gray-200 text-gray-600 rounded-lg text-xs">
                        {user.department}
                      </span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      My Profile
                    </Link>
                    <Link
                      to="/hrms/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      Settings
                    </Link>
                  </div>

                  <div className="border-t border-gray-100 py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowCommandPalette(false)}
          />
          <div className="relative min-h-screen flex items-start justify-center pt-[15vh] px-4">
            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 border-b border-gray-100">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search or type a command..."
                  className="flex-1 py-4 text-base text-gray-900 placeholder-gray-400 outline-none"
                  autoFocus
                />
                <kbd className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">ESC</kbd>
              </div>

              {/* Quick Actions */}
              <div className="py-2">
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Actions</p>
                </div>
                <button
                  onClick={() => { setShowCheckInModal(true); setShowCommandPalette(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Clock className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">Check In</p>
                    <p className="text-xs text-gray-500">Record your attendance</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <Link
                  to="/tasks/my-tasks"
                  onClick={() => setShowCommandPalette(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Zap className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">My Tasks</p>
                    <p className="text-xs text-gray-500">View your pending tasks</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
                <Link
                  to="/hrms/my-leaves"
                  onClick={() => setShowCommandPalette(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">Request Leave</p>
                    <p className="text-xs text-gray-500">Apply for time off</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">↵</kbd>
                    Select
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Sparkles className="w-3 h-3" />
                  Powered by HRMS
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Modal */}
      {showCheckInModal && (
        <DailyCheckInModal onClose={() => setShowCheckInModal(false)} />
      )}
    </>
  );
}
