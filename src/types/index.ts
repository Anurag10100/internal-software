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
  locationAddress: string;
  photoUrl?: string;
  priorities: string[];
  status: 'on_time' | 'late' | 'half_day' | 'absent';
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
