import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, LeaveRequest, Task, HRMSSettings, CheckIn } from '../types';

interface AppContextType {
  currentUser: User;
  users: User[];
  leaveRequests: LeaveRequest[];
  tasks: Task[];
  checkIns: CheckIn[];
  hrmsSettings: HRMSSettings;
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setCheckIns: React.Dispatch<React.SetStateAction<CheckIn[]>>;
  setHrmsSettings: React.Dispatch<React.SetStateAction<HRMSSettings>>;
}

const defaultUser: User = {
  id: '1',
  name: 'Sachin Talwar',
  email: 'sachin@wowevents.in',
  avatar: '/avatars/sachin.jpg',
  department: 'Management',
  role: 'admin',
};

const defaultUsers: User[] = [
  defaultUser,
  { id: '2', name: 'Tarun Fuloria', email: 'mis@wowevents.in', department: 'MIS', role: 'manager' },
  { id: '3', name: 'Amit Talwar', email: 'amit@wowevents.in', department: 'Operations', role: 'manager' },
  { id: '4', name: 'Priya Sharma', email: 'priya@wowevents.in', department: 'HR', role: 'employee' },
  { id: '5', name: 'Rahul Kumar', email: 'rahul@wowevents.in', department: 'Design', role: 'employee' },
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
    { id: '1', name: 'Sachin Talwar', email: 'sachin@wowevents.in', role: 'admin' },
    { id: '2', name: 'Tarun Fuloria', email: 'mis@wowevents.in', role: 'manager' },
    { id: '3', name: 'Amit Talwar', email: 'amit@wowevents.in', role: 'manager' },
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

const defaultTasks: Task[] = [
  {
    id: '1',
    title: 'Test 2',
    assignedBy: 'Sachin Talwar',
    assignedTo: '1',
    dueDate: '2026-01-07',
    dueTime: '5:00 PM',
    status: 'in_progress',
    priority: 'high',
    tags: ['daily-priority'],
  },
  {
    id: '2',
    title: 'Test 1',
    assignedBy: 'Sachin Talwar',
    assignedTo: '1',
    dueDate: '2026-01-07',
    dueTime: '5:00 PM',
    status: 'in_progress',
    priority: 'high',
    tags: ['daily-priority'],
  },
  {
    id: '3',
    title: 'Tes 3',
    assignedBy: 'Sachin Talwar',
    assignedTo: '1',
    dueDate: '2026-01-07',
    dueTime: '5:00 PM',
    status: 'in_progress',
    priority: 'medium',
    tags: ['daily-priority'],
  },
  {
    id: '4',
    title: 'Team Meetings',
    assignedBy: 'Sachin Talwar',
    assignedTo: '1',
    dueDate: '2026-01-07',
    dueTime: '5:00 PM',
    status: 'in_progress',
    priority: 'medium',
    tags: ['daily-priority'],
  },
  {
    id: '5',
    title: 'Business Hour',
    assignedBy: 'Sachin Talwar',
    assignedTo: '1',
    dueDate: '2026-01-07',
    dueTime: '5:00 PM',
    status: 'in_progress',
    priority: 'low',
    tags: ['daily-priority'],
  },
  {
    id: '6',
    title: 'WOWOS Meetings',
    assignedBy: 'Sachin Talwar',
    assignedTo: '1',
    dueDate: '2026-01-07',
    dueTime: '5:00 PM',
    status: 'in_progress',
    priority: 'low',
    tags: ['daily-priority'],
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [hrmsSettings, setHrmsSettings] = useState<HRMSSettings>(defaultHRMSSettings);

  return (
    <AppContext.Provider
      value={{
        currentUser: defaultUser,
        users: defaultUsers,
        leaveRequests,
        tasks,
        checkIns,
        hrmsSettings,
        setLeaveRequests,
        setTasks,
        setCheckIns,
        setHrmsSettings,
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
