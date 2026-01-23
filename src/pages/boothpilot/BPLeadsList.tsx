import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Users,
  Flame,
  ThermometerSun,
  Snowflake,
  ChevronRight,
  UserPlus,
  X,
  Building,
  Phone,
  Mail,
} from 'lucide-react';
import { useBoothPilot } from '../../context/BoothPilotContext';
import type { BPLeadFilters } from '../../types/boothpilot';

const BPLeadsList: React.FC = () => {
  const { leads, leadsTotal, leadsLoading, fetchLeads, teamMembers, fetchTeamMembers, user } = useBoothPilot();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<BPLeadFilters>({
    label: (searchParams.get('label') as 'HOT' | 'WARM' | 'COLD') || undefined,
    status: searchParams.get('status') || undefined,
    capturedBy: searchParams.get('capturedBy') || undefined,
  });

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      fetchTeamMembers();
    }
  }, [fetchTeamMembers, user]);

  useEffect(() => {
    const params: BPLeadFilters = {
      search: search || undefined,
      label: filters.label,
      status: filters.status,
      capturedBy: filters.capturedBy,
      limit: 50,
    };
    fetchLeads(params);

    // Update URL params
    const newParams = new URLSearchParams();
    if (search) newParams.set('search', search);
    if (filters.label) newParams.set('label', filters.label);
    if (filters.status) newParams.set('status', filters.status);
    if (filters.capturedBy) newParams.set('capturedBy', filters.capturedBy);
    setSearchParams(newParams);
  }, [search, filters, fetchLeads, setSearchParams]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleFilterChange = (key: keyof BPLeadFilters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearch('');
  };

  const hasActiveFilters = filters.label || filters.status || filters.capturedBy || search;

  const labelFilters = [
    { value: 'HOT', label: 'Hot', icon: Flame, color: 'text-red-600 bg-red-50 border-red-200' },
    { value: 'WARM', label: 'Warm', icon: ThermometerSun, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { value: 'COLD', label: 'Cold', icon: Snowflake, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  ];

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'converted', label: 'Converted' },
    { value: 'lost', label: 'Lost' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
          <p className="text-gray-500">{leadsTotal} total leads</p>
        </div>
        <Link
          to="/boothpilot/booth"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Add Lead
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name, company, or email..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
              hasActiveFilters
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded">
                {[filters.label, filters.status, filters.capturedBy].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            {/* Label Filters */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Lead Score</label>
              <div className="flex flex-wrap gap-2">
                {labelFilters.map((f) => {
                  const Icon = f.icon;
                  const isActive = filters.label === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => handleFilterChange('label', isActive ? undefined : f.value as 'HOT' | 'WARM' | 'COLD')}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        isActive ? f.color : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All statuses</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Captured By Filter (for managers/admins) */}
            {(user?.role === 'admin' || user?.role === 'manager') && teamMembers.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Captured By</label>
                <select
                  value={filters.capturedBy || ''}
                  onChange={(e) => handleFilterChange('capturedBy', e.target.value || undefined)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All team members</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Leads List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {leadsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No leads found</h3>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your filters or search terms'
                : 'Start capturing leads from your booth'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            ) : (
              <Link
                to="/boothpilot/booth"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add first lead
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                to={`/boothpilot/leads/${lead.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold text-lg">
                    {lead.fullName.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Lead Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-medium text-gray-900 truncate">{lead.fullName}</h3>
                    {lead.label && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          lead.label === 'HOT'
                            ? 'bg-red-100 text-red-700'
                            : lead.label === 'WARM'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-cyan-100 text-cyan-700'
                        }`}
                      >
                        {lead.score && <span className="mr-1">{lead.score}</span>}
                        {lead.label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                    {lead.companyName && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        {lead.companyName}
                      </span>
                    )}
                    {lead.designation && (
                      <span className="hidden sm:inline">- {lead.designation}</span>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{lead.phone}</span>
                      </span>
                    )}
                    {lead.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="hidden md:inline truncate max-w-[150px]">{lead.email}</span>
                      </span>
                    )}
                  </div>
                  {lead.interestTag && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">
                      {lead.interestTag}
                    </span>
                  )}
                </div>

                {/* Right Side */}
                <div className="flex-shrink-0 flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">by {lead.capturedBy.name}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BPLeadsList;
