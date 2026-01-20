export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department?: string;
  role: 'admin' | 'manager' | 'employee';
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  fromDate: string;
  toDate: string;
  leaveType: LeaveType;
  leaveCategory: 'full_day' | 'half_day' | 'short_leave';
  hodId: string;
  hodName: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface LeaveType {
  id: string;
  name: string;
  daysPerYear: number | 'unlimited';
  requiresDocument: boolean;
  isActive: boolean;
}

export interface Task {
  id: string;
  title: string;
  assignedBy: string;
  assignedByUserId?: string;
  assignedByAvatar?: string;
  assignedTo: string;
  dueDate: string;
  dueTime: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  description?: string;
}

export interface CheckIn {
  id: string;
  userId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  location: string;
  locationAddress?: string;
  photoUrl?: string;
  priorities: string[];
  status?: 'on_time' | 'late' | 'half_day' | 'absent';
}

export interface LocationOption {
  id: string;
  name: string;
  isVisible: boolean;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  year: number;
}

export interface TimeSettings {
  lateTime: string;
  halfDayTime: string;
}

export interface WeeklyOffSettings {
  sunday: 'both_weeks' | 'week1_only' | 'week2_only' | 'not_weekly_off';
  monday: 'both_weeks' | 'week1_only' | 'week2_only' | 'not_weekly_off';
  tuesday: 'both_weeks' | 'week1_only' | 'week2_only' | 'not_weekly_off';
  wednesday: 'both_weeks' | 'week1_only' | 'week2_only' | 'not_weekly_off';
  thursday: 'both_weeks' | 'week1_only' | 'week2_only' | 'not_weekly_off';
  friday: 'both_weeks' | 'week1_only' | 'week2_only' | 'not_weekly_off';
  saturday: 'both_weeks' | 'week1_only' | 'week2_only' | 'not_weekly_off';
}

export interface HRMSSettings {
  timeSettings: TimeSettings;
  locationOptions: LocationOption[];
  leaveTypes: LeaveType[];
  weeklyOffSettings: WeeklyOffSettings;
  workingDayOverrides: string[];
  hodUsers: User[];
  hrEmailRecipients: User[];
  holidays: Holiday[];
  slackNotifications: {
    enabled: boolean;
    channelId: string;
  };
}

export interface TaskStats {
  totalTasks: number;
  completed: number;
  inRequest: number;
  inProgress: number;
  delayed: number;
  delayedPercentage: number;
}

export interface ACEPerformance {
  total: number;
  completed: number;
  onTime: number;
  onTimePercentage: number;
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  assigned: number;
  completed: number;
  onTime: number;
  completionPercentage: number;
  onTimePercentage: number;
  score: number;
  status: 'green' | 'yellow' | 'red';
}

// ==========================================
// PROBATION MANAGEMENT TYPES
// ==========================================

export interface Probation {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  department?: string;
  designation?: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  status: 'ongoing' | 'extended' | 'confirmed' | 'terminated';
  extended_till?: string;
  extension_reason?: string;
  confirmed_by?: string;
  confirmed_by_name?: string;
  confirmed_at?: string;
  notes?: string;
  created_at: string;
  checklists?: ProbationChecklist[];
  reviews?: ProbationReview[];
}

export interface ProbationReview {
  id: string;
  probation_id: string;
  reviewer_id: string;
  reviewer_name?: string;
  review_date: string;
  milestone: string;
  rating: number;
  feedback: string;
  recommendation: 'continue' | 'extend' | 'confirm' | 'terminate';
  created_at: string;
}

export interface ProbationChecklist {
  id: string;
  probation_id: string;
  item: string;
  is_completed: boolean;
  completed_at?: string;
  completed_by?: string;
}

// ==========================================
// APPRAISAL SYSTEM TYPES
// ==========================================

export interface AppraisalCycle {
  id: string;
  name: string;
  type: 'annual' | 'semi-annual' | 'quarterly';
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'closed';
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export interface Appraisal {
  id: string;
  cycle_id: string;
  cycle_name?: string;
  cycle_type?: string;
  cycle_start?: string;
  cycle_end?: string;
  employee_id: string;
  employee_name?: string;
  employee_email?: string;
  department?: string;
  designation?: string;
  manager_id: string;
  manager_name?: string;
  status: 'pending' | 'self_review' | 'manager_review' | 'completed';
  self_rating?: number;
  manager_rating?: number;
  final_rating?: number;
  self_comments?: string;
  manager_comments?: string;
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
  goals?: Goal[];
  feedback_360?: Feedback360[];
}

export interface Goal {
  id: string;
  user_id: string;
  user_name?: string;
  department?: string;
  appraisal_id?: string;
  title: string;
  description?: string;
  category: 'performance' | 'learning' | 'project';
  target_date: string;
  weightage: number;
  progress: number;
  status: 'active' | 'completed' | 'cancelled';
  self_rating?: number;
  manager_rating?: number;
  created_at: string;
}

export interface Feedback360 {
  id: string;
  appraisal_id: string;
  reviewer_id: string;
  reviewer_name?: string;
  reviewer_type: 'peer' | 'reportee' | 'cross-team';
  rating: number;
  strengths?: string;
  improvements?: string;
  comments?: string;
  is_anonymous: boolean;
  submitted_at?: string;
}

// ==========================================
// PERFORMANCE MANAGEMENT TYPES
// ==========================================

export interface KPI {
  id: string;
  user_id: string;
  user_name?: string;
  department?: string;
  designation?: string;
  title: string;
  description?: string;
  metric_type: 'number' | 'percentage' | 'currency' | 'boolean';
  target_value: number;
  current_value: number;
  unit: string;
  period: 'monthly' | 'quarterly' | 'annual';
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
  created_at: string;
}

export interface PerformanceNote {
  id: string;
  user_id: string;
  user_name?: string;
  department?: string;
  author_id: string;
  author_name?: string;
  type: 'praise' | 'concern' | 'observation';
  content: string;
  is_private: boolean;
  created_at: string;
}

export interface PIP {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  department?: string;
  designation?: string;
  manager_id: string;
  manager_name?: string;
  start_date: string;
  end_date: string;
  reason: string;
  goals: string[];
  status: 'active' | 'completed' | 'extended' | 'failed';
  outcome?: string;
  created_at: string;
  checkpoints?: PIPCheckpoint[];
}

export interface PIPCheckpoint {
  id: string;
  pip_id: string;
  checkpoint_date: string;
  progress_notes: string;
  rating: number;
  reviewed_by?: string;
  reviewed_by_name?: string;
  created_at: string;
}

export interface Recognition {
  id: string;
  recipient_id: string;
  recipient_name?: string;
  recipient_department?: string;
  nominator_id: string;
  nominator_name?: string;
  type: 'appreciation' | 'award' | 'badge';
  badge: 'star_performer' | 'team_player' | 'innovator' | 'helping_hand' | 'quick_learner';
  title: string;
  message: string;
  is_public: boolean;
  created_at: string;
}

export interface PerformanceDashboardStats {
  kpis: {
    total: number;
    achieved: number;
    on_track: number;
    at_risk: number;
    behind: number;
  };
  activePips: number;
  recentRecognitions: number;
  goals: {
    total: number;
    completed: number;
    avg_progress: number;
  };
}
