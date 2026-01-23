import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Briefcase,
  Mail,
  Phone,
  Tag,
  FileText,
  Zap,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Send,
} from 'lucide-react';
import { useBoothPilot } from '../../context/BoothPilotContext';
import type { BPLeadDetail, BPAnswerInput } from '../../types/boothpilot';

const BPLeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    getLead,
    scoreLead,
    generateFollowup,
    markFollowupSent,
    questions,
    fetchQuestions,
    saveLeadAnswers,
    deleteLead,
    user,
  } = useBoothPilot();

  const [lead, setLead] = useState<BPLeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'qualification' | 'followup' | 'activity'>(
    (searchParams.get('tab') as any) || 'details'
  );
  const [scoring, setScoring] = useState(false);
  const [generatingFollowup, setGeneratingFollowup] = useState<'whatsapp' | 'email' | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        const leadData = await getLead(id);
        if (leadData) {
          setLead(leadData);
          // Initialize answers from lead data
          const initialAnswers: Record<string, string> = {};
          leadData.qualificationAnswers.forEach((a) => {
            initialAnswers[a.questionId] = a.answer;
          });
          setAnswers(initialAnswers);
        }
        await fetchQuestions();
        setLoading(false);
      }
    };
    loadData();
  }, [id, getLead, fetchQuestions]);

  const handleScore = async () => {
    if (!id) return;
    setScoring(true);
    const result = await scoreLead(id);
    if (result.success && result.score) {
      setLead((prev) =>
        prev ? { ...prev, scoring: result.score, score: result.score?.score, label: result.score?.label } : null
      );
    }
    setScoring(false);
  };

  const handleGenerateFollowup = async (channel: 'whatsapp' | 'email') => {
    if (!id) return;
    setGeneratingFollowup(channel);
    const result = await generateFollowup(id, channel);
    if (result.success && result.followup) {
      // Refresh lead data to get new followup
      const leadData = await getLead(id);
      if (leadData) {
        setLead(leadData);
      }
      setActiveTab('followup');
    }
    setGeneratingFollowup(null);
  };

  const handleCopy = async (text: string, followupId: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(followupId);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleMarkSent = async (followupId: string) => {
    const result = await markFollowupSent(followupId);
    if (result.success && id) {
      const leadData = await getLead(id);
      if (leadData) {
        setLead(leadData);
      }
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSaveAnswers = async () => {
    if (!id) return;
    setSavingAnswers(true);
    const answersList: BPAnswerInput[] = Object.entries(answers)
      .filter(([_, value]) => value)
      .map(([questionId, answer]) => ({ questionId, answer }));
    await saveLeadAnswers(id, answersList);
    // Re-score after saving answers
    await handleScore();
    setSavingAnswers(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }
    setDeleting(true);
    const result = await deleteLead(id);
    if (result.success) {
      navigate('/boothpilot/leads');
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Lead not found</h2>
        <p className="text-gray-500 mb-4">The lead you're looking for doesn't exist or has been deleted.</p>
        <Link
          to="/boothpilot/leads"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leads
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/boothpilot/leads')}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{lead.fullName}</h1>
              {lead.scoring && (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                    lead.scoring.label === 'HOT'
                      ? 'bg-red-100 text-red-700'
                      : lead.scoring.label === 'WARM'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-cyan-100 text-cyan-700'
                  }`}
                >
                  {lead.scoring.score} - {lead.scoring.label}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              {lead.companyName && (
                <span className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  {lead.companyName}
                </span>
              )}
              {lead.designation && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {lead.designation}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleScore}
            disabled={scoring}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {scoring ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {lead.scoring ? 'Re-Score' : 'Score Lead'}
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200">
              {(['details', 'qualification', 'followup', 'activity'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-4 lg:p-6">
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {lead.email && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <a href={`mailto:${lead.email}`} className="text-sm text-indigo-600 hover:underline">
                            {lead.email}
                          </a>
                        </div>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <a href={`tel:${lead.phone}`} className="text-sm text-indigo-600 hover:underline">
                            {lead.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    {lead.industry && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Building className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Industry</p>
                          <p className="text-sm text-gray-900">{lead.industry}</p>
                        </div>
                      </div>
                    )}
                    {lead.interestTag && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Tag className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Interest</p>
                          <p className="text-sm text-gray-900">{lead.interestTag}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {lead.notes && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase">Notes</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
                    <p>Captured by {lead.capturedBy.name}</p>
                    <p>{new Date(lead.createdAt).toLocaleString()}</p>
                    <p>Source: {lead.captureSource}</p>
                  </div>
                </div>
              )}

              {/* Qualification Tab */}
              {activeTab === 'qualification' && (
                <div className="space-y-4">
                  {questions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No qualification questions configured</p>
                  ) : (
                    <>
                      {questions.map((q) => (
                        <div key={q.id} className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            {q.questionText}
                            {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {q.questionType === 'select' && q.options.length > 0 ? (
                            <select
                              value={answers[q.id] || ''}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            >
                              <option value="">Select an option</option>
                              {q.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={answers[q.id] || ''}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Enter answer"
                            />
                          )}
                        </div>
                      ))}
                      <button
                        onClick={handleSaveAnswers}
                        disabled={savingAnswers}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {savingAnswers ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving & Scoring...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Save Answers & Re-Score
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Followup Tab */}
              {activeTab === 'followup' && (
                <div className="space-y-4">
                  {/* Generate Buttons */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => handleGenerateFollowup('whatsapp')}
                      disabled={generatingFollowup !== null}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {generatingFollowup === 'whatsapp' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                      Generate WhatsApp
                    </button>
                    <button
                      onClick={() => handleGenerateFollowup('email')}
                      disabled={generatingFollowup !== null}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {generatingFollowup === 'email' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      Generate Email
                    </button>
                  </div>

                  {/* Existing Followups */}
                  {lead.followups.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No follow-ups generated yet. Click a button above to create one.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {lead.followups.map((followup) => (
                        <div
                          key={followup.id}
                          className={`p-4 rounded-lg border ${
                            followup.status === 'sent'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {followup.channel === 'whatsapp' ? (
                                <MessageCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Mail className="w-4 h-4 text-blue-600" />
                              )}
                              <span className="text-sm font-medium capitalize">{followup.channel}</span>
                              {followup.status === 'sent' && (
                                <span className="flex items-center gap-1 text-xs text-green-600">
                                  <Check className="w-3 h-3" />
                                  Sent
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(followup.createdAt).toLocaleString()}
                            </span>
                          </div>

                          {followup.subject && (
                            <p className="text-sm font-medium text-gray-900 mb-2">
                              Subject: {followup.subject}
                            </p>
                          )}

                          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                            {followup.message}
                          </p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCopy(followup.message, followup.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              {copied === followup.id ? (
                                <>
                                  <Check className="w-4 h-4 text-green-600" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy
                                </>
                              )}
                            </button>
                            {followup.status !== 'sent' && (
                              <button
                                onClick={() => handleMarkSent(followup.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                <Send className="w-4 h-4" />
                                Mark Sent
                              </button>
                            )}
                            {followup.channel === 'whatsapp' && lead.phone && (
                              <a
                                href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(followup.message)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Open WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {lead.activities.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No activity recorded yet</p>
                  ) : (
                    lead.activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Clock className="w-4 h-4 text-indigo-600" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500">
                            {activity.userName} - {new Date(activity.createdAt).toLocaleString()}
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

        {/* Right Column - Scoring */}
        <div className="space-y-6">
          {/* Score Card */}
          {lead.scoring && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600">
                <div className="flex items-center gap-2 text-white">
                  <Zap className="w-5 h-5" />
                  <span className="font-semibold">AI Lead Score</span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {/* Score Display */}
                <div className="text-center">
                  <div
                    className={`text-5xl font-bold ${
                      lead.scoring.label === 'HOT'
                        ? 'text-red-600'
                        : lead.scoring.label === 'WARM'
                        ? 'text-orange-600'
                        : 'text-cyan-600'
                    }`}
                  >
                    {lead.scoring.score}
                  </div>
                  <span
                    className={`inline-block mt-2 px-4 py-1 rounded-full text-sm font-bold ${
                      lead.scoring.label === 'HOT'
                        ? 'bg-red-100 text-red-700'
                        : lead.scoring.label === 'WARM'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-cyan-100 text-cyan-700'
                    }`}
                  >
                    {lead.scoring.label}
                  </span>
                </div>

                {/* Next Action */}
                {lead.scoring.nextBestAction && (
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide mb-1">
                      Next Best Action
                    </p>
                    <p className="text-sm text-indigo-900">{lead.scoring.nextBestAction}</p>
                  </div>
                )}

                {/* Reasons */}
                {lead.scoring.reasons.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                      Why this score
                    </p>
                    <div className="space-y-2">
                      {lead.scoring.reasons.map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Flags */}
                {lead.scoring.riskFlags.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                      Risk Flags
                    </p>
                    <div className="space-y-2">
                      {lead.scoring.riskFlags.map((flag, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Angle */}
                {lead.scoring.recommendedMessageAngle && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                      Messaging Tip
                    </p>
                    <p className="text-sm text-gray-700">{lead.scoring.recommendedMessageAngle}</p>
                  </div>
                )}

                <p className="text-xs text-gray-400 pt-2">
                  Scored {new Date(lead.scoring.scoredAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </a>
              )}
              {lead.phone && (
                <>
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                  <a
                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BPLeadDetailPage;
