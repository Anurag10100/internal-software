import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Save,
  Loader2,
  CheckCircle,
  Zap,
  MessageCircle,
  Mail,
  ArrowRight,
  RotateCcw,
  User,
  Building,
  Briefcase,
  Phone,
  AtSign,
  Factory,
  Tag,
  FileText,
} from 'lucide-react';
import { useBoothPilot } from '../../context/BoothPilotContext';
import type { BPLeadCreate, BPLeadScore } from '../../types/boothpilot';

interface FormData {
  fullName: string;
  companyName: string;
  designation: string;
  email: string;
  phone: string;
  industry: string;
  interestTag: string;
  notes: string;
}

const initialFormData: FormData = {
  fullName: '',
  companyName: '',
  designation: '',
  email: '',
  phone: '',
  industry: '',
  interestTag: '',
  notes: '',
};

const industries = [
  'Manufacturing',
  'Retail',
  'Logistics',
  'Healthcare',
  'Technology',
  'Finance',
  'Education',
  'Real Estate',
  'Hospitality',
  'Other',
];

const interestTags = [
  'ERP',
  'CRM',
  'Supply Chain',
  'Inventory Management',
  'Fleet Management',
  'Analytics',
  'Integration',
  'Custom Development',
  'General',
];

type Step = 'form' | 'saved' | 'scoring' | 'scored';

const BPBoothMode: React.FC = () => {
  const navigate = useNavigate();
  const { createLead, scoreLead, generateFollowup } = useBoothPilot();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);
  const [score, setScore] = useState<BPLeadScore | null>(null);
  const [generatingFollowup, setGeneratingFollowup] = useState<'whatsapp' | 'email' | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      return;
    }

    setSubmitting(true);

    const leadData: BPLeadCreate = {
      fullName: formData.fullName.trim(),
      companyName: formData.companyName.trim() || undefined,
      designation: formData.designation.trim() || undefined,
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      industry: formData.industry || undefined,
      interestTag: formData.interestTag || undefined,
      notes: formData.notes.trim() || undefined,
      captureSource: 'manual',
    };

    const result = await createLead(leadData);

    if (result.success && result.lead) {
      setSavedLeadId(result.lead.id);
      setStep('saved');

      // Auto-trigger scoring
      setTimeout(() => {
        handleScore(result.lead!.id);
      }, 500);
    }

    setSubmitting(false);
  };

  const handleScore = async (leadId: string) => {
    setStep('scoring');
    const result = await scoreLead(leadId);
    if (result.success && result.score) {
      setScore(result.score);
    }
    setStep('scored');
  };

  const handleGenerateFollowup = async (channel: 'whatsapp' | 'email') => {
    if (!savedLeadId) return;

    setGeneratingFollowup(channel);
    const result = await generateFollowup(savedLeadId, channel);

    if (result.success && result.followup) {
      // Navigate to lead detail with the generated followup
      navigate(`/boothpilot/leads/${savedLeadId}?tab=followup&channel=${channel}`);
    }
    setGeneratingFollowup(null);
  };

  const handleNewLead = () => {
    setFormData(initialFormData);
    setSavedLeadId(null);
    setScore(null);
    setStep('form');
  };

  const handleViewLead = () => {
    if (savedLeadId) {
      navigate(`/boothpilot/leads/${savedLeadId}`);
    }
  };

  // Render form step
  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 lg:p-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <UserPlus className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Booth Mode</h1>
            </div>
            <p className="text-indigo-100">Quick lead capture - under 20 seconds</p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name - Required */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 text-gray-400" />
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                autoFocus
                placeholder="Enter visitor's full name"
                className="w-full px-4 py-3 text-lg border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Company & Designation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  Company
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Company name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  Designation
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="Job title"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <AtSign className="w-4 h-4 text-gray-400" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@company.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Industry & Interest */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Factory className="w-4 h-4 text-gray-400" />
                  Industry
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="">Select industry</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  Interest
                </label>
                <select
                  name="interestTag"
                  value={formData.interestTag}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="">Select interest</option>
                  {interestTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Quick Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Key points from conversation, requirements, follow-up items..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !formData.fullName.trim()}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-indigo-600 text-white text-lg font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Saving Lead...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  Save Lead & Score
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render saved/scoring/scored step
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lead Saved!</h1>
          <p className="text-gray-600">{formData.fullName}</p>
          {formData.companyName && (
            <p className="text-gray-500 text-sm">{formData.companyName}</p>
          )}
        </div>

        {/* AI Scoring Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600">
            <div className="flex items-center gap-2 text-white">
              <Zap className="w-5 h-5" />
              <span className="font-semibold">AI Lead Score</span>
            </div>
          </div>

          <div className="p-6">
            {step === 'scoring' ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="text-gray-600">Analyzing lead quality...</p>
              </div>
            ) : score ? (
              <div className="space-y-4">
                {/* Score Display */}
                <div className="flex items-center justify-center gap-4">
                  <div
                    className={`text-5xl font-bold ${
                      score.label === 'HOT'
                        ? 'text-red-600'
                        : score.label === 'WARM'
                        ? 'text-orange-600'
                        : 'text-cyan-600'
                    }`}
                  >
                    {score.score}
                  </div>
                  <div>
                    <span
                      className={`inline-block px-4 py-1 rounded-full text-lg font-bold ${
                        score.label === 'HOT'
                          ? 'bg-red-100 text-red-700'
                          : score.label === 'WARM'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-cyan-100 text-cyan-700'
                      }`}
                    >
                      {score.label}
                    </span>
                  </div>
                </div>

                {/* Next Action */}
                {score.nextBestAction && (
                  <div className="bg-indigo-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide mb-1">
                      Recommended Action
                    </p>
                    <p className="text-sm text-indigo-900">{score.nextBestAction}</p>
                  </div>
                )}

                {/* Reasons */}
                {score.reasons.length > 0 && (
                  <div className="space-y-1">
                    {score.reasons.slice(0, 3).map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">Score not available</p>
              </div>
            )}
          </div>
        </div>

        {/* Follow-up Actions */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleGenerateFollowup('whatsapp')}
            disabled={generatingFollowup !== null}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {generatingFollowup === 'whatsapp' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5" />
                Generate WhatsApp Follow-up
              </>
            )}
          </button>

          <button
            onClick={() => handleGenerateFollowup('email')}
            disabled={generatingFollowup !== null}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {generatingFollowup === 'email' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Generate Email Follow-up
              </>
            )}
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleViewLead}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            View Lead
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleNewLead}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            New Lead
          </button>
        </div>
      </div>
    </div>
  );
};

export default BPBoothMode;
