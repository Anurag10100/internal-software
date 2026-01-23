import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import boothPilotApi from '../services/boothpilot-api';
import type {
  BPUser,
  BPLead,
  BPLeadDetail,
  BPLeadCreate,
  BPLeadUpdate,
  BPLeadFilters,
  BPLeadScore,
  BPQualificationQuestion,
  BPAnswerInput,
  BPFollowupGenerated,
  BPAnalyticsSummary,
  BPTeamMember,
  BPUserCreate,
  BPUserUpdate,
  BPQuestionCreate,
  BPQuestionUpdate,
  BPExhibitor,
} from '../types/boothpilot';

interface BoothPilotContextType {
  // Auth state
  user: BPUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Leads
  leads: BPLead[];
  leadsTotal: number;
  leadsLoading: boolean;
  fetchLeads: (filters?: BPLeadFilters) => Promise<void>;
  getLead: (id: string) => Promise<BPLeadDetail | null>;
  createLead: (lead: BPLeadCreate) => Promise<{ success: boolean; lead?: BPLead; error?: string }>;
  updateLead: (id: string, updates: BPLeadUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteLead: (id: string) => Promise<{ success: boolean; error?: string }>;

  // AI Features
  scoreLead: (leadId: string) => Promise<{ success: boolean; score?: BPLeadScore; error?: string }>;
  generateFollowup: (leadId: string, channel: 'whatsapp' | 'email') => Promise<{ success: boolean; followup?: BPFollowupGenerated; error?: string }>;
  markFollowupSent: (followupId: string) => Promise<{ success: boolean; error?: string }>;

  // Qualification
  questions: BPQualificationQuestion[];
  fetchQuestions: () => Promise<void>;
  saveLeadAnswers: (leadId: string, answers: BPAnswerInput[]) => Promise<{ success: boolean; error?: string }>;
  createQuestion: (question: BPQuestionCreate) => Promise<{ success: boolean; error?: string }>;
  updateQuestion: (id: string, updates: BPQuestionUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteQuestion: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Analytics
  analytics: BPAnalyticsSummary | null;
  fetchAnalytics: () => Promise<void>;

  // Team Management
  teamMembers: BPTeamMember[];
  fetchTeamMembers: () => Promise<void>;
  createUser: (user: BPUserCreate) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, updates: BPUserUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Exhibitor
  exhibitor: BPExhibitor | null;
  fetchExhibitor: () => Promise<void>;
  updateExhibitor: (updates: Partial<BPExhibitor>) => Promise<{ success: boolean; error?: string }>;

  // Export
  exportLeadsCSV: () => Promise<void>;
}

const BoothPilotContext = createContext<BoothPilotContextType | undefined>(undefined);

export function BoothPilotProvider({ children }: { children: ReactNode }) {
  // Auth state
  const [user, setUser] = useState<BPUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Data state
  const [leads, setLeads] = useState<BPLead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [questions, setQuestions] = useState<BPQualificationQuestion[]>([]);
  const [analytics, setAnalytics] = useState<BPAnalyticsSummary | null>(null);
  const [teamMembers, setTeamMembers] = useState<BPTeamMember[]>([]);
  const [exhibitor, setExhibitor] = useState<BPExhibitor | null>(null);

  // Initialize auth from stored token
  useEffect(() => {
    const initAuth = async () => {
      const token = boothPilotApi.getToken();
      if (token) {
        const result = await boothPilotApi.getMe();
        if (result.data) {
          setUser(result.data);
          setIsAuthenticated(true);
        } else {
          boothPilotApi.clearToken();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Auth actions
  const login = async (email: string, password: string) => {
    const result = await boothPilotApi.login(email, password);
    if (result.data) {
      setUser(result.data.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const logout = () => {
    boothPilotApi.logout();
    setUser(null);
    setIsAuthenticated(false);
    setLeads([]);
    setQuestions([]);
    setAnalytics(null);
    setTeamMembers([]);
    setExhibitor(null);
  };

  // Leads
  const fetchLeads = useCallback(async (filters?: BPLeadFilters) => {
    setLeadsLoading(true);
    const result = await boothPilotApi.getLeads(filters);
    if (result.data) {
      setLeads(result.data.leads);
      setLeadsTotal(result.data.total);
    }
    setLeadsLoading(false);
  }, []);

  const getLead = async (id: string): Promise<BPLeadDetail | null> => {
    const result = await boothPilotApi.getLead(id);
    return result.data || null;
  };

  const createLead = async (lead: BPLeadCreate) => {
    const result = await boothPilotApi.createLead(lead);
    if (result.data) {
      setLeads(prev => [result.data!, ...prev]);
      setLeadsTotal(prev => prev + 1);
      return { success: true, lead: result.data };
    }
    return { success: false, error: result.error };
  };

  const updateLead = async (id: string, updates: BPLeadUpdate) => {
    const result = await boothPilotApi.updateLead(id, updates);
    if (result.data) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...result.data } : l));
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const deleteLead = async (id: string) => {
    const result = await boothPilotApi.deleteLead(id);
    if (result.data) {
      setLeads(prev => prev.filter(l => l.id !== id));
      setLeadsTotal(prev => prev - 1);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  // AI Features
  const scoreLead = async (leadId: string) => {
    const result = await boothPilotApi.scoreLead(leadId);
    if (result.data) {
      // Update lead in list with new score
      setLeads(prev => prev.map(l =>
        l.id === leadId
          ? { ...l, score: result.data!.score, label: result.data!.label, nextBestAction: result.data!.nextBestAction }
          : l
      ));
      return { success: true, score: result.data };
    }
    return { success: false, error: result.error };
  };

  const generateFollowup = async (leadId: string, channel: 'whatsapp' | 'email') => {
    const result = await boothPilotApi.generateFollowup(leadId, channel);
    if (result.data) {
      return { success: true, followup: result.data };
    }
    return { success: false, error: result.error };
  };

  const markFollowupSent = async (followupId: string) => {
    const result = await boothPilotApi.markFollowupSent(followupId);
    if (result.data) {
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  // Qualification
  const fetchQuestions = useCallback(async () => {
    const result = await boothPilotApi.getQuestions();
    if (result.data) {
      setQuestions(result.data);
    }
  }, []);

  const saveLeadAnswers = async (leadId: string, answers: BPAnswerInput[]) => {
    const result = await boothPilotApi.saveLeadAnswers(leadId, answers);
    if (result.data) {
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const createQuestion = async (question: BPQuestionCreate) => {
    const result = await boothPilotApi.createQuestion(question);
    if (result.data) {
      setQuestions(prev => [...prev, result.data!]);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const updateQuestion = async (id: string, updates: BPQuestionUpdate) => {
    const result = await boothPilotApi.updateQuestion(id, updates);
    if (result.data) {
      setQuestions(prev => prev.map(q => q.id === id ? result.data! : q));
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const deleteQuestion = async (id: string) => {
    const result = await boothPilotApi.deleteQuestion(id);
    if (result.data) {
      setQuestions(prev => prev.filter(q => q.id !== id));
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  // Analytics
  const fetchAnalytics = useCallback(async () => {
    const result = await boothPilotApi.getAnalyticsSummary();
    if (result.data) {
      setAnalytics(result.data);
    }
  }, []);

  // Team Management
  const fetchTeamMembers = useCallback(async () => {
    const result = await boothPilotApi.getTeamMembers();
    if (result.data) {
      setTeamMembers(result.data);
    }
  }, []);

  const createUser = async (userData: BPUserCreate) => {
    const result = await boothPilotApi.createUser(userData);
    if (result.data) {
      setTeamMembers(prev => [...prev, result.data!]);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const updateUser = async (id: string, updates: BPUserUpdate) => {
    const result = await boothPilotApi.updateUser(id, updates);
    if (result.data) {
      setTeamMembers(prev => prev.map(m => m.id === id ? result.data! : m));
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const deleteUser = async (id: string) => {
    const result = await boothPilotApi.deleteUser(id);
    if (result.data) {
      setTeamMembers(prev => prev.filter(m => m.id !== id));
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  // Exhibitor
  const fetchExhibitor = useCallback(async () => {
    const result = await boothPilotApi.getExhibitor();
    if (result.data) {
      setExhibitor(result.data);
    }
  }, []);

  const updateExhibitorData = async (updates: Partial<BPExhibitor>) => {
    const result = await boothPilotApi.updateExhibitor(updates);
    if (result.data) {
      setExhibitor(prev => prev ? { ...prev, ...result.data } : result.data!);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  // Export
  const exportLeadsCSV = async () => {
    const result = await boothPilotApi.exportLeadsCSV();
    if (result.data) {
      const blob = result.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const value: BoothPilotContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    leads,
    leadsTotal,
    leadsLoading,
    fetchLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    scoreLead,
    generateFollowup,
    markFollowupSent,
    questions,
    fetchQuestions,
    saveLeadAnswers,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    analytics,
    fetchAnalytics,
    teamMembers,
    fetchTeamMembers,
    createUser,
    updateUser,
    deleteUser,
    exhibitor,
    fetchExhibitor,
    updateExhibitor: updateExhibitorData,
    exportLeadsCSV,
  };

  return (
    <BoothPilotContext.Provider value={value}>
      {children}
    </BoothPilotContext.Provider>
  );
}

export function useBoothPilot() {
  const context = useContext(BoothPilotContext);
  if (context === undefined) {
    throw new Error('useBoothPilot must be used within a BoothPilotProvider');
  }
  return context;
}
