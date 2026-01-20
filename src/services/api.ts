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

  // ==========================================
  // PAYROLL MANAGEMENT
  // ==========================================

  // Salary Structures
  async getSalaryStructures() {
    return this.request<any[]>('/payroll/salary-structures');
  }

  async createSalaryStructure(data: any) {
    return this.request<any>('/payroll/salary-structures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSalaryStructure(id: string, data: any) {
    return this.request<any>(`/payroll/salary-structures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSalaryStructure(id: string) {
    return this.request<{ message: string }>(`/payroll/salary-structures/${id}`, {
      method: 'DELETE',
    });
  }

  // Employee Salaries
  async getEmployeeSalaries() {
    return this.request<any[]>('/payroll/employee-salaries');
  }

  async getEmployeeSalary(employeeId: string) {
    return this.request<any>(`/payroll/employee-salaries/${employeeId}`);
  }

  async getMySalary() {
    return this.request<any>('/payroll/employee-salaries/my-salary');
  }

  async createEmployeeSalary(data: any) {
    return this.request<any>('/payroll/employee-salaries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployeeSalary(id: string, data: any) {
    return this.request<any>(`/payroll/employee-salaries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Payslips
  async getPayslips(filters?: { month?: string; year?: string; employee_id?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/payroll/payslips${params ? `?${params}` : ''}`);
  }

  async getMyPayslips() {
    return this.request<any[]>('/payroll/payslips/my-payslips');
  }

  async generatePayslips(data: { month: string; year: string; employee_ids?: string[] }) {
    return this.request<any>('/payroll/payslips/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approvePayslip(id: string) {
    return this.request<any>(`/payroll/payslips/${id}/approve`, {
      method: 'POST',
    });
  }

  async markPayslipPaid(id: string, paymentData: any) {
    return this.request<any>(`/payroll/payslips/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Salary Revisions
  async getSalaryRevisions(employeeId?: string) {
    const params = employeeId ? `?employee_id=${employeeId}` : '';
    return this.request<any[]>(`/payroll/salary-revisions${params}`);
  }

  async createSalaryRevision(data: any) {
    return this.request<any>('/payroll/salary-revisions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveSalaryRevision(id: string) {
    return this.request<any>(`/payroll/salary-revisions/${id}/approve`, {
      method: 'POST',
    });
  }

  // Tax Declarations
  async getTaxDeclarations() {
    return this.request<any[]>('/payroll/tax-declarations');
  }

  async getMyTaxDeclaration() {
    return this.request<any>('/payroll/tax-declarations/my-declaration');
  }

  async submitTaxDeclaration(data: any) {
    return this.request<any>('/payroll/tax-declarations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyTaxDeclaration(id: string, data: any) {
    return this.request<any>(`/payroll/tax-declarations/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Reimbursements
  async getReimbursements() {
    return this.request<any[]>('/payroll/reimbursements');
  }

  async getMyReimbursements() {
    return this.request<any[]>('/payroll/reimbursements/my-reimbursements');
  }

  async submitReimbursement(data: any) {
    return this.request<any>('/payroll/reimbursements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveReimbursement(id: string) {
    return this.request<any>(`/payroll/reimbursements/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectReimbursement(id: string, reason: string) {
    return this.request<any>(`/payroll/reimbursements/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Employee Loans
  async getLoans() {
    return this.request<any[]>('/payroll/loans');
  }

  async getMyLoans() {
    return this.request<any[]>('/payroll/loans/my-loans');
  }

  async applyForLoan(data: any) {
    return this.request<any>('/payroll/loans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveLoan(id: string) {
    return this.request<any>(`/payroll/loans/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectLoan(id: string, reason: string) {
    return this.request<any>(`/payroll/loans/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Payroll Dashboard
  async getPayrollDashboard() {
    return this.request<any>('/payroll/dashboard');
  }

  // ==========================================
  // RECRUITMENT & ATS
  // ==========================================

  // Job Postings
  async getJobPostings(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<any[]>(`/recruitment/jobs${params}`);
  }

  async getJobPosting(id: string) {
    return this.request<any>(`/recruitment/jobs/${id}`);
  }

  async createJobPosting(data: any) {
    return this.request<any>('/recruitment/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateJobPosting(id: string, data: any) {
    return this.request<any>(`/recruitment/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteJobPosting(id: string) {
    return this.request<{ message: string }>(`/recruitment/jobs/${id}`, {
      method: 'DELETE',
    });
  }

  async publishJobPosting(id: string) {
    return this.request<any>(`/recruitment/jobs/${id}/publish`, {
      method: 'POST',
    });
  }

  // Public Careers API
  async getPublicJobs() {
    return this.request<any[]>('/recruitment/careers');
  }

  async getPublicJob(id: string) {
    return this.request<any>(`/recruitment/careers/${id}`);
  }

  async submitJobApplication(jobId: string, data: any) {
    return this.request<any>(`/recruitment/careers/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Candidates
  async getCandidates(filters?: { job_id?: string; stage?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/recruitment/candidates${params ? `?${params}` : ''}`);
  }

  async getCandidate(id: string) {
    return this.request<any>(`/recruitment/candidates/${id}`);
  }

  async createCandidate(data: any) {
    return this.request<any>('/recruitment/candidates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCandidate(id: string, data: any) {
    return this.request<any>(`/recruitment/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateCandidateStage(id: string, stage: string, notes?: string) {
    return this.request<any>(`/recruitment/candidates/${id}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ stage, notes }),
    });
  }

  // Interviews
  async getInterviews(filters?: { candidate_id?: string; date?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/recruitment/interviews${params ? `?${params}` : ''}`);
  }

  async getInterview(id: string) {
    return this.request<any>(`/recruitment/interviews/${id}`);
  }

  async scheduleInterview(data: any) {
    return this.request<any>('/recruitment/interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInterview(id: string, data: any) {
    return this.request<any>(`/recruitment/interviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async submitInterviewFeedback(id: string, data: any) {
    return this.request<any>(`/recruitment/interviews/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Offer Letters
  async getOfferLetters(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<any[]>(`/recruitment/offers${params}`);
  }

  async getOfferLetter(id: string) {
    return this.request<any>(`/recruitment/offers/${id}`);
  }

  async createOfferLetter(data: any) {
    return this.request<any>('/recruitment/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendOfferLetter(id: string) {
    return this.request<any>(`/recruitment/offers/${id}/send`, {
      method: 'POST',
    });
  }

  async updateOfferStatus(id: string, status: string, notes?: string) {
    return this.request<any>(`/recruitment/offers/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  // Onboarding
  async getOnboardingTemplates() {
    return this.request<any[]>('/recruitment/onboarding/templates');
  }

  async createOnboardingTemplate(data: any) {
    return this.request<any>('/recruitment/onboarding/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOnboardingTasks(employeeId: string) {
    return this.request<any[]>(`/recruitment/onboarding/${employeeId}/tasks`);
  }

  async assignOnboarding(employeeId: string, templateId: string) {
    return this.request<any>(`/recruitment/onboarding/${employeeId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ template_id: templateId }),
    });
  }

  async updateOnboardingTask(employeeId: string, taskId: string, data: any) {
    return this.request<any>(`/recruitment/onboarding/${employeeId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Recruitment Dashboard
  async getRecruitmentDashboard() {
    return this.request<any>('/recruitment/dashboard');
  }

  // ==========================================
  // LEARNING & DEVELOPMENT
  // ==========================================

  // Courses
  async getCourses(filters?: { category?: string; status?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/learning/courses${params ? `?${params}` : ''}`);
  }

  async getCourse(id: string) {
    return this.request<any>(`/learning/courses/${id}`);
  }

  async createCourse(data: any) {
    return this.request<any>('/learning/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCourse(id: string, data: any) {
    return this.request<any>(`/learning/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCourse(id: string) {
    return this.request<{ message: string }>(`/learning/courses/${id}`, {
      method: 'DELETE',
    });
  }

  // Course Modules
  async getCourseModules(courseId: string) {
    return this.request<any[]>(`/learning/courses/${courseId}/modules`);
  }

  async createCourseModule(courseId: string, data: any) {
    return this.request<any>(`/learning/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCourseModule(courseId: string, moduleId: string, data: any) {
    return this.request<any>(`/learning/courses/${courseId}/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Enrollments
  async getEnrollments(filters?: { course_id?: string; user_id?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/learning/enrollments${params ? `?${params}` : ''}`);
  }

  async getMyEnrollments() {
    return this.request<any[]>('/learning/enrollments/my-enrollments');
  }

  async enrollInCourse(courseId: string) {
    return this.request<any>('/learning/enrollments', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId }),
    });
  }

  async updateEnrollmentProgress(enrollmentId: string, data: any) {
    return this.request<any>(`/learning/enrollments/${enrollmentId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async completeModule(enrollmentId: string, moduleId: string) {
    return this.request<any>(`/learning/enrollments/${enrollmentId}/complete-module`, {
      method: 'POST',
      body: JSON.stringify({ module_id: moduleId }),
    });
  }

  // Skills
  async getSkills() {
    return this.request<any[]>('/learning/skills');
  }

  async createSkill(data: any) {
    return this.request<any>('/learning/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEmployeeSkills(employeeId?: string) {
    const params = employeeId ? `?employee_id=${employeeId}` : '';
    return this.request<any[]>(`/learning/employee-skills${params}`);
  }

  async getMySkills() {
    return this.request<any[]>('/learning/employee-skills/my-skills');
  }

  async addEmployeeSkill(data: any) {
    return this.request<any>('/learning/employee-skills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployeeSkill(id: string, data: any) {
    return this.request<any>(`/learning/employee-skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Certifications
  async getCertifications() {
    return this.request<any[]>('/learning/certifications');
  }

  async createCertification(data: any) {
    return this.request<any>('/learning/certifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEmployeeCertifications(employeeId?: string) {
    const params = employeeId ? `?employee_id=${employeeId}` : '';
    return this.request<any[]>(`/learning/employee-certifications${params}`);
  }

  async getMyCertifications() {
    return this.request<any[]>('/learning/employee-certifications/my-certifications');
  }

  async addEmployeeCertification(data: any) {
    return this.request<any>('/learning/employee-certifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployeeCertification(id: string, data: any) {
    return this.request<any>(`/learning/employee-certifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Learning Paths
  async getLearningPaths() {
    return this.request<any[]>('/learning/paths');
  }

  async getLearningPath(id: string) {
    return this.request<any>(`/learning/paths/${id}`);
  }

  async createLearningPath(data: any) {
    return this.request<any>('/learning/paths', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async enrollInLearningPath(pathId: string) {
    return this.request<any>(`/learning/paths/${pathId}/enroll`, {
      method: 'POST',
    });
  }

  // Training Sessions
  async getTrainingSessions(filters?: { type?: string; status?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/learning/sessions${params ? `?${params}` : ''}`);
  }

  async createTrainingSession(data: any) {
    return this.request<any>('/learning/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async registerForSession(sessionId: string) {
    return this.request<any>(`/learning/sessions/${sessionId}/register`, {
      method: 'POST',
    });
  }

  // Learning Dashboard
  async getLearningDashboard() {
    return this.request<any>('/learning/dashboard');
  }

  // ==========================================
  // ASSET MANAGEMENT
  // ==========================================

  // Asset Categories
  async getAssetCategories() {
    return this.request<any[]>('/assets/categories');
  }

  async createAssetCategory(data: any) {
    return this.request<any>('/assets/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAssetCategory(id: string, data: any) {
    return this.request<any>(`/assets/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Assets
  async getAssets(filters?: { category_id?: string; status?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/assets${params ? `?${params}` : ''}`);
  }

  async getAsset(id: string) {
    return this.request<any>(`/assets/${id}`);
  }

  async createAsset(data: any) {
    return this.request<any>('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAsset(id: string, data: any) {
    return this.request<any>(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAsset(id: string) {
    return this.request<{ message: string }>(`/assets/${id}`, {
      method: 'DELETE',
    });
  }

  // Asset Assignments
  async getAssetAssignments(filters?: { asset_id?: string; employee_id?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/assets/assignments${params ? `?${params}` : ''}`);
  }

  async getMyAssets() {
    return this.request<any[]>('/assets/assignments/my-assets');
  }

  async assignAsset(data: any) {
    return this.request<any>('/assets/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async returnAsset(assignmentId: string, data?: any) {
    return this.request<any>(`/assets/assignments/${assignmentId}/return`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  // Asset Requests
  async getAssetRequests(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<any[]>(`/assets/requests${params}`);
  }

  async getMyAssetRequests() {
    return this.request<any[]>('/assets/requests/my-requests');
  }

  async createAssetRequest(data: any) {
    return this.request<any>('/assets/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveAssetRequest(id: string, assetId?: string) {
    return this.request<any>(`/assets/requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ asset_id: assetId }),
    });
  }

  async rejectAssetRequest(id: string, reason: string) {
    return this.request<any>(`/assets/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Asset Maintenance
  async getAssetMaintenance(assetId?: string) {
    const params = assetId ? `?asset_id=${assetId}` : '';
    return this.request<any[]>(`/assets/maintenance${params}`);
  }

  async scheduleAssetMaintenance(data: any) {
    return this.request<any>('/assets/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeAssetMaintenance(id: string, data: any) {
    return this.request<any>(`/assets/maintenance/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Software Licenses
  async getSoftwareLicenses() {
    return this.request<any[]>('/assets/licenses');
  }

  async createSoftwareLicense(data: any) {
    return this.request<any>('/assets/licenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async assignSoftwareLicense(licenseId: string, employeeId: string) {
    return this.request<any>(`/assets/licenses/${licenseId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId }),
    });
  }

  // Asset Dashboard
  async getAssetDashboard() {
    return this.request<any>('/assets/dashboard');
  }

  // ==========================================
  // EXPENSE MANAGEMENT
  // ==========================================

  // Expense Categories
  async getExpenseCategories() {
    return this.request<any[]>('/expenses/categories');
  }

  async createExpenseCategory(data: any) {
    return this.request<any>('/expenses/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Expense Policies
  async getExpensePolicies() {
    return this.request<any[]>('/expenses/policies');
  }

  async createExpensePolicy(data: any) {
    return this.request<any>('/expenses/policies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpensePolicy(id: string, data: any) {
    return this.request<any>(`/expenses/policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Expense Reports
  async getExpenseReports(filters?: { status?: string; employee_id?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/expenses/reports${params ? `?${params}` : ''}`);
  }

  async getMyExpenseReports() {
    return this.request<any[]>('/expenses/reports/my-reports');
  }

  async getExpenseReport(id: string) {
    return this.request<any>(`/expenses/reports/${id}`);
  }

  async createExpenseReport(data: any) {
    return this.request<any>('/expenses/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpenseReport(id: string, data: any) {
    return this.request<any>(`/expenses/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async submitExpenseReport(id: string) {
    return this.request<any>(`/expenses/reports/${id}/submit`, {
      method: 'POST',
    });
  }

  async approveExpenseReport(id: string, comments?: string) {
    return this.request<any>(`/expenses/reports/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  }

  async rejectExpenseReport(id: string, reason: string) {
    return this.request<any>(`/expenses/reports/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async markExpenseReportPaid(id: string, paymentData: any) {
    return this.request<any>(`/expenses/reports/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Expense Items
  async addExpenseItem(reportId: string, data: any) {
    return this.request<any>(`/expenses/reports/${reportId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpenseItem(reportId: string, itemId: string, data: any) {
    return this.request<any>(`/expenses/reports/${reportId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpenseItem(reportId: string, itemId: string) {
    return this.request<{ message: string }>(`/expenses/reports/${reportId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Mileage
  async addMileageExpense(reportId: string, data: any) {
    return this.request<any>(`/expenses/reports/${reportId}/mileage`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Per Diem
  async addPerDiemExpense(reportId: string, data: any) {
    return this.request<any>(`/expenses/reports/${reportId}/per-diem`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Expense Dashboard
  async getExpenseDashboard() {
    return this.request<any>('/expenses/dashboard');
  }

  // ==========================================
  // ORGANIZATION MANAGEMENT
  // ==========================================

  // Departments
  async getDepartments() {
    return this.request<any[]>('/organization/departments');
  }

  async getDepartmentTree() {
    return this.request<any[]>('/organization/departments/tree');
  }

  async getDepartment(id: string) {
    return this.request<any>(`/organization/departments/${id}`);
  }

  async createDepartment(data: any) {
    return this.request<any>('/organization/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDepartment(id: string, data: any) {
    return this.request<any>(`/organization/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDepartment(id: string) {
    return this.request<{ message: string }>(`/organization/departments/${id}`, {
      method: 'DELETE',
    });
  }

  // Positions
  async getPositions() {
    return this.request<any[]>('/organization/positions');
  }

  async createPosition(data: any) {
    return this.request<any>('/organization/positions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePosition(id: string, data: any) {
    return this.request<any>(`/organization/positions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePosition(id: string) {
    return this.request<{ message: string }>(`/organization/positions/${id}`, {
      method: 'DELETE',
    });
  }

  // Cost Centers
  async getCostCenters() {
    return this.request<any[]>('/organization/cost-centers');
  }

  async createCostCenter(data: any) {
    return this.request<any>('/organization/cost-centers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCostCenter(id: string, data: any) {
    return this.request<any>(`/organization/cost-centers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Locations
  async getLocations() {
    return this.request<any[]>('/organization/locations');
  }

  async createLocation(data: any) {
    return this.request<any>('/organization/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLocation(id: string, data: any) {
    return this.request<any>(`/organization/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Org Chart
  async getOrgChart() {
    return this.request<any>('/organization/org-chart');
  }

  async getReportingHierarchy(employeeId: string) {
    return this.request<any>(`/organization/hierarchy/${employeeId}`);
  }

  // Employee Directory
  async getEmployeeDirectory(filters?: { department_id?: string; location_id?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/organization/directory${params ? `?${params}` : ''}`);
  }

  async getEmployeeProfile(id: string) {
    return this.request<any>(`/organization/directory/${id}`);
  }

  async updateEmployeeProfile(id: string, data: any) {
    return this.request<any>(`/organization/directory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // DOCUMENT MANAGEMENT
  // ==========================================

  // Document Categories
  async getDocumentCategories() {
    return this.request<any[]>('/documents/categories');
  }

  async createDocumentCategory(data: any) {
    return this.request<any>('/documents/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Documents
  async getDocuments(filters?: { category_id?: string; type?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/documents${params ? `?${params}` : ''}`);
  }

  async getMyDocuments() {
    return this.request<any[]>('/documents/my-documents');
  }

  async getDocument(id: string) {
    return this.request<any>(`/documents/${id}`);
  }

  async uploadDocument(data: any) {
    return this.request<any>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDocument(id: string, data: any) {
    return this.request<any>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(id: string) {
    return this.request<{ message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // Document Sharing
  async shareDocument(documentId: string, data: any) {
    return this.request<any>(`/documents/${documentId}/share`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDocumentShares(documentId: string) {
    return this.request<any[]>(`/documents/${documentId}/shares`);
  }

  async revokeDocumentShare(documentId: string, shareId: string) {
    return this.request<{ message: string }>(`/documents/${documentId}/shares/${shareId}`, {
      method: 'DELETE',
    });
  }

  // E-Signatures
  async getSignatureRequests() {
    return this.request<any[]>('/documents/signatures');
  }

  async getMySignatureRequests() {
    return this.request<any[]>('/documents/signatures/my-requests');
  }

  async requestSignature(data: any) {
    return this.request<any>('/documents/signatures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signDocument(signatureId: string, data: any) {
    return this.request<any>(`/documents/signatures/${signatureId}/sign`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async declineSignature(signatureId: string, reason: string) {
    return this.request<any>(`/documents/signatures/${signatureId}/decline`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Policies
  async getPolicies(filters?: { category?: string; status?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/documents/policies${params ? `?${params}` : ''}`);
  }

  async getPolicy(id: string) {
    return this.request<any>(`/documents/policies/${id}`);
  }

  async createPolicy(data: any) {
    return this.request<any>('/documents/policies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePolicy(id: string, data: any) {
    return this.request<any>(`/documents/policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async publishPolicy(id: string) {
    return this.request<any>(`/documents/policies/${id}/publish`, {
      method: 'POST',
    });
  }

  async acknowledgePolicy(policyId: string) {
    return this.request<any>(`/documents/policies/${policyId}/acknowledge`, {
      method: 'POST',
    });
  }

  async getPolicyAcknowledgments(policyId: string) {
    return this.request<any[]>(`/documents/policies/${policyId}/acknowledgments`);
  }

  // Document Templates
  async getDocumentTemplates() {
    return this.request<any[]>('/documents/templates');
  }

  async createDocumentTemplate(data: any) {
    return this.request<any>('/documents/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateFromTemplate(templateId: string, data: any) {
    return this.request<any>(`/documents/templates/${templateId}/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // ANNOUNCEMENTS & COMMUNICATION
  // ==========================================

  // Announcements
  async getAnnouncements(filters?: { type?: string; priority?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/announcements${params ? `?${params}` : ''}`);
  }

  async getAnnouncement(id: string) {
    return this.request<any>(`/announcements/${id}`);
  }

  async createAnnouncement(data: any) {
    return this.request<any>('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAnnouncement(id: string, data: any) {
    return this.request<any>(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAnnouncement(id: string) {
    return this.request<{ message: string }>(`/announcements/${id}`, {
      method: 'DELETE',
    });
  }

  async publishAnnouncement(id: string) {
    return this.request<any>(`/announcements/${id}/publish`, {
      method: 'POST',
    });
  }

  async markAnnouncementRead(id: string) {
    return this.request<any>(`/announcements/${id}/read`, {
      method: 'POST',
    });
  }

  // Company Events
  async getCompanyEvents(filters?: { type?: string; month?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/announcements/events${params ? `?${params}` : ''}`);
  }

  async getCompanyEvent(id: string) {
    return this.request<any>(`/announcements/events/${id}`);
  }

  async createCompanyEvent(data: any) {
    return this.request<any>('/announcements/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompanyEvent(id: string, data: any) {
    return this.request<any>(`/announcements/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async registerForEvent(eventId: string) {
    return this.request<any>(`/announcements/events/${eventId}/register`, {
      method: 'POST',
    });
  }

  async cancelEventRegistration(eventId: string) {
    return this.request<any>(`/announcements/events/${eventId}/unregister`, {
      method: 'POST',
    });
  }

  // Celebrations
  async getCelebrations(month?: string) {
    const params = month ? `?month=${month}` : '';
    return this.request<any>(`/announcements/celebrations${params}`);
  }

  // Notifications
  async getNotifications() {
    return this.request<any[]>('/announcements/notifications');
  }

  async getUnreadNotifications() {
    return this.request<any[]>('/announcements/notifications/unread');
  }

  async markNotificationRead(id: string) {
    return this.request<any>(`/announcements/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsRead() {
    return this.request<any>('/announcements/notifications/read-all', {
      method: 'POST',
    });
  }

  // ==========================================
  // OFFBOARDING
  // ==========================================

  // Exit Requests
  async getExitRequests(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<any[]>(`/offboarding/exit-requests${params}`);
  }

  async getMyExitRequest() {
    return this.request<any>('/offboarding/exit-requests/my-request');
  }

  async getExitRequest(id: string) {
    return this.request<any>(`/offboarding/exit-requests/${id}`);
  }

  async submitExitRequest(data: any) {
    return this.request<any>('/offboarding/exit-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExitRequest(id: string, data: any) {
    return this.request<any>(`/offboarding/exit-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async approveExitRequest(id: string, data: any) {
    return this.request<any>(`/offboarding/exit-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async rejectExitRequest(id: string, reason: string) {
    return this.request<any>(`/offboarding/exit-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Clearance
  async getClearanceChecklist(exitRequestId: string) {
    return this.request<any[]>(`/offboarding/exit-requests/${exitRequestId}/clearance`);
  }

  async updateClearanceItem(exitRequestId: string, itemId: string, data: any) {
    return this.request<any>(`/offboarding/exit-requests/${exitRequestId}/clearance/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addClearanceItem(exitRequestId: string, data: any) {
    return this.request<any>(`/offboarding/exit-requests/${exitRequestId}/clearance`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Exit Interviews
  async getExitInterviews() {
    return this.request<any[]>('/offboarding/exit-interviews');
  }

  async scheduleExitInterview(data: any) {
    return this.request<any>('/offboarding/exit-interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeExitInterview(id: string, data: any) {
    return this.request<any>(`/offboarding/exit-interviews/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getExitInterviewAnalytics() {
    return this.request<any>('/offboarding/exit-interviews/analytics');
  }

  // Knowledge Transfer
  async getKnowledgeTransfers(exitRequestId?: string) {
    const params = exitRequestId ? `?exit_request_id=${exitRequestId}` : '';
    return this.request<any[]>(`/offboarding/knowledge-transfers${params}`);
  }

  async createKnowledgeTransfer(data: any) {
    return this.request<any>('/offboarding/knowledge-transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateKnowledgeTransfer(id: string, data: any) {
    return this.request<any>(`/offboarding/knowledge-transfers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Final Settlement
  async getFinalSettlements() {
    return this.request<any[]>('/offboarding/settlements');
  }

  async getFinalSettlement(id: string) {
    return this.request<any>(`/offboarding/settlements/${id}`);
  }

  async calculateFinalSettlement(exitRequestId: string) {
    return this.request<any>(`/offboarding/settlements/calculate/${exitRequestId}`, {
      method: 'POST',
    });
  }

  async approveFinalSettlement(id: string) {
    return this.request<any>(`/offboarding/settlements/${id}/approve`, {
      method: 'POST',
    });
  }

  async processFinalSettlement(id: string, paymentData: any) {
    return this.request<any>(`/offboarding/settlements/${id}/process`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Offboarding Dashboard
  async getOffboardingDashboard() {
    return this.request<any>('/offboarding/dashboard');
  }

  // ==========================================
  // ANALYTICS & REPORTS
  // ==========================================

  // HR Overview
  async getHROverview() {
    return this.request<any>('/analytics/hr-overview');
  }

  // Headcount Analytics
  async getHeadcountTrends(period?: string) {
    const params = period ? `?period=${period}` : '';
    return this.request<any>(`/analytics/headcount${params}`);
  }

  // Attendance Analytics
  async getAttendanceAnalytics(filters?: { department_id?: string; month?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any>(`/analytics/attendance${params ? `?${params}` : ''}`);
  }

  // Leave Analytics
  async getLeaveAnalytics(filters?: { year?: string; department_id?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any>(`/analytics/leaves${params ? `?${params}` : ''}`);
  }

  // Performance Analytics
  async getPerformanceAnalytics(filters?: { cycle_id?: string; department_id?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any>(`/analytics/performance${params ? `?${params}` : ''}`);
  }

  // Recruitment Analytics
  async getRecruitmentAnalytics(filters?: { year?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any>(`/analytics/recruitment${params ? `?${params}` : ''}`);
  }

  // Payroll Analytics
  async getPayrollAnalytics(filters?: { year?: string; department_id?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any>(`/analytics/payroll${params ? `?${params}` : ''}`);
  }

  // Asset Analytics
  async getAssetAnalytics() {
    return this.request<any>('/analytics/assets');
  }

  // Learning Analytics
  async getLearningAnalytics(filters?: { year?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any>(`/analytics/learning${params ? `?${params}` : ''}`);
  }

  // Custom Reports
  async getSavedReports() {
    return this.request<any[]>('/analytics/reports');
  }

  async getReport(id: string) {
    return this.request<any>(`/analytics/reports/${id}`);
  }

  async createReport(data: any) {
    return this.request<any>('/analytics/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async runReport(id: string, params?: any) {
    return this.request<any>(`/analytics/reports/${id}/run`, {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  async deleteReport(id: string) {
    return this.request<{ message: string }>(`/analytics/reports/${id}`, {
      method: 'DELETE',
    });
  }

  // Audit Logs
  async getAuditLogs(filters?: { action?: string; user_id?: string; date_from?: string; date_to?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request<any[]>(`/analytics/audit-logs${params ? `?${params}` : ''}`);
  }

  // User Preferences
  async getUserPreferences() {
    return this.request<any>('/analytics/preferences');
  }

  async updateUserPreferences(data: any) {
    return this.request<any>('/analytics/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Dashboard Widgets
  async getDashboardWidgets() {
    return this.request<any[]>('/analytics/widgets');
  }

  async updateDashboardWidgets(widgets: any[]) {
    return this.request<any>('/analytics/widgets', {
      method: 'PUT',
      body: JSON.stringify({ widgets }),
    });
  }
}

export const api = new ApiService();
export default api;
