import type {
  BPUser,
  BPAuthResponse,
  BPExhibitor,
  BPLead,
  BPLeadDetail,
  BPLeadCreate,
  BPLeadUpdate,
  BPLeadsResponse,
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
  BPLeadFilters,
  BPApiResponse,
} from '../types/boothpilot';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
const BP_API_URL = `${API_BASE_URL}/boothpilot`;

class BoothPilotApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('bp_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('bp_token', token);
    } else {
      localStorage.removeItem('bp_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('bp_token');
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('bp_token');
    localStorage.removeItem('bp_user');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<BPApiResponse<T>> {
    const url = `${BP_API_URL}${endpoint}`;
    const token = this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle CSV download
      if (response.headers.get('content-type')?.includes('text/csv')) {
        const blob = await response.blob();
        return { data: blob as unknown as T };
      }

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      console.error('BoothPilot API Error:', error);
      return { error: 'Network error. Please check if the server is running.' };
    }
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  async login(email: string, password: string): Promise<BPApiResponse<BPAuthResponse>> {
    const result = await this.request<BPAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result.data) {
      this.setToken(result.data.token);
      localStorage.setItem('bp_user', JSON.stringify(result.data.user));
    }

    return result;
  }

  async getMe(): Promise<BPApiResponse<BPUser>> {
    return this.request<BPUser>('/auth/me');
  }

  logout() {
    this.clearToken();
  }

  // ==========================================
  // LEADS
  // ==========================================

  async getLeads(filters?: BPLeadFilters): Promise<BPApiResponse<BPLeadsResponse>> {
    const params = new URLSearchParams();
    if (filters?.label) params.append('label', filters.label);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.capturedBy) params.append('capturedBy', filters.capturedBy);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const queryString = params.toString();
    return this.request<BPLeadsResponse>(`/leads${queryString ? `?${queryString}` : ''}`);
  }

  async getLead(id: string): Promise<BPApiResponse<BPLeadDetail>> {
    return this.request<BPLeadDetail>(`/leads/${id}`);
  }

  async createLead(lead: BPLeadCreate): Promise<BPApiResponse<BPLead>> {
    return this.request<BPLead>('/leads', {
      method: 'POST',
      body: JSON.stringify(lead),
    });
  }

  async updateLead(id: string, updates: BPLeadUpdate): Promise<BPApiResponse<BPLead>> {
    return this.request<BPLead>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteLead(id: string): Promise<BPApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/leads/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // QUALIFICATION
  // ==========================================

  async getQuestions(): Promise<BPApiResponse<BPQualificationQuestion[]>> {
    return this.request<BPQualificationQuestion[]>('/questions');
  }

  async createQuestion(question: BPQuestionCreate): Promise<BPApiResponse<BPQualificationQuestion>> {
    return this.request<BPQualificationQuestion>('/questions', {
      method: 'POST',
      body: JSON.stringify(question),
    });
  }

  async updateQuestion(id: string, updates: BPQuestionUpdate): Promise<BPApiResponse<BPQualificationQuestion>> {
    return this.request<BPQualificationQuestion>(`/questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteQuestion(id: string): Promise<BPApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/questions/${id}`, {
      method: 'DELETE',
    });
  }

  async saveLeadAnswers(leadId: string, answers: BPAnswerInput[]): Promise<BPApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/leads/${leadId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  }

  // ==========================================
  // AI SCORING
  // ==========================================

  async scoreLead(leadId: string): Promise<BPApiResponse<BPLeadScore>> {
    return this.request<BPLeadScore>(`/leads/${leadId}/score`, {
      method: 'POST',
    });
  }

  // ==========================================
  // AI FOLLOW-UP
  // ==========================================

  async generateFollowup(leadId: string, channel: 'whatsapp' | 'email'): Promise<BPApiResponse<BPFollowupGenerated>> {
    return this.request<BPFollowupGenerated>(`/leads/${leadId}/followup`, {
      method: 'POST',
      body: JSON.stringify({ channel }),
    });
  }

  async markFollowupSent(followupId: string): Promise<BPApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/followups/${followupId}/sent`, {
      method: 'PATCH',
    });
  }

  // ==========================================
  // ANALYTICS
  // ==========================================

  async getAnalyticsSummary(): Promise<BPApiResponse<BPAnalyticsSummary>> {
    return this.request<BPAnalyticsSummary>('/analytics/summary');
  }

  // ==========================================
  // EXPORT
  // ==========================================

  async exportLeadsCSV(): Promise<BPApiResponse<Blob>> {
    return this.request<Blob>('/export/leads');
  }

  // ==========================================
  // TEAM MANAGEMENT
  // ==========================================

  async getTeamMembers(): Promise<BPApiResponse<BPTeamMember[]>> {
    return this.request<BPTeamMember[]>('/users');
  }

  async createUser(user: BPUserCreate): Promise<BPApiResponse<BPTeamMember>> {
    return this.request<BPTeamMember>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: string, updates: BPUserUpdate): Promise<BPApiResponse<BPTeamMember>> {
    return this.request<BPTeamMember>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteUser(id: string): Promise<BPApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // EXHIBITOR SETTINGS
  // ==========================================

  async getExhibitor(): Promise<BPApiResponse<BPExhibitor>> {
    return this.request<BPExhibitor>('/exhibitor');
  }

  async updateExhibitor(updates: Partial<BPExhibitor>): Promise<BPApiResponse<BPExhibitor>> {
    return this.request<BPExhibitor>('/exhibitor', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
}

export const boothPilotApi = new BoothPilotApiService();
export default boothPilotApi;
