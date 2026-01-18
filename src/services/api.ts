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
}

export const api = new ApiService();
export default api;
