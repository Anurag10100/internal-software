import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LeaveRequest, Task, HRMSSettings, CheckIn } from '../types';
import { useAuth } from './AuthContext';
import api from '../services/api';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  leaveRequests: LeaveRequest[];
  tasks: Task[];
  checkIns: CheckIn[];
  hrmsSettings: HRMSSettings;
  isLoading: boolean;
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setCheckIns: React.Dispatch<React.SetStateAction<CheckIn[]>>;
  setHrmsSettings: React.Dispatch<React.SetStateAction<HRMSSettings>>;
  // Helper methods for filtered data
  getMyTasks: () => Task[];
  getDelegatedTasks: () => Task[];
  getMyLeaveRequests: () => LeaveRequest[];
  getMyCheckIns: () => CheckIn[];
  // API action methods
  createTask: (taskData: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  createLeaveRequest: (leaveData: any) => Promise<void>;
  updateLeaveRequest: (requestId: string, updates: any) => Promise<void>;
  checkIn: (location: string, notes?: string) => Promise<void>;
  checkOut: () => Promise<void>;
  refreshData: () => Promise<void>;
}

// Default fallback data for when server is not available
const defaultUsers: User[] = [
  { id: 'admin-1', name: 'Sachin Talwar', email: 'admin@wowevents.com', department: 'Management', role: 'admin' },
  { id: 'admin-2', name: 'Priya Sharma', email: 'hr@wowevents.com', department: 'HR', role: 'admin' },
  { id: 'user-1', name: 'Amit Talwar', email: 'amit@wowevents.com', department: 'Tech', role: 'employee' },
  { id: 'user-2', name: 'Neeti Choudhary', email: 'neeti@wowevents.com', department: 'Concept & Copy', role: 'employee' },
  { id: 'user-3', name: 'Animesh', email: 'animesh@wowevents.com', department: '2D', role: 'employee' },
  { id: 'user-4', name: 'Rahul Kumar', email: 'rahul@wowevents.com', department: '3D', role: 'employee' },
];

const defaultHRMSSettings: HRMSSettings = {
  timeSettings: { lateTime: '10:30 AM', halfDayTime: '11:00 AM' },
  locationOptions: [
    { id: '1', name: 'In Office (Gurugram)', isVisible: true },
    { id: '2', name: 'In Office (Delhi)', isVisible: true },
    { id: '3', name: 'Work From Home', isVisible: true },
    { id: '4', name: 'At Event', isVisible: true },
  ],
  leaveTypes: [
    { id: '1', name: 'Casual Leave', daysPerYear: 7, requiresDocument: false, isActive: true },
    { id: '2', name: 'Earned Leaves', daysPerYear: 12, requiresDocument: false, isActive: true },
    { id: '3', name: 'Sick Leave', daysPerYear: 7, requiresDocument: true, isActive: true },
    { id: '4', name: 'Unpaid Leave', daysPerYear: 'unlimited', requiresDocument: false, isActive: true },
    { id: '5', name: 'Work from Home', daysPerYear: 'unlimited', requiresDocument: false, isActive: true },
  ],
  weeklyOffSettings: {
    sunday: 'both_weeks',
    monday: 'not_weekly_off',
    tuesday: 'not_weekly_off',
    wednesday: 'not_weekly_off',
    thursday: 'not_weekly_off',
    friday: 'not_weekly_off',
    saturday: 'week1_only'
  },
  workingDayOverrides: [],
  hodUsers: [],
  hrEmailRecipients: [],
  holidays: [
    { id: '1', name: 'New Year', date: '2026-01-01', year: 2026 },
    { id: '2', name: 'Republic Day', date: '2026-01-26', year: 2026 },
  ],
  slackNotifications: { enabled: false, channelId: '' },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<User[]>(defaultUsers);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [hrmsSettings, setHrmsSettings] = useState<HRMSSettings>(defaultHRMSSettings);
  const [isLoading, setIsLoading] = useState(false);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [usersRes, tasksRes, leavesRes, checkinsRes, settingsRes] = await Promise.all([
        api.getUsers(),
        api.getTasks(),
        api.getLeaves(),
        api.getCheckins(),
        api.getSettings(),
      ]);

      if (usersRes.data?.users) {
        setUsers(usersRes.data.users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          department: u.department,
          role: u.role,
        })));
      }

      if (tasksRes.data?.tasks) {
        setTasks(tasksRes.data.tasks);
      }

      if (leavesRes.data?.leaves) {
        setLeaveRequests(leavesRes.data.leaves.map((l: any) => ({
          id: l.id,
          userId: l.userId,
          userName: l.userName,
          fromDate: l.startDate,
          toDate: l.endDate,
          leaveType: { id: '1', name: l.leaveType, daysPerYear: 7, requiresDocument: false, isActive: true },
          leaveCategory: 'full_day',
          hodId: l.approvedBy || '',
          hodName: '',
          reason: l.reason,
          status: l.status,
          createdAt: l.createdAt,
        })));
      }

      if (checkinsRes.data?.checkins) {
        setCheckIns(checkinsRes.data.checkins.map((c: any) => ({
          id: c.id,
          userId: c.userId,
          date: c.date,
          checkInTime: c.checkInTime,
          checkOutTime: c.checkOutTime,
          location: c.location,
          priorities: [],
        })));
      }

      if (settingsRes.data?.settings) {
        const s = settingsRes.data.settings;
        setHrmsSettings(prev => ({
          ...prev,
          timeSettings: {
            lateTime: s.lateTime || prev.timeSettings.lateTime,
            halfDayTime: s.halfDayTime || prev.timeSettings.halfDayTime,
          },
          locationOptions: s.locationOptions || prev.locationOptions,
          leaveTypes: s.leaveTypes || prev.leaveTypes,
          holidays: s.holidays || prev.holidays,
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Current user as User type
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
    if (isAdmin) return tasks;
    return tasks.filter(t => t.assignedTo === user.id);
  };

  // Helper: Get tasks assigned BY the current user
  const getDelegatedTasks = (): Task[] => {
    if (!user) return [];
    if (isAdmin) return tasks;
    return tasks.filter(t => t.assignedByUserId === user.id);
  };

  // Helper: Get leave requests for current user
  const getMyLeaveRequests = (): LeaveRequest[] => {
    if (!user) return [];
    if (isAdmin) return leaveRequests;
    return leaveRequests.filter(lr => lr.userId === user.id);
  };

  // Helper: Get check-ins for current user
  const getMyCheckIns = (): CheckIn[] => {
    if (!user) return [];
    if (isAdmin) return checkIns;
    return checkIns.filter(c => c.userId === user.id);
  };

  // API Actions
  const createTask = async (taskData: Partial<Task>) => {
    const { data, error } = await api.createTask(taskData);
    if (data?.task) {
      setTasks(prev => [data.task, ...prev]);
    } else if (error) {
      throw new Error(error);
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await api.deleteTask(taskId);
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } else {
      // Fallback: delete locally
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const { data, error } = await api.updateTask(taskId, updates);
    if (data?.task) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...data.task } : t));
    } else if (!error) {
      // Fallback: update locally
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    }
  };

  const createLeaveRequest = async (leaveData: any) => {
    const { data, error } = await api.createLeave(leaveData);
    if (data?.leave) {
      const newLeave: LeaveRequest = {
        id: data.leave.id,
        userId: data.leave.userId,
        userName: user?.name || '',
        fromDate: data.leave.startDate,
        toDate: data.leave.endDate,
        leaveType: { id: '1', name: data.leave.leaveType, daysPerYear: 7, requiresDocument: false, isActive: true },
        leaveCategory: 'full_day',
        hodId: '',
        hodName: '',
        reason: data.leave.reason,
        status: data.leave.status,
        createdAt: data.leave.createdAt,
      };
      setLeaveRequests(prev => [newLeave, ...prev]);
    } else if (error) {
      throw new Error(error);
    }
  };

  const updateLeaveRequest = async (requestId: string, updates: any) => {
    const { error } = await api.updateLeave(requestId, updates);
    if (!error) {
      setLeaveRequests(prev => prev.map(lr => lr.id === requestId ? { ...lr, status: updates.status || lr.status } : lr));
    }
  };

  const checkIn = async (location: string, notes?: string) => {
    const { data, error } = await api.checkIn({ location, notes });
    if (data?.checkin) {
      const newCheckin: CheckIn = {
        id: data.checkin.id,
        userId: user?.id || '',
        date: data.checkin.date,
        checkInTime: data.checkin.checkInTime,
        checkOutTime: undefined,
        location: data.checkin.location,
        priorities: [],
      };
      setCheckIns(prev => [newCheckin, ...prev.filter(c => c.date !== newCheckin.date || c.userId !== newCheckin.userId)]);
    } else if (error) {
      throw new Error(error);
    }
  };

  const checkOut = async () => {
    const { data, error } = await api.checkOut();
    if (data?.checkin) {
      setCheckIns(prev => prev.map(c =>
        c.id === data.checkin.id ? { ...c, checkOutTime: data.checkin.checkOutTime } : c
      ));
    } else if (error) {
      throw new Error(error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        leaveRequests,
        tasks,
        checkIns,
        hrmsSettings,
        isLoading,
        setLeaveRequests,
        setTasks,
        setCheckIns,
        setHrmsSettings,
        getMyTasks,
        getDelegatedTasks,
        getMyLeaveRequests,
        getMyCheckIns,
        createTask,
        deleteTask,
        updateTask,
        createLeaveRequest,
        updateLeaveRequest,
        checkIn,
        checkOut,
        refreshData,
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
