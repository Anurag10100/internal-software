import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building,
  Users,
  MapPin,
  Search,
  ChevronRight,
  ChevronDown,
  Plus,
  Mail,
  Phone,
  Briefcase,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../../components/ui/Charts';

interface Department {
  id: string;
  name: string;
  code: string;
  head_name?: string;
  employee_count: number;
  children?: Department[];
  parent_id?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  location: string;
  avatar?: string;
  manager_name?: string;
}

interface OrgStats {
  totalDepartments: number;
  totalPositions: number;
  totalLocations: number;
  totalEmployees: number;
}

export default function OrgChart() {
  const { error: showError } = useToast();
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'org-chart' | 'departments' | 'directory'>('org-chart');
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    fetchOrgData();
  }, []);

  const fetchOrgData = async () => {
    setLoading(true);
    try {
      const [deptsRes, directoryRes, locationsRes, positionsRes] = await Promise.all([
        api.getDepartmentTree(),
        api.getEmployeeDirectory(),
        api.getLocations(),
        api.getPositions(),
      ]);

      if (deptsRes.data) {
        setDepartments(deptsRes.data);
        // Expand root departments by default
        const rootIds = deptsRes.data.map((d: Department) => d.id);
        setExpandedDepts(new Set(rootIds));
      }
      if (directoryRes.data) setEmployees(directoryRes.data);

      setStats({
        totalDepartments: deptsRes.data?.length || 0,
        totalPositions: positionsRes.data?.length || 0,
        totalLocations: locationsRes.data?.length || 0,
        totalEmployees: directoryRes.data?.length || 0,
      });
    } catch (error) {
      showError('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const toggleDepartment = (id: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderDepartmentTree = (depts: Department[], level = 0) => {
    return depts.map((dept) => (
      <div key={dept.id} className={`${level > 0 ? 'ml-6 border-l-2 border-gray-100' : ''}`}>
        <div
          className={`flex items-center gap-3 p-4 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors ${level > 0 ? 'ml-4' : ''}`}
          onClick={() => dept.children && dept.children.length > 0 && toggleDepartment(dept.id)}
        >
          {dept.children && dept.children.length > 0 ? (
            <button className="w-6 h-6 flex items-center justify-center text-gray-400">
              {expandedDepts.has(dept.id) ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          ) : (
            <div className="w-6 h-6" />
          )}
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
            <Building className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{dept.name}</h3>
            <p className="text-sm text-gray-500">
              {dept.head_name && `${dept.head_name} • `}{dept.employee_count} employees
            </p>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
            {dept.code}
          </span>
        </div>
        {dept.children && expandedDepts.has(dept.id) && (
          <div className="animate-fadeIn">
            {renderDepartmentTree(dept.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const filteredEmployees = employees.filter(e => {
    if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase()) && !e.email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedDepartment !== 'all' && e.department !== selectedDepartment) {
      return false;
    }
    return true;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Organization</h1>
          <p className="text-gray-500">View organization structure and employee directory</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/organization/departments/new"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </Link>
          <Link
            to="/organization/positions"
            className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4" />
            Manage Positions
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Departments"
          value={stats?.totalDepartments || 0}
          icon={<Building className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Positions"
          value={stats?.totalPositions || 0}
          icon={<Briefcase className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100"
        />
        <StatCard
          title="Locations"
          value={stats?.totalLocations || 0}
          icon={<MapPin className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
        />
        <StatCard
          title="Employees"
          value={stats?.totalEmployees || 0}
          icon={<Users className="w-5 h-5 text-yellow-600" />}
          iconBg="bg-yellow-100"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex">
            {['org-chart', 'departments', 'directory'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'org-chart' ? 'Org Chart' : tab === 'departments' ? 'Departments' : 'Directory'}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === 'org-chart' && (
            <div className="space-y-2">
              {departments.length === 0 ? (
                <div className="text-center py-12">
                  <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No departments configured</p>
                </div>
              ) : (
                renderDepartmentTree(departments)
              )}
            </div>
          )}

          {activeTab === 'departments' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-5 border border-gray-100 rounded-xl hover:border-primary-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                      <Building className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                      <p className="text-sm text-gray-500">{dept.code}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {dept.head_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Head</span>
                        <span className="text-gray-900">{dept.head_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Employees</span>
                      <span className="text-gray-900">{dept.employee_count}</span>
                    </div>
                  </div>
                  <Link
                    to={`/organization/departments/${dept.id}`}
                    className="mt-4 w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'directory' && (
            <div>
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No employees found</p>
                  </div>
                ) : (
                  filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="p-5 border border-gray-100 rounded-xl hover:border-primary-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                          {employee.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                          <p className="text-sm text-gray-500">{employee.position}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Building className="w-4 h-4" />
                          <span>{employee.department}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <MapPin className="w-4 h-4" />
                          <span>{employee.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                        {employee.phone && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Phone className="w-4 h-4" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                      </div>
                      <Link
                        to={`/organization/directory/${employee.id}`}
                        className="mt-4 w-full px-4 py-2 bg-primary-50 text-primary-600 rounded-xl text-sm font-medium hover:bg-primary-100 transition-colors flex items-center justify-center gap-2"
                      >
                        View Profile
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
