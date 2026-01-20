import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  FolderOpen,
  Search,
  Download,
  Eye,
  Share2,
  CheckCircle,
  AlertCircle,
  File,
  FileImage,
  FileSpreadsheet,
  Presentation,
  PenTool,
  Shield,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../../components/ui/Charts';

interface DocumentStats {
  totalDocuments: number;
  myDocuments: number;
  sharedWithMe: number;
  pendingSignatures: number;
  policies: number;
}

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  size: number;
  uploaded_by: string;
  created_at: string;
  shared_count: number;
}

interface Policy {
  id: string;
  title: string;
  category: string;
  version: string;
  status: 'draft' | 'published';
  acknowledgment_required: boolean;
  acknowledged: boolean;
  effective_date: string;
}

interface SignatureRequest {
  id: string;
  document_name: string;
  requester_name: string;
  status: 'pending' | 'signed' | 'declined';
  requested_at: string;
}

export default function DocumentCenter() {
  const { success, error: showError } = useToast();
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [signatures, setSignatures] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'documents' | 'policies' | 'signatures'>('documents');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDocumentData();
  }, []);

  const fetchDocumentData = async () => {
    setLoading(true);
    try {
      const [docsRes, policiesRes, signaturesRes] = await Promise.all([
        api.getMyDocuments(),
        api.getPolicies({ status: 'published' }),
        api.getMySignatureRequests(),
      ]);

      if (docsRes.data) setDocuments(docsRes.data);
      if (policiesRes.data) setPolicies(policiesRes.data);
      if (signaturesRes.data) setSignatures(signaturesRes.data);

      setStats({
        totalDocuments: docsRes.data?.length || 0,
        myDocuments: docsRes.data?.filter((d: Document) => d.uploaded_by === 'me').length || 0,
        sharedWithMe: docsRes.data?.filter((d: Document) => d.shared_count > 0).length || 0,
        pendingSignatures: signaturesRes.data?.filter((s: SignatureRequest) => s.status === 'pending').length || 0,
        policies: policiesRes.data?.length || 0,
      });
    } catch (error) {
      showError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgePolicy = async (id: string) => {
    try {
      const result = await api.acknowledgePolicy(id);
      if (result.data) {
        success('Policy acknowledged');
        fetchDocumentData();
      }
    } catch (error) {
      showError('Failed to acknowledge policy');
    }
  };

  const handleSignDocument = async (id: string) => {
    try {
      const result = await api.signDocument(id, { signature: 'electronic' });
      if (result.data) {
        success('Document signed successfully');
        fetchDocumentData();
      }
    } catch (error) {
      showError('Failed to sign document');
    }
  };

  const getFileIcon = (type: string) => {
    const icons: Record<string, any> = {
      pdf: FileText,
      doc: FileText,
      docx: FileText,
      xls: FileSpreadsheet,
      xlsx: FileSpreadsheet,
      ppt: Presentation,
      pptx: Presentation,
      png: FileImage,
      jpg: FileImage,
      jpeg: FileImage,
    };
    return icons[type.toLowerCase()] || File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const pendingSignatures = signatures.filter(s => s.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Center</h1>
          <p className="text-gray-500">Manage documents, policies, and e-signatures</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/documents/templates"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            Templates
          </Link>
          <button className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Documents"
          value={stats?.myDocuments || 0}
          icon={<FileText className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Shared With Me"
          value={stats?.sharedWithMe || 0}
          icon={<Share2 className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100"
        />
        <StatCard
          title="Pending Signatures"
          value={stats?.pendingSignatures || 0}
          icon={<PenTool className="w-5 h-5 text-yellow-600" />}
          iconBg="bg-yellow-100"
        />
        <StatCard
          title="Company Policies"
          value={stats?.policies || 0}
          icon={<Shield className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
        />
      </div>

      {/* Alert for pending signatures */}
      {pendingSignatures.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-yellow-800">
              You have {pendingSignatures.length} document(s) awaiting your signature
            </p>
            <p className="text-sm text-yellow-600">Please review and sign them at your earliest convenience</p>
          </div>
          <button
            onClick={() => setActiveTab('signatures')}
            className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 transition-colors"
          >
            Review Now
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex">
            {['documents', 'policies', 'signatures'].map((tab) => (
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
                {tab === 'signatures' && pendingSignatures.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                    {pendingSignatures.length}
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
          {activeTab === 'documents' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No documents found</p>
                    <button className="mt-3 text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center gap-2 mx-auto">
                      <Upload className="w-4 h-4" />
                      Upload your first document
                    </button>
                  </div>
                ) : (
                  filteredDocuments.map((doc) => {
                    const FileIcon = getFileIcon(doc.type);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-primary-200 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                            <FileIcon className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{doc.name}</h3>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(doc.size)} • {doc.category}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'policies' && (
            <div className="space-y-4">
              {policies.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No published policies</p>
                </div>
              ) : (
                policies.map((policy) => (
                  <div
                    key={policy.id}
                    className="p-5 border border-gray-100 rounded-xl hover:border-primary-200 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <Shield className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{policy.title}</h3>
                          <p className="text-sm text-gray-500">{policy.category} • Version {policy.version}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Effective: {new Date(policy.effective_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {policy.acknowledgment_required && !policy.acknowledged && (
                          <button
                            onClick={() => handleAcknowledgePolicy(policy.id)}
                            className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}
                        {policy.acknowledged && (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Acknowledged
                          </span>
                        )}
                        <Link
                          to={`/documents/policies/${policy.id}`}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'signatures' && (
            <div className="space-y-4">
              {signatures.length === 0 ? (
                <div className="text-center py-12">
                  <PenTool className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No signature requests</p>
                </div>
              ) : (
                signatures.map((sig) => (
                  <div
                    key={sig.id}
                    className={`p-5 border rounded-xl transition-all ${
                      sig.status === 'pending'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          sig.status === 'pending' ? 'bg-yellow-100' :
                          sig.status === 'signed' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <PenTool className={`w-6 h-6 ${
                            sig.status === 'pending' ? 'text-yellow-600' :
                            sig.status === 'signed' ? 'text-green-600' : 'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{sig.document_name}</h3>
                          <p className="text-sm text-gray-500">
                            Requested by {sig.requester_name} • {new Date(sig.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {sig.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleSignDocument(sig.id)}
                              className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
                            >
                              Sign
                            </button>
                            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                              Decline
                            </button>
                          </>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            sig.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {sig.status.charAt(0).toUpperCase() + sig.status.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
