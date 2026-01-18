import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Star,
  ListTodo,
  Users,
  ChevronDown,
  ChevronRight,
  Settings,
  Briefcase,
  Bug,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavChild {
  name: string;
  href: string;
  adminOnly?: boolean;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: NavChild[];
  adminOnly?: boolean;
}

const navigation: NavItem[] = [
  { name: 'CRM', href: '/crm', icon: Star },
  {
    name: 'Task Delegation',
    icon: ListTodo,
    children: [
      { name: 'My Tasks', href: '/tasks/my-tasks' },
      { name: 'Delegated Tasks', href: '/tasks/delegated' },
      { name: 'Team Tasks', href: '/tasks/team', adminOnly: true },
      { name: 'A.C.E. Meeting', href: '/tasks/ace-meeting', adminOnly: true },
    ],
  },
  {
    name: 'HRMS',
    icon: Briefcase,
    children: [
      { name: 'My Leaves', href: '/hrms/my-leaves' },
      { name: 'All Leaves', href: '/hrms/all-leaves', adminOnly: true },
      { name: 'Check-ins', href: '/hrms/check-ins' },
      { name: 'Team Check-in', href: '/hrms/team-check-ins', adminOnly: true },
      { name: 'Attendance', href: '/hrms/attendance', adminOnly: true },
      { name: 'Settings', href: '/hrms/settings', adminOnly: true },
    ],
  },
  {
    name: 'Team Management',
    icon: Users,
    adminOnly: true,
    children: [
      { name: 'All Employees', href: '/team/employees' },
      { name: 'Departments', href: '/team/departments' },
    ],
  },
  { name: 'Company Settings', href: '/company-settings', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const location = useLocation();
  const { isAdmin, user } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Task Delegation', 'HRMS']);

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => location.pathname === href;
  const isParentActive = (children: NavChild[]) =>
    children.some((child) => location.pathname === child.href);

  // Filter navigation based on role
  const filteredNavigation = navigation
    .filter(item => !item.adminOnly || isAdmin)
    .map(item => ({
      ...item,
      children: item.children?.filter(child => !child.adminOnly || isAdmin),
    }));

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
          <span className="text-white font-bold text-lg">W</span>
        </div>
        <div>
          <h1 className="font-semibold text-gray-900">WOW Events</h1>
          <p className="text-xs text-gray-500">Company Portal</p>
        </div>
      </div>

      {/* User Role Badge */}
      {user && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                <Shield className="w-3 h-3" />
                Admin Access
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                Employee Access
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1.5">{user.department} Department</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredNavigation.map((item) => (
            <li key={item.name}>
              {item.children && item.children.length > 0 ? (
                <div>
                  <button
                    onClick={() => toggleExpand(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                      isParentActive(item.children)
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </div>
                    {expandedItems.includes(item.name) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {expandedItems.includes(item.name) && (
                    <ul className="mt-1 ml-8 space-y-0.5">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            to={child.href}
                            className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                              isActive(child.href)
                                ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ) : null}
            </li>
          ))}
        </ul>

        {/* Admin Section - Only show for admins */}
        {isAdmin && (
          <div className="mt-6 px-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Admin
            </p>
            <ul className="space-y-1 px-2">
              <li>
                <Link
                  to="/team/management"
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    isActive('/team/management')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Team Management</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/company-settings"
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    isActive('/company-settings')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>Company Settings</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Report Bug */}
      <div className="p-4 border-t border-gray-200">
        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <Bug className="w-4 h-4" />
          <span>Report Bug</span>
        </button>
      </div>
    </div>
  );
}
