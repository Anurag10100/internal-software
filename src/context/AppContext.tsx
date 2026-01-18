import { createContext, useContext, useState, ReactNode } from 'react';
import { User, LeaveRequest, Task, HRMSSettings, CheckIn } from '../types';
import { useAuth } from './AuthContext';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  leaveRequests: LeaveRequest[];
  tasks: Task[];
  checkIns: CheckIn[];
  hrmsSettings: HRMSSettings;
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setCheckIns: React.Dispatch<React.SetStateAction<CheckIn[]>>;
  setHrmsSettings: React.Dispatch<React.SetStateAction<HRMSSettings>>;
  // Helper methods for filtered data
  getMyTasks: () => Task[];
  getDelegatedTasks: () => Task[];
  getMyLeaveRequests: () => LeaveRequest[];
  getMyCheckIns: () => CheckIn[];
  // Action methods
  deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateLeaveRequest: (requestId: string, updates: Partial<LeaveRequest>) => void;
}

const defaultUsers: User[] = [
  { id: 'admin-1', name: 'Sachin Talwar', email: 'admin@wowevents.com', department: 'Management', role: 'admin' },
  { id: 'admin-2', name: 'Priya Sharma', email: 'hr@wowevents.com', department: 'HR', role: 'admin' },
  { id: 'user-1', name: 'Amit Talwar', email: 'amit@wowevents.com', department: 'Tech', role: 'employee' },
  { id: 'user-2', name: 'Neeti Choudhary', email: 'neeti@wowevents.com', department: 'Concept & Copy', role: 'employee' },
  { id: 'user-3', name: 'Animesh', email: 'animesh@wowevents.com', department: '2D', role: 'employee' },
  { id: 'user-4', name: 'Rahul Kumar', email: 'rahul@wowevents.com', department: '3D', role: 'employee' },
];

const defaultHRMSSettings: HRMSSettings = {
  timeSettings: {
    lateTime: '10:30 AM',
    halfDayTime: '11:00 AM',
  },
  locationOptions: [
    { id: '1', name: 'In Office (Gurugram)', isVisible: true },
    { id: '2', name: 'In Office (Delhi)', isVisible: true },
    { id: '3', name: 'In Meeting', isVisible: true },
    { id: '4', name: 'Work From Home', isVisible: true },
    { id: '5', name: 'At Event', isVisible: true },
  ],
  leaveTypes: [
    { id: '1', name: 'Casual Leave', daysPerYear: 7, requiresDocument: false, isActive: true },
    { id: '2', name: 'Earned Leaves', daysPerYear: 12, requiresDocument: false, isActive: true },
    { id: '3', name: 'Sick Leave', daysPerYear: 7, requiresDocument: true, isActive: true },
    { id: '4', name: 'Unpaid Leave', daysPerYear: 'unlimited', requiresDocument: false, isActive: true },
    { id: '5', name: 'Work from Home', daysPerYear: 'unlimited', requiresDocument: false, isActive: true },
    { id: '6', name: 'On Probation Leave', daysPerYear: 1, requiresDocument: false, isActive: true },
  ],
  weeklyOffSettings: {
    sunday: 'both_weeks',
    monday: 'not_weekly_off',
    tuesday: 'not_weekly_off',
    wednesday: 'not_weekly_off',
    thursday: 'not_weekly_off',
    friday: 'not_weekly_off',
    saturday: 'week1_only',
  },
  workingDayOverrides: [],
  hodUsers: [
    { id: 'admin-1', name: 'Sachin Talwar', email: 'admin@wowevents.com', role: 'admin' },
    { id: 'admin-2', name: 'Priya Sharma', email: 'hr@wowevents.com', role: 'admin' },
  ],
  hrEmailRecipients: [],
  holidays: [
    { id: '1', name: 'New Year', date: '2026-01-01', year: 2026 },
    { id: '2', name: 'Republic Day', date: '2026-01-26', year: 2026 },
    { id: '3', name: 'Holi', date: '2026-03-04', year: 2026 },
    { id: '4', name: 'Independence Day', date: '2026-08-15', year: 2026 },
    { id: '5', name: 'Dussehra', date: '2026-10-20', year: 2026 },
    { id: '6', name: 'Diwali', date: '2026-11-08', year: 2026 },
  ],
  slackNotifications: {
    enabled: true,
    channelId: 'C024F4VK0',
  },
};

// Mock tasks for different users
const defaultTasks: Task[] = [
  // Tasks assigned to Amit (user-1)
  {
    id: '1',
    title: 'Complete API Integration',
    assignedBy: 'Sachin Talwar',
    assignedByUserId: 'admin-1',
    assignedTo: 'user-1',
    dueDate: '2026-01-20',
    dueTime: '5:00 PM',
    status: 'in_progress',
    priority: 'high',
    tags: ['tech', 'urgent'],
  },
  {
    id: '2',
    title: 'Code Review - Auth Module',
    assignedBy: 'Sachin Talwar',
    assignedByUserId: 'admin-1',
    assignedTo: 'user-1',
    dueDate: '2026-01-18',
    dueTime: '3:00 PM',
    status: 'pending',
    priority: 'medium',
    tags: ['review'],
  },
  {
    id: '3',
    title: 'Team Standup Meeting',
    assignedBy: 'Priya Sharma',
    assignedByUserId: 'admin-2',
    assignedTo: 'user-1',
    dueDate: '2026-01-18',
    dueTime: '10:00 AM',
    status: 'completed',
    priority: 'low',
    tags: ['meeting'],
  },
  // Tasks assigned to Neeti (user-2)
  {
    id: '4',
    title: 'Write Blog Post - Q1 Updates',
    assignedBy: 'Sachin Talwar',
    assignedByUserId: 'admin-1',
    assignedTo: 'user-2',
    dueDate: '2026-01-22',
    dueTime: '5:00 PM',
    status: 'in_progress',
    priority: 'high',
    tags: ['content', 'marketing'],
  },
  {
    id: '5',
    title: 'Social Media Calendar',
    assignedBy: 'Priya Sharma',
    assignedByUserId: 'admin-2',
    assignedTo: 'user-2',
    dueDate: '2026-01-19',
    dueTime: '2:00 PM',
    status: 'pending',
    priority: 'medium',
    tags: ['social'],
  },
  // Tasks assigned to Animesh (user-3)
  {
    id: '6',
    title: 'Design Landing Page Mockups',
    assignedBy: 'Sachin Talwar',
    assignedByUserId: 'admin-1',
    assignedTo: 'user-3',
    dueDate: '2026-01-21',
    dueTime: '5:00 PM',
    status: 'in_progress',
    priority: 'high',
    tags: ['design', 'urgent'],
  },
  {
    id: '7',
    title: 'Update Brand Guidelines',
    assignedBy: 'Priya Sharma',
    assignedByUserId: 'admin-2',
    assignedTo: 'user-3',
    dueDate: '2026-01-25',
    dueTime: '5:00 PM',
    status: 'pending',
    priority: 'low',
    tags: ['branding'],
  },
  // Tasks assigned to Rahul (user-4)
  {
    id: '8',
    title: '3D Product Renders',
    assignedBy: 'Sachin Talwar',
    assignedByUserId: 'admin-1',
    assignedTo: 'user-4',
    dueDate: '2026-01-23',
    dueTime: '5:00 PM',
    status: 'in_progress',
    priority: 'high',
    tags: ['3d', 'client'],
  },
  {
    id: '9',
    title: 'Animation for Event Promo',
    assignedBy: 'Sachin Talwar',
    assignedByUserId: 'admin-1',
    assignedTo: 'user-4',
    dueDate: '2026-01-24',
    dueTime: '5:00 PM',
    status: 'pending',
    priority: 'medium',
    tags: ['animation'],
  },
  // Tasks delegated by Amit (user-1) to others - to show delegated tasks
  {
    id: '10',
    title: 'Unit Test Coverage',
    assignedBy: 'Amit Talwar',
    assignedByUserId: 'user-1',
    assignedTo: 'user-4',
    dueDate: '2026-01-20',
    dueTime: '5:00 PM',
    status: 'pending',
    priority: 'medium',
    tags: ['testing'],
  },
];

// Mock leave requests
const defaultLeaveRequests: LeaveRequest[] = [
  {
    id: '1',
    userId: 'user-1',
    userName: 'Amit Talwar',
    fromDate: '2026-01-25',
    toDate: '2026-01-26',
    leaveType: { id: '1', name: 'Casual Leave', daysPerYear: 7, requiresDocument: false, isActive: true },
    leaveCategory: 'full_day',
    hodId: 'admin-1',
    hodName: 'Sachin Talwar',
    reason: 'Family function',
    status: 'pending',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: '2',
    userId: 'user-2',
    userName: 'Neeti Choudhary',
    fromDate: '2026-01-20',
    toDate: '2026-01-20',
    leaveType: { id: '3', name: 'Sick Leave', daysPerYear: 7, requiresDocument: true, isActive: true },
    leaveCategory: 'full_day',
    hodId: 'admin-2',
    hodName: 'Priya Sharma',
    reason: 'Not feeling well',
    status: 'approved',
    createdAt: '2026-01-14T09:00:00Z',
  },
  {
    id: '3',
    userId: 'user-3',
    userName: 'Animesh',
    fromDate: '2026-01-28',
    toDate: '2026-01-30',
    leaveType: { id: '1', name: 'Casual Leave', daysPerYear: 7, requiresDocument: false, isActive: true },
    leaveCategory: 'full_day',
    hodId: 'admin-1',
    hodName: 'Sachin Talwar',
    reason: 'Personal work',
    status: 'pending',
    createdAt: '2026-01-16T11:00:00Z',
  },
];

// Mock check-ins
const defaultCheckIns: CheckIn[] = [
  {
    id: '1',
    userId: 'user-1',
    date: '2026-01-18',
    checkInTime: '9:30 AM',
    checkOutTime: '6:30 PM',
    location: 'In Office (Gurugram)',
    priorities: ['Complete API Integration', 'Code Review', 'Team Meeting'],
  },
  {
    id: '2',
    userId: 'user-1',
    date: '2026-01-17',
    checkInTime: '9:45 AM',
    checkOutTime: '6:15 PM',
    location: 'Work From Home',
    priorities: ['Bug fixes', 'Documentation', 'Client call'],
  },
  {
    id: '3',
    userId: 'user-2',
    date: '2026-01-18',
    checkInTime: '10:00 AM',
    checkOutTime: '6:00 PM',
    location: 'In Office (Gurugram)',
    priorities: ['Write blog post', 'Social media updates', 'Content review'],
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(defaultLeaveRequests);
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [checkIns, setCheckIns] = useState<CheckIn[]>(defaultCheckIns);
  const [hrmsSettings, setHrmsSettings] = useState<HRMSSettings>(defaultHRMSSettings);

  // Get current user as User type (for backward compatibility)
  const currentUser: User | null = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department,
    role: user.role === 'admin' ? 'admin' : 'employee',
  } : null;

  // Helper: Get tasks assigned TO the current user
  const getMyTasks = (): Task[] => {
    if (!user) return [];
    if (isAdmin) return tasks; // Admins see all tasks
    return tasks.filter(t => t.assignedTo === user.id);
  };

  // Helper: Get tasks assigned BY the current user
  const getDelegatedTasks = (): Task[] => {
    if (!user) return [];
    if (isAdmin) return tasks; // Admins see all tasks
    return tasks.filter(t => t.assignedByUserId === user.id);
  };

  // Helper: Get leave requests for current user
  const getMyLeaveRequests = (): LeaveRequest[] => {
    if (!user) return [];
    if (isAdmin) return leaveRequests; // Admins see all leave requests
    return leaveRequests.filter(lr => lr.userId === user.id);
  };

  // Helper: Get check-ins for current user
  const getMyCheckIns = (): CheckIn[] => {
    if (!user) return [];
    if (isAdmin) return checkIns; // Admins see all check-ins
    return checkIns.filter(c => c.userId === user.id);
  };

  // Action: Delete a task
  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // Action: Update a task
  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  // Action: Update a leave request
  const updateLeaveRequest = (requestId: string, updates: Partial<LeaveRequest>) => {
    setLeaveRequests(prev => prev.map(lr => lr.id === requestId ? { ...lr, ...updates } : lr));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users: defaultUsers,
        leaveRequests,
        tasks,
        checkIns,
        hrmsSettings,
        setLeaveRequests,
        setTasks,
        setCheckIns,
        setHrmsSettings,
        getMyTasks,
        getDelegatedTasks,
        getMyLeaveRequests,
        getMyCheckIns,
        deleteTask,
        updateTask,
        updateLeaveRequest,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
