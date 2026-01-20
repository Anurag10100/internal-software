import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ListTodo,
  Users,
  ChevronDown,
  ChevronLeft,
  Settings,
  Briefcase,
  Bug,
  Shield,
  X,
  Send,
  Target,
  ClipboardList,
  UserCheck,
  HelpCircle,
  Sparkles,
  Home,
  DollarSign,
  UserPlus,
  BookOpen,
  Package,
  Receipt,
  Building2,
  FileText,
  Megaphone,
  LogOut,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

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
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: Home },
    ],
  },
  {
    title: 'Work',
    items: [
      {
        name: 'Tasks',
        icon: ListTodo,
        children: [
          { name: 'My Tasks', href: '/tasks/my-tasks' },
          { name: 'Delegated', href: '/tasks/delegated' },
          { name: 'Team Tasks', href: '/tasks/team', adminOnly: true },
          { name: 'A.C.E. Meeting', href: '/tasks/ace-meeting', adminOnly: true },
        ],
      },
    ],
  },
  {
    title: 'Attendance',
    items: [
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
    ],
  },
  {
    title: 'Performance',
    items: [
      {
        name: 'Performance',
        icon: Target,
        children: [
          { name: 'Dashboard', href: '/performance/dashboard', adminOnly: true },
          { name: 'My KPIs', href: '/performance/my-kpis' },
          { name: 'My Goals', href: '/performance/goals' },
          { name: 'Recognition', href: '/performance/recognition' },
        ],
      },
      {
        name: 'Appraisals',
        icon: ClipboardList,
        children: [
          { name: 'My Appraisals', href: '/appraisals/my-appraisals' },
          { name: 'My Goals', href: '/appraisals/goals' },
          { name: 'All Appraisals', href: '/appraisals/all', adminOnly: true },
        ],
      },
      {
        name: 'Probation',
        icon: UserCheck,
        children: [
          { name: 'Dashboard', href: '/probation/dashboard', adminOnly: true },
          { name: 'My Status', href: '/probation/my-status' },
        ],
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        name: 'Payroll',
        icon: DollarSign,
        children: [
          { name: 'Dashboard', href: '/payroll/dashboard', adminOnly: true },
          { name: 'My Payslips', href: '/payroll/my-payslips' },
          { name: 'Reimbursements', href: '/payroll/reimbursements' },
          { name: 'Loans', href: '/payroll/loans', adminOnly: true },
        ],
      },
      {
        name: 'Expenses',
        icon: Receipt,
        children: [
          { name: 'My Reports', href: '/expenses/my-reports' },
          { name: 'All Reports', href: '/expenses/all', adminOnly: true },
          { name: 'Policies', href: '/expenses/policies', adminOnly: true },
        ],
      },
    ],
  },
  {
    title: 'HR Operations',
    items: [
      {
        name: 'Recruitment',
        icon: UserPlus,
        adminOnly: true,
        children: [
          { name: 'Dashboard', href: '/recruitment/dashboard' },
          { name: 'Job Postings', href: '/recruitment/jobs' },
          { name: 'Candidates', href: '/recruitment/candidates' },
          { name: 'Interviews', href: '/recruitment/interviews' },
        ],
      },
      {
        name: 'Offboarding',
        icon: LogOut,
        children: [
          { name: 'Dashboard', href: '/offboarding/dashboard', adminOnly: true },
          { name: 'My Exit', href: '/offboarding/my-exit' },
        ],
      },
    ],
  },
  {
    title: 'Learning',
    items: [
      {
        name: 'L&D',
        icon: BookOpen,
        children: [
          { name: 'My Learning', href: '/learning/my-courses' },
          { name: 'Course Catalog', href: '/learning/catalog' },
          { name: 'Skills', href: '/learning/skills' },
          { name: 'Certifications', href: '/learning/certifications' },
        ],
      },
    ],
  },
  {
    title: 'Resources',
    items: [
      {
        name: 'Assets',
        icon: Package,
        children: [
          { name: 'My Assets', href: '/assets/my-assets' },
          { name: 'All Assets', href: '/assets/all', adminOnly: true },
          { name: 'Requests', href: '/assets/requests' },
        ],
      },
      {
        name: 'Documents',
        icon: FileText,
        children: [
          { name: 'My Documents', href: '/documents/my-documents' },
          { name: 'Policies', href: '/documents/policies' },
          { name: 'Templates', href: '/documents/templates', adminOnly: true },
        ],
      },
    ],
  },
  {
    title: 'Company',
    items: [
      {
        name: 'Organization',
        icon: Building2,
        children: [
          { name: 'Org Chart', href: '/organization/chart' },
          { name: 'Directory', href: '/organization/directory' },
          { name: 'Departments', href: '/organization/departments', adminOnly: true },
        ],
      },
      {
        name: 'Announcements',
        icon: Megaphone,
        children: [
          { name: 'News & Updates', href: '/announcements/news' },
          { name: 'Events', href: '/announcements/events' },
          { name: 'Celebrations', href: '/announcements/celebrations' },
        ],
      },
    ],
  },
  {
    title: 'Admin',
    items: [
      {
        name: 'Team',
        icon: Users,
        adminOnly: true,
        children: [
          { name: 'All Employees', href: '/team/employees' },
          { name: 'Departments', href: '/team/departments' },
        ],
      },
      {
        name: 'Analytics',
        icon: BarChart3,
        adminOnly: true,
        children: [
          { name: 'HR Overview', href: '/analytics/overview' },
          { name: 'Reports', href: '/analytics/reports' },
          { name: 'Audit Logs', href: '/analytics/audit-logs' },
        ],
      },
      { name: 'Settings', href: '/company-settings', icon: Settings, adminOnly: true },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { isAdmin, user } = useAuth();
  const { success } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Tasks', 'HRMS', 'Performance', 'Appraisals']);
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugReport, setBugReport] = useState({ title: '', description: '' });

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => location.pathname === href;
  const isParentActive = (children?: NavChild[]) =>
    children?.some((child) => location.pathname === child.href) || false;

  const handleSubmitBugReport = () => {
    if (bugReport.title && bugReport.description) {
      success('Bug Report Submitted', 'Thank you for reporting this issue. Our team will look into it.');
      setBugReport({ title: '', description: '' });
      setShowBugModal(false);
    }
  };

  // Filter navigation based on role
  const filterItems = (items: NavItem[]) => {
    return items
      .filter(item => !item.adminOnly || isAdmin)
      .map(item => ({
        ...item,
        children: item.children?.filter(child => !child.adminOnly || isAdmin),
      }));
  };

  return (
    <aside
      className={`relative flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300 ease-out ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 hover:shadow transition-all"
      >
        <ChevronLeft
          className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200/50 flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-gray-900 truncate">HRMS Portal</h1>
            <p className="text-xs text-gray-500 truncate">Company Workspace</p>
          </div>
        )}
      </div>

      {/* User Card */}
      {user && !collapsed && (
        <div className="mx-3 mt-4 p-3 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.department}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 rounded-md text-xs font-medium">
                <Shield className="w-3 h-3" />
                Admin
              </span>
            ) : (
              <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-md text-xs font-medium">
                Employee
              </span>
            )}
          </div>
        </div>
      )}

      {/* Collapsed User Avatar */}
      {user && collapsed && (
        <div className="flex justify-center mt-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
            {user.name?.charAt(0) || 'U'}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {navigationSections.map((section, sectionIndex) => {
          const filteredItems = filterItems(section.items);
          if (filteredItems.length === 0) return null;

          // Skip Admin section for non-admins
          if (section.title === 'Admin' && !isAdmin) return null;

          return (
            <div key={section.title} className={sectionIndex > 0 ? 'mt-6' : ''}>
              {/* Section Label */}
              {!collapsed && (
                <div className="px-4 mb-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {section.title}
                  </p>
                </div>
              )}

              {/* Section Items */}
              <ul className="space-y-1 px-2">
                {filteredItems.map((item) => (
                  <li key={item.name}>
                    {item.children && item.children.length > 0 ? (
                      <div>
                        {/* Parent Item with Children */}
                        <button
                          onClick={() => toggleExpand(item.name)}
                          className={`group relative w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 ${
                            isParentActive(item.children)
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          } ${collapsed ? 'justify-center' : ''}`}
                        >
                          <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${
                            isParentActive(item.children) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                          }`} />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">{item.name}</span>
                              <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                  expandedItems.includes(item.name) ? 'rotate-0' : '-rotate-90'
                                }`}
                              />
                            </>
                          )}

                          {/* Tooltip for collapsed state */}
                          {collapsed && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                              {item.name}
                            </div>
                          )}
                        </button>

                        {/* Children */}
                        {!collapsed && expandedItems.includes(item.name) && (
                          <ul className="mt-1 ml-4 pl-4 border-l-2 border-gray-100 space-y-0.5">
                            {item.children.map((child) => (
                              <li key={child.name}>
                                <Link
                                  to={child.href}
                                  className={`block px-3 py-2 text-sm rounded-lg transition-all duration-150 ${
                                    isActive(child.href)
                                      ? 'bg-primary-500 text-white font-medium shadow-md shadow-primary-200'
                                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
                        className={`group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 ${
                          isActive(item.href)
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        } ${collapsed ? 'justify-center' : ''}`}
                      >
                        <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${
                          isActive(item.href) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                        }`} />
                        {!collapsed && <span>{item.name}</span>}

                        {/* Tooltip for collapsed state */}
                        {collapsed && (
                          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                            {item.name}
                          </div>
                        )}

                        {/* Badge */}
                        {item.badge && !collapsed && (
                          <span className="ml-auto px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-gray-100 p-3 space-y-1 ${collapsed ? 'px-2' : ''}`}>
        <button
          onClick={() => setShowBugModal(true)}
          className={`group relative flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <Bug className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          {!collapsed && <span>Report Bug</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
              Report Bug
            </div>
          )}
        </button>

        <button
          className={`group relative flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <HelpCircle className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          {!collapsed && <span>Help & Support</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
              Help & Support
            </div>
          )}
        </button>
      </div>

      {/* Bug Report Modal */}
      {showBugModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="relative p-6 pb-4">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-t-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Bug className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Report a Bug</h2>
                    <p className="text-red-100 text-sm">Help us improve</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBugModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 pt-2 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bug Title</label>
                <input
                  type="text"
                  value={bugReport.title}
                  onChange={(e) => setBugReport({ ...bugReport, title: e.target.value })}
                  className="input"
                  placeholder="Brief description of the issue"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={bugReport.description}
                  onChange={(e) => setBugReport({ ...bugReport, description: e.target.value })}
                  rows={4}
                  className="input resize-none"
                  placeholder="Please describe the bug in detail. Include steps to reproduce if possible."
                />
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-600">
                  Your report will be sent to the development team along with your user info.
                </p>
                <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-2">
              <button
                onClick={() => setShowBugModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitBugReport}
                className="btn btn-primary flex-1"
              >
                <Send className="w-4 h-4" />
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
