import { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertCircle, CheckCircle, ChevronDown, Edit2 } from 'lucide-react';
import { KPI } from '../../types';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import UpdateKPIModal from '../../components/modals/UpdateKPIModal';

export default function MyKPIs() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKPI, setSelectedKPI] = useState<KPI | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const { error: showError } = useToast();

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      const { data, error } = await api.getMyKPIs();
      if (data) {
        setKpis(data);
      } else if (error) {
        showError('Failed to load KPIs', error);
      }
    } catch (err) {
      showError('Error', 'Failed to load KPI data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'achieved':
        return { color: 'bg-green-100 text-green-700', icon: CheckCircle, iconColor: 'text-green-600' };
      case 'on_track':
        return { color: 'bg-blue-100 text-blue-700', icon: TrendingUp, iconColor: 'text-blue-600' };
      case 'at_risk':
        return { color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle, iconColor: 'text-yellow-600' };
      case 'behind':
        return { color: 'bg-red-100 text-red-700', icon: ChevronDown, iconColor: 'text-red-600' };
      default:
        return { color: 'bg-gray-100 text-gray-700', icon: Target, iconColor: 'text-gray-600' };
    }
  };

  const getProgressPercent = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  const handleUpdate = (kpi: KPI) => {
    setSelectedKPI(kpi);
    setShowUpdateModal(true);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const achieved = kpis.filter(k => k.status === 'achieved').length;
  
  const atRisk = kpis.filter(k => k.status === 'at_risk' || k.status === 'behind').length;
  const avgProgress = kpis.length > 0
    ? Math.round(kpis.reduce((sum, k) => sum + getProgressPercent(k.current_value, k.target_value), 0) / kpis.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My KPIs</h1>
        <p className="text-gray-500 mt-1">Track your key performance indicators</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{kpis.length}</p>
              <p className="text-sm text-gray-500">Total KPIs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{achieved}</p>
              <p className="text-sm text-gray-500">Achieved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{atRisk}</p>
              <p className="text-sm text-gray-500">Need Attention</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600">{avgProgress}%</p>
              <p className="text-sm text-gray-500">Avg Progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {kpis.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No KPIs assigned yet</p>
            <p className="text-sm text-gray-400 mt-1">Your manager will assign KPIs to track your performance</p>
          </div>
        ) : (
          kpis.map((kpi) => {
            const statusInfo = getStatusInfo(kpi.status);
            const progress = getProgressPercent(kpi.current_value, kpi.target_value);
            const StatusIcon = statusInfo.icon;

            return (
              <div key={kpi.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      kpi.status === 'achieved' ? 'bg-green-100' :
                      kpi.status === 'on_track' ? 'bg-blue-100' :
                      kpi.status === 'at_risk' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <StatusIcon className={`w-5 h-5 ${statusInfo.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{kpi.title}</h3>
                      <p className="text-sm text-gray-500">{kpi.period}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {kpi.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => handleUpdate(kpi)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Update progress"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {kpi.description && (
                  <p className="text-sm text-gray-500 mb-3">{kpi.description}</p>
                )}

                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {kpi.current_value}
                      <span className="text-lg text-gray-400 font-normal"> / {kpi.target_value}</span>
                    </p>
                    <p className="text-sm text-gray-500">{kpi.unit}</p>
                  </div>
                  <p className="text-2xl font-bold text-primary-600">{progress}%</p>
                </div>

                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      kpi.status === 'achieved' ? 'bg-green-500' :
                      kpi.status === 'on_track' ? 'bg-blue-500' :
                      kpi.status === 'at_risk' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Update Modal */}
      {showUpdateModal && selectedKPI && (
        <UpdateKPIModal
          kpi={selectedKPI}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedKPI(null);
          }}
          onSuccess={() => {
            setShowUpdateModal(false);
            setSelectedKPI(null);
            loadKPIs();
          }}
        />
      )}
    </div>
  );
}
