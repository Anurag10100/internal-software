# Employee Management System

A comprehensive internal software solution for managing employee leaves, tasks, attendance, and HRMS settings. Built with React, TypeScript, and Tailwind CSS.

## Features

### Daily Check-in
- Photo capture for attendance verification
- Location tracking with multiple office locations
- Daily 3 priorities that convert to tasks
- Integration with leave management

### Leave Management
- Request leave with multiple leave types
- HOD approval workflow
- Leave balance tracking
- Support for Casual Leave, Earned Leaves, Sick Leave, Unpaid Leave, WFH, and more

### Task Management
- My Tasks - Personal task dashboard
- Delegated Tasks - Tasks assigned to team members
- Team Tasks - Overview of all team tasks
- A.C.E. Performance tracking with leaderboards
- Task completion metrics and statistics

### HRMS Settings
- Time Settings (late time, half day time)
- Location Options management
- Leave Types configuration
- Weekly Off Settings
- Working Day Overrides
- Head of Department (HOD) management
- HR Email Recipients
- Holiday Calendar management
- Slack Notifications integration

### Attendance
- Monthly attendance grid view
- Visual status indicators (Present, Late, Half Day, Absent, WFH, Holiday)
- Employee-wise attendance tracking

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Layout.tsx
│   │   └── Sidebar.tsx
│   └── modals/
│       ├── CreateTaskModal.tsx
│       ├── DailyCheckInModal.tsx
│       └── RequestLeaveModal.tsx
├── context/
│   └── AppContext.tsx
├── pages/
│   ├── hrms/
│   │   ├── AllLeaves.tsx
│   │   ├── Attendance.tsx
│   │   ├── CheckIns.tsx
│   │   ├── MyLeaves.tsx
│   │   └── Settings.tsx
│   ├── tasks/
│   │   ├── DelegatedTasks.tsx
│   │   ├── MyTasks.tsx
│   │   └── TeamTasks.tsx
│   └── Dashboard.tsx
├── types/
│   └── index.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Features Overview

### Dashboard
- Welcome message with quick check-in
- Stats overview (Pending Tasks, Completed, Leave Requests, Performance)
- Today's tasks list
- Quick action buttons
- Announcements section

### My Tasks
- Task statistics (Total, Completed, In Request, In Progress, Delayed)
- Task list with assignee info, due dates, and tags
- Mark as Complete functionality
- A.C.E. Performance metrics
- Team leaderboard with rankings

### HRMS Settings
- Time Settings with late and half-day thresholds
- Location Options with visibility toggles
- Leave Types with days per year and document requirements
- Weekly Off Settings per day
- Holiday management with year filtering
- HOD and HR email recipient management
- Slack notification integration

## License

Private - Internal Use Only
