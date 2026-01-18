import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Star,
  ListTodo,
  ClipboardList,
  Users,
  Calendar,
  Building2,
  ChevronDown,
  ChevronRight,
  Settings,
  Briefcase,
  Clock,
  UserCheck,
  CalendarCheck,
  Bug,
} from 'lucide-react';

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: { name: string; href: string }[];
}

const navigation: NavItem[] = [
  { name: 'CRM', href: '/crm', icon: Star },
  {
    name: 'Task Delegation',
    icon: ListTodo,
    children: [
      { name: 'My Tasks', href: '/tasks/my-tasks' },
      { name: 'Delegated Tasks', href: '/tasks/delegated' },
      { name: 'Team Tasks', href: '/tasks/team' },
      { name: 'A.C.E. Meeting', href: '/tasks/ace-meeting' },
    ],
  },
  {
    name: 'HRMS',
    icon: Briefcase,
    children: [
      { name: 'My Leaves', href: '/hrms/my-leaves' },
      { name: 'All Leaves', href: '/hrms/all-leaves' },
      { name: 'Check-ins', href: '/hrms/check-ins' },
      { name: 'Team Check-in', href: '/hrms/team-check-ins' },
      { name: 'Attendance', href: '/hrms/attendance' },
      { name: 'Settings', href: '/hrms/settings' },
    ],
  },
  {
    name: 'Team Management',
    icon: Users,
    children: [
      { name: 'All Employees', href: '/team/employees' },
      { name: 'Departments', href: '/team/departments' },
    ],
  },
  { name: 'Company Settings', href: '/company-settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Task Delegation', 'HRMS']);

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => location.pathname === href;
  const isParentActive = (children: { href: string }[]) =>
    children.some((child) => location.pathname === child.href);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
        <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">W</span>
        </div>
        <div>
          <h1 className="font-semibold text-gray-900">WOW Events</h1>
          <p className="text-xs text-gray-500">Company Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navigation.map((item) => (
            <li key={item.name}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleExpand(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
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
                    <ul className="mt-1 ml-8 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            to={child.href}
                            className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                              isActive(child.href)
                                ? 'bg-primary-500 text-white'
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
              ) : (
                <Link
                  to={item.href!}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.href!)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>

        {/* Admin Section */}
        <div className="mt-6 px-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Admin
          </p>
          <ul className="space-y-1 px-2">
            <li>
              <Link
                to="/team/management"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
              >
                <Users className="w-5 h-5" />
                <span>Team Management</span>
              </Link>
            </li>
            <li>
              <Link
                to="/company-settings"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
              >
                <Settings className="w-5 h-5" />
                <span>Company Settings</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Report Bug */}
      <div className="p-4 border-t border-gray-200">
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <Bug className="w-4 h-4" />
          <span>Report Bug</span>
        </button>
      </div>
    </div>
  );
}
