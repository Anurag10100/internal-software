import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor,
  Laptop,
  Smartphone,
  Headphones,
  Package,
  Plus,
  Search,
  CheckCircle,
  Clock,
  ArrowRight,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatCard, DonutChart } from '../../components/ui/Charts';

interface AssetStats {
  totalAssets: number;
  assignedAssets: number;
  availableAssets: number;
  maintenanceAssets: number;
  pendingRequests: number;
  totalValue: number;
}

interface Asset {
  id: string;
  name: string;
  asset_tag: string;
  category: string;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  assigned_to?: string;
  assigned_to_name?: string;
  purchase_date: string;
  purchase_cost: number;
  location: string;
}

interface AssetRequest {
  id: string;
  employee_name: string;
  category: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}

export default function AssetDashboard() {
  const { success, error: showError } = useToast();
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'assigned' | 'maintenance'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAssetData();
  }, []);

  const fetchAssetData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, assetsRes, requestsRes] = await Promise.all([
        api.getAssetDashboard(),
        api.getAssets(),
        api.getAssetRequests('pending'),
      ]);

      if (dashboardRes.data) setStats(dashboardRes.data);
      if (assetsRes.data) setAssets(assetsRes.data);
      if (requestsRes.data) setRequests(requestsRes.data);
    } catch (error) {
      showError('Failed to load asset data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (id: string) => {
    try {
      const result = await api.approveAssetRequest(id);
      if (result.data) {
        success('Request approved');
        fetchAssetData();
      }
    } catch (error) {
      showError('Failed to approve request');
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      laptop: Laptop,
      monitor: Monitor,
      phone: Smartphone,
      headset: Headphones,
    };
    return icons[category.toLowerCase()] || Package;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-100 text-green-700',
      assigned: 'bg-blue-100 text-blue-700',
      maintenance: 'bg-yellow-100 text-yellow-700',
      retired: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const filteredAssets = assets.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase()) && !a.asset_tag.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const assetDistribution = [
    { label: 'Assigned', value: stats?.assignedAssets || 0, color: '#6366f1' },
    { label: 'Available', value: stats?.availableAssets || 0, color: '#10b981' },
    { label: 'Maintenance', value: stats?.maintenanceAssets || 0, color: '#f59e0b' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Asset Management</h1>
          <p className="text-gray-500">Track and manage company assets</p>
        </div>
        <Link
          to="/assets/new"
          className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2 w-fit"
        >
          <Plus className="w-4 h-4" />
          Add Asset
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Assets"
          value={stats?.totalAssets || 0}
          icon={<Package className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Assigned"
          value={stats?.assignedAssets || 0}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
        />
        <StatCard
          title="Available"
          value={stats?.availableAssets || 0}
          icon={<Clock className="w-5 h-5 text-yellow-600" />}
          iconBg="bg-yellow-100"
        />
        <StatCard
          title="Pending Requests"
          value={stats?.pendingRequests || 0}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          iconBg="bg-red-100"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Asset Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Asset Distribution</h2>
          <div className="flex items-center justify-center gap-6">
            <DonutChart
              data={assetDistribution}
              size={120}
              strokeWidth={20}
              centerValue={`${stats?.totalAssets || 0}`}
              centerLabel="Total"
            />
            <div className="space-y-3">
              {assetDistribution.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Value</span>
              <span className="font-semibold text-gray-900">{formatCurrency(stats?.totalValue || 0)}</span>
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
            <Link to="/assets/requests" className="text-primary-600 text-sm font-medium hover:text-primary-700">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {requests.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <p className="text-gray-500">No pending requests</p>
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {request.employee_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{request.employee_name}</p>
                        <p className="text-sm text-gray-500">Requesting {request.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveRequest(request.id)}
                        className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Assets List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">All Assets</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Asset</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tag</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned To</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No assets found</p>
                  </td>
                </tr>
              ) : (
                filteredAssets.slice(0, 10).map((asset) => {
                  const CategoryIcon = getCategoryIcon(asset.category);
                  return (
                    <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                            <CategoryIcon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{asset.name}</p>
                            <p className="text-sm text-gray-500">{asset.location}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1 text-gray-600">
                          <Tag className="w-4 h-4" />
                          {asset.asset_tag}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{asset.category}</td>
                      <td className="px-5 py-4">
                        {asset.assigned_to_name ? (
                          <span className="text-gray-900">{asset.assigned_to_name}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                          {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to={`/assets/${asset.id}`}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors inline-flex"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
