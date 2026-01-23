import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { useBoothPilot } from '../../context/BoothPilotContext';

const BPLayout: React.FC = () => {
  const { user, logout } = useBoothPilot();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/boothpilot/login');
  };

  const navItems = [
    { path: '/boothpilot', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/boothpilot/booth', label: 'Booth Mode', icon: UserPlus, highlight: true },
    { path: '/boothpilot/leads', label: 'All Leads', icon: Users },
  ];

  const adminItems = [
    { path: '/boothpilot/settings/users', label: 'Team', icon: Users },
    { path: '/boothpilot/settings/questions', label: 'Questions', icon: HelpCircle },
    { path: '/boothpilot/settings/exhibitor', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-600" />
            <span className="font-bold text-gray-900">BoothPilot</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-2 -mr-2"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link to="/boothpilot" className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-indigo-600" />
            <span className="font-bold text-xl text-gray-900">BoothPilot</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Event Info */}
        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
          <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">Event</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{user?.eventName || 'No Event'}</p>
          <p className="text-xs text-gray-500 truncate">{user?.boothNumber || 'No Booth'}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : item.highlight
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
                {item.highlight && !active && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-green-600 text-white rounded">
                    GO
                  </span>
                )}
              </Link>
            );
          })}

          {/* Admin Section */}
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Admin
                </p>
              </div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                // Only show Team and Settings to admin
                if ((item.path.includes('users') || item.path.includes('exhibitor')) && user?.role !== 'admin') {
                  return null;
                }
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default BPLayout;
