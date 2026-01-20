import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Calendar,
  Plus,
  ChevronRight,
  MapPin,
  Building,
  Star,
  ArrowRight,
  FileText,
  Video,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../../components/ui/Charts';

interface RecruitmentStats {
  activeJobs: number;
  totalCandidates: number;
  scheduledInterviews: number;
  pendingOffers: number;
  hiringRate: number;
  avgTimeToHire: number;
}

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'full_time' | 'part_time' | 'contract' | 'internship';
  status: 'draft' | 'published' | 'closed';
  candidates_count: number;
  created_at: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  job_title: string;
  stage: string;
  rating: number;
  applied_date: string;
}

interface Interview {
  id: string;
  candidate_name: string;
  job_title: string;
  type: string;
  scheduled_at: string;
  interviewers: string[];
}

export default function RecruitmentDashboard() {
  const { error: showError } = useToast();
  const [stats, setStats] = useState<RecruitmentStats | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'candidates' | 'interviews'>('jobs');

  useEffect(() => {
    fetchRecruitmentData();
  }, []);

  const fetchRecruitmentData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, jobsRes, candidatesRes, interviewsRes] = await Promise.all([
        api.getRecruitmentDashboard(),
        api.getJobPostings(),
        api.getCandidates(),
        api.getInterviews(),
      ]);

      if (dashboardRes.data) setStats(dashboardRes.data);
      if (jobsRes.data) setJobs(jobsRes.data);
      if (candidatesRes.data) setCandidates(candidatesRes.data);
      if (interviewsRes.data) setInterviews(interviewsRes.data);
    } catch (error) {
      showError('Failed to load recruitment data');
    } finally {
      setLoading(false);
    }
  };

  const pipelineData = [
    { label: 'Applied', value: candidates.filter(c => c.stage === 'applied').length, color: '#6366f1' },
    { label: 'Screening', value: candidates.filter(c => c.stage === 'screening').length, color: '#8b5cf6' },
    { label: 'Interview', value: candidates.filter(c => c.stage === 'interview').length, color: '#f59e0b' },
    { label: 'Offer', value: candidates.filter(c => c.stage === 'offer').length, color: '#10b981' },
  ];

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      applied: 'bg-gray-100 text-gray-700',
      screening: 'bg-blue-100 text-blue-700',
      interview: 'bg-yellow-100 text-yellow-700',
      offer: 'bg-green-100 text-green-700',
      hired: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[stage] || 'bg-gray-100 text-gray-700';
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
          <h1 className="text-2xl font-bold text-gray-900">Recruitment & ATS</h1>
          <p className="text-gray-500">Manage job postings, candidates, and hiring pipeline</p>
        </div>
        <Link
          to="/recruitment/jobs/new"
          className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2 w-fit"
        >
          <Plus className="w-4 h-4" />
          Post New Job
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Jobs"
          value={stats?.activeJobs || 0}
          icon={<Briefcase className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Total Candidates"
          value={stats?.totalCandidates || 0}
          icon={<Users className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100"
        />
        <StatCard
          title="Scheduled Interviews"
          value={stats?.scheduledInterviews || 0}
          icon={<Calendar className="w-5 h-5 text-yellow-600" />}
          iconBg="bg-yellow-100"
        />
        <StatCard
          title="Pending Offers"
          value={stats?.pendingOffers || 0}
          icon={<FileText className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
        />
      </div>

      {/* Pipeline Overview */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hiring Pipeline</h2>
          <div className="flex items-center gap-4">
            {pipelineData.map((stage, index) => (
              <div key={stage.label} className="flex-1">
                <div className="relative">
                  <div
                    className="h-16 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${stage.color}20` }}
                  >
                    <span className="text-2xl font-bold" style={{ color: stage.color }}>
                      {stage.value}
                    </span>
                  </div>
                  {index < pipelineData.length - 1 && (
                    <ChevronRight className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300 z-10" />
                  )}
                </div>
                <p className="text-center text-sm font-medium text-gray-600 mt-2">{stage.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hiring Metrics</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Hiring Rate</span>
              <span className="font-semibold text-green-600">{stats?.hiringRate || 0}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Avg. Time to Hire</span>
              <span className="font-semibold text-gray-900">{stats?.avgTimeToHire || 0} days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex">
            {['jobs', 'candidates', 'interviews'].map((tab) => (
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
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No job postings yet</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-primary-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{job.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            {job.department}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{job.candidates_count} candidates</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          job.status === 'published' ? 'bg-green-100 text-green-700' :
                          job.status === 'closed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      <Link
                        to={`/recruitment/jobs/${job.id}`}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="space-y-4">
              {candidates.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No candidates yet</p>
                </div>
              ) : (
                candidates.slice(0, 10).map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-primary-200 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                        {candidate.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{candidate.name}</h3>
                        <p className="text-sm text-gray-500">{candidate.job_title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= candidate.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStageColor(candidate.stage)}`}>
                        {candidate.stage}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'interviews' && (
            <div className="space-y-4">
              {interviews.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No scheduled interviews</p>
                </div>
              ) : (
                interviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-primary-200 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <Video className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{interview.candidate_name}</h3>
                        <p className="text-sm text-gray-500">{interview.job_title} - {interview.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {new Date(interview.scheduled_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
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
