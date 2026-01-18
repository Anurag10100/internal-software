import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import MyTasks from './pages/tasks/MyTasks';
import DelegatedTasks from './pages/tasks/DelegatedTasks';
import TeamTasks from './pages/tasks/TeamTasks';
import MyLeaves from './pages/hrms/MyLeaves';
import AllLeaves from './pages/hrms/AllLeaves';
import CheckIns from './pages/hrms/CheckIns';
import TeamCheckIns from './pages/hrms/TeamCheckIns';
import Attendance from './pages/hrms/Attendance';
import Settings from './pages/hrms/Settings';

function App() {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />

          {/* Task Management */}
          <Route path="/tasks/my-tasks" element={<MyTasks />} />
          <Route path="/tasks/delegated" element={<DelegatedTasks />} />
          <Route path="/tasks/team" element={<TeamTasks />} />
          <Route path="/tasks/ace-meeting" element={<MyTasks />} />

          {/* HRMS */}
          <Route path="/hrms/my-leaves" element={<MyLeaves />} />
          <Route path="/hrms/all-leaves" element={<AllLeaves />} />
          <Route path="/hrms/check-ins" element={<CheckIns />} />
          <Route path="/hrms/team-check-ins" element={<TeamCheckIns />} />
          <Route path="/hrms/attendance" element={<Attendance />} />
          <Route path="/hrms/settings" element={<Settings />} />

          {/* Placeholder routes */}
          <Route path="/crm" element={<Dashboard />} />
          <Route path="/team/*" element={<Dashboard />} />
          <Route path="/company-settings" element={<Settings />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AppProvider>
  );
}

export default App;
