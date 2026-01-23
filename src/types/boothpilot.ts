// ==========================================
// BOOTHPILOT AI - TYPE DEFINITIONS
// ==========================================

// User & Auth Types
export interface BPUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'staff' | 'manager' | 'admin';
  avatar?: string;
  exhibitorId: string;
  companyName: string;
  eventName?: string;
  boothNumber?: string;
  eventStartDate?: string;
  eventEndDate?: string;
}

export interface BPAuthResponse {
  token: string;
  user: BPUser;
}

// Exhibitor Types
export interface BPExhibitor {
  id: string;
  companyName: string;
  companyLogo?: string;
  industry?: string;
  website?: string;
  icpDescription?: string;
  eventName?: string;
  eventLocation?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  boothNumber?: string;
  settings?: Record<string, unknown>;
}

// Lead Types
export interface BPLead {
  id: string;
  fullName: string;
  companyName?: string;
  designation?: string;
  email?: string;
  phone?: string;
  industry?: string;
  interestTag?: string;
  notes?: string;
  captureSource: 'manual' | 'badge_scan' | 'qr';
  status: 'new' | 'qualified' | 'contacted' | 'converted' | 'lost';
  capturedBy: {
    id: string;
    name: string;
  };
  score?: number;
  label?: 'HOT' | 'WARM' | 'COLD';
  nextBestAction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BPLeadDetail extends BPLead {
  scoring?: BPLeadScore;
  qualificationAnswers: BPQualificationAnswer[];
  followups: BPFollowup[];
  activities: BPLeadActivity[];
}

export interface BPLeadScore {
  score: number;
  label: 'HOT' | 'WARM' | 'COLD';
  reasons: string[];
  riskFlags: string[];
  nextBestAction: string;
  recommendedMessageAngle: string;
  scoredAt: string;
}

export interface BPLeadActivity {
  id: string;
  type: string;
  description: string;
  userName: string;
  createdAt: string;
}

// Lead Create/Update Types
export interface BPLeadCreate {
  fullName: string;
  companyName?: string;
  designation?: string;
  email?: string;
  phone?: string;
  industry?: string;
  interestTag?: string;
  notes?: string;
  captureSource?: 'manual' | 'badge_scan' | 'qr';
  badgeScanData?: string;
}

export interface BPLeadUpdate {
  fullName?: string;
  companyName?: string;
  designation?: string;
  email?: string;
  phone?: string;
  industry?: string;
  interestTag?: string;
  notes?: string;
  status?: 'new' | 'qualified' | 'contacted' | 'converted' | 'lost';
}

// Leads Response
export interface BPLeadsResponse {
  leads: BPLead[];
  total: number;
  limit: number;
  offset: number;
}

// Qualification Types
export interface BPQualificationQuestion {
  id: string;
  questionText: string;
  questionType: 'text' | 'select' | 'multiselect' | 'number';
  options: string[];
  orderIndex: number;
  isRequired: boolean;
}

export interface BPQualificationAnswer {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: string;
}

export interface BPAnswerInput {
  questionId: string;
  answer: string;
}

// Follow-up Types
export interface BPFollowup {
  id: string;
  channel: 'whatsapp' | 'email';
  subject?: string;
  message: string;
  status: 'draft' | 'sent';
  generatedBy?: string;
  sentAt?: string;
  createdAt: string;
}

export interface BPFollowupGenerated {
  id: string;
  channel: 'whatsapp' | 'email';
  subject?: string;
  message: string;
}

// Analytics Types
export interface BPAnalyticsSummary {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  unscoredLeads: number;
  topIndustries: Array<{ name: string; count: number }>;
  topInterests: Array<{ name: string; count: number }>;
  staffLeaderboard: Array<{
    id: string;
    name: string;
    totalLeads: number;
    hotLeads: number;
  }>;
  leadsByDay: Array<{ date: string; count: number }>;
  followups: {
    total: number;
    sent: number;
  };
}

// User Management Types
export interface BPTeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'staff' | 'manager' | 'admin';
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface BPUserCreate {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'staff' | 'manager' | 'admin';
}

export interface BPUserUpdate {
  name?: string;
  phone?: string;
  role?: 'staff' | 'manager' | 'admin';
  isActive?: boolean;
  password?: string;
}

// Question Management Types
export interface BPQuestionCreate {
  questionText: string;
  questionType?: 'text' | 'select' | 'multiselect' | 'number';
  options?: string[];
  orderIndex?: number;
  isRequired?: boolean;
}

export interface BPQuestionUpdate {
  questionText?: string;
  questionType?: 'text' | 'select' | 'multiselect' | 'number';
  options?: string[];
  orderIndex?: number;
  isRequired?: boolean;
  isActive?: boolean;
}

// API Response Types
export interface BPApiResponse<T> {
  data?: T;
  error?: string;
}

// Filter Types
export interface BPLeadFilters {
  label?: 'HOT' | 'WARM' | 'COLD';
  status?: string;
  search?: string;
  capturedBy?: string;
  limit?: number;
  offset?: number;
}
