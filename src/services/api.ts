const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
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

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Network error. Please check if the server is running.' };
    }
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: { name: string; email: string; password: string; department: string }) {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  // Users
  async getUsers() {
    return this.request<{ users: any[] }>('/users');
  }

  async getTeamMembers() {
    return this.request<{ members: any[] }>('/users/team');
  }

  async addTeamMember(memberData: any) {
    return this.request<{ member: any }>('/users/team', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async updateTeamMember(id: string, memberData: any) {
    return this.request<{ member: any }>(`/users/team/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    });
  }

  async deleteTeamMember(id: string) {
    return this.request<{ message: string }>(`/users/team/${id}`, {
      method: 'DELETE',
    });
  }

  async updateProfile(profileData: { name?: string; avatar?: string }) {
    return this.request<{ user: any }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Tasks
  async getTasks() {
    return this.request<{ tasks: any[] }>('/tasks');
  }

  async getMyTasks() {
    return this.request<{ tasks: any[] }>('/tasks/my-tasks');
  }

  async getDelegatedTasks() {
    return this.request<{ tasks: any[] }>('/tasks/delegated');
  }

  async createTask(taskData: any) {
    return this.request<{ task: any }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id: string, taskData: any) {
    return this.request<{ task: any }>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(id: string) {
    return this.request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Leave Requests
  async getLeaves() {
    return this.request<{ leaves: any[] }>('/leaves');
  }

  async getMyLeaves() {
    return this.request<{ leaves: any[] }>('/leaves/my-leaves');
  }

  async createLeave(leaveData: any) {
    return this.request<{ leave: any }>('/leaves', {
      method: 'POST',
      body: JSON.stringify(leaveData),
    });
  }

  async updateLeave(id: string, leaveData: any) {
    return this.request<{ leave: any }>(`/leaves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(leaveData),
    });
  }

  async deleteLeave(id: string) {
    return this.request<{ message: string }>(`/leaves/${id}`, {
      method: 'DELETE',
    });
  }

  // Check-ins
  async getCheckins() {
    return this.request<{ checkins: any[] }>('/checkins');
  }

  async getMyCheckins() {
    return this.request<{ checkins: any[] }>('/checkins/my-checkins');
  }

  async getTodayCheckin() {
    return this.request<{ checkin: any | null }>('/checkins/today');
  }

  async checkIn(data: { location?: string; notes?: string }) {
    return this.request<{ checkin: any }>('/checkins/check-in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async checkOut() {
    return this.request<{ checkin: any }>('/checkins/check-out', {
      method: 'POST',
    });
  }

  // Settings
  async getSettings() {
    return this.request<{ settings: any }>('/settings');
  }

  async updateSettings(settingsData: any) {
    return this.request<{ settings: any }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string }>('/health');
  }

  // ==========================================
  // PROBATION MANAGEMENT
  // ==========================================

  async getProbations() {
    return this.request<any[]>('/probations');
  }

  async getActiveProbations() {
    return this.request<any[]>('/probations/active');
  }

  async getMyProbation() {
    return this.request<any>('/probations/my-probation');
  }

  async getProbation(id: string) {
    return this.request<any>(`/probations/${id}`);
  }

  async createProbation(data: { user_id: string; start_date: string; end_date: string; duration_days?: number; notes?: string }) {
    return this.request<any>('/probations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProbation(id: string, data: any) {
    return this.request<any>(`/probations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addProbationReview(probationId: string, data: { milestone: string; rating: number; feedback: string; recommendation: string }) {
    return this.request<any>(`/probations/${probationId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProbationReviews(probationId: string) {
    return this.request<any[]>(`/probations/${probationId}/reviews`);
  }

  async getProbationChecklist(probationId: string) {
    return this.request<any[]>(`/probations/${probationId}/checklist`);
  }

  async updateChecklistItem(probationId: string, checklistId: string, is_completed: boolean) {
    return this.request<any>(`/probations/${probationId}/checklist/${checklistId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_completed }),
    });
  }

  async addChecklistItem(probationId: string, item: string) {
    return this.request<any>(`/probations/${probationId}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ item }),
    });
  }

  // ==========================================
  // APPRAISAL SYSTEM
  // ==========================================

  // Cycles
  async getAppraisalCycles() {
    return this.request<any[]>('/appraisals/cycles');
  }

  async createAppraisalCycle(data: { name: string; type: string; start_date: string; end_date: string }) {
    return this.request<any>('/appraisals/cycles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAppraisalCycle(id: string, data: any) {
    return this.request<any>(`/appraisals/cycles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async activateAppraisalCycle(id: string) {
    return this.request<any>(`/appraisals/cycles/${id}/activate`, {
      method: 'POST',
    });
  }

  // Appraisals
  async getAppraisals() {
    return this.request<any[]>('/appraisals');
  }

  async getMyAppraisals() {
    return this.request<any[]>('/appraisals/my-appraisals');
  }

  async getAppraisalsToReview() {
    return this.request<any[]>('/appraisals/to-review');
  }

  async getAppraisal(id: string) {
    return this.request<any>(`/appraisals/${id}`);
  }

  async submitSelfReview(appraisalId: string, data: { self_rating: number; self_comments: string }) {
    return this.request<any>(`/appraisals/${appraisalId}/self-review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitManagerReview(appraisalId: string, data: { manager_rating: number; manager_comments: string; final_rating: number }) {
    return this.request<any>(`/appraisals/${appraisalId}/manager-review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Goals
  async getAllGoals() {
    return this.request<any[]>('/appraisals/goals/all');
  }

  async getMyGoals() {
    return this.request<any[]>('/appraisals/goals/my-goals');
  }

  async createGoal(data: { user_id?: string; appraisal_id?: string; title: string; description?: string; category: string; target_date: string; weightage?: number }) {
    return this.request<any>('/appraisals/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGoal(id: string, data: any) {
    return this.request<any>(`/appraisals/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGoal(id: string) {
    return this.request<{ message: string }>(`/appraisals/goals/${id}`, {
      method: 'DELETE',
    });
  }

  // 360 Feedback
  async getAppraisalFeedback(appraisalId: string) {
    return this.request<any[]>(`/appraisals/${appraisalId}/feedback`);
  }

  async submitFeedback360(appraisalId: string, data: { reviewer_type: string; rating: number; strengths?: string; improvements?: string; comments?: string; is_anonymous?: boolean }) {
    return this.request<any>(`/appraisals/${appraisalId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // PERFORMANCE MANAGEMENT
  // ==========================================

  // KPIs
  async getAllKPIs() {
    return this.request<any[]>('/performance/kpis');
  }

  async getMyKPIs() {
    return this.request<any[]>('/performance/kpis/my-kpis');
  }

  async getUserKPIs(userId: string) {
    return this.request<any[]>(`/performance/kpis/user/${userId}`);
  }

  async createKPI(data: { user_id: string; title: string; description?: string; metric_type: string; target_value: number; unit: string; period: string }) {
    return this.request<any>('/performance/kpis', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateKPI(id: string, data: any) {
    return this.request<any>(`/performance/kpis/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteKPI(id: string) {
    return this.request<{ message: string }>(`/performance/kpis/${id}`, {
      method: 'DELETE',
    });
  }

  // Performance Notes
  async getAllNotes() {
    return this.request<any[]>('/performance/notes');
  }

  async getNotesForUser(userId: string) {
    return this.request<any[]>(`/performance/notes/for/${userId}`);
  }

  async getMyNotes() {
    return this.request<any[]>('/performance/notes/my-notes');
  }

  async createNote(data: { user_id: string; type: string; content: string; is_private?: boolean }) {
    return this.request<any>('/performance/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteNote(id: string) {
    return this.request<{ message: string }>(`/performance/notes/${id}`, {
      method: 'DELETE',
    });
  }

  // PIPs
  async getAllPIPs() {
    return this.request<any[]>('/performance/pips');
  }

  async getActivePIPs() {
    return this.request<any[]>('/performance/pips/active');
  }

  async getMyPIP() {
    return this.request<any>('/performance/pips/my-pip');
  }

  async getPIP(id: string) {
    return this.request<any>(`/performance/pips/${id}`);
  }

  async createPIP(data: { user_id: string; start_date: string; end_date: string; reason: string; goals?: string[] }) {
    return this.request<any>('/performance/pips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePIP(id: string, data: any) {
    return this.request<any>(`/performance/pips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addPIPCheckpoint(pipId: string, data: { checkpoint_date: string; progress_notes: string; rating: number }) {
    return this.request<any>(`/performance/pips/${pipId}/checkpoints`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPIPCheckpoints(pipId: string) {
    return this.request<any[]>(`/performance/pips/${pipId}/checkpoints`);
  }

  // Recognitions
  async getAllRecognitions() {
    return this.request<any[]>('/performance/recognitions');
  }

  async getMyRecognitions() {
    return this.request<any[]>('/performance/recognitions/my-recognitions');
  }

  async createRecognition(data: { recipient_id: string; type: string; badge: string; title: string; message: string; is_public?: boolean }) {
    return this.request<any>('/performance/recognitions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteRecognition(id: string) {
    return this.request<{ message: string }>(`/performance/recognitions/${id}`, {
      method: 'DELETE',
    });
  }

  // Performance Dashboard
  async getPerformanceDashboard() {
    return this.request<any>('/performance/dashboard');
  }
}

export const api = new ApiService();
export default api;
