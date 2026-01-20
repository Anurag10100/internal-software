import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import MyTasks from './pages/tasks/MyTasks';
import DelegatedTasks from './pages/tasks/DelegatedTasks';
import TeamTasks from './pages/tasks/TeamTasks';
import MyLeaves from './pages/hrms/MyLeaves';
import AllLeaves from './pages/hrms/AllLeaves';
import CheckIns from './pages/hrms/CheckIns';
import TeamCheckIns from './pages/hrms/TeamCheckIns';
import Attendance from './pages/hrms/Attendance';
import Settings from './pages/hrms/Settings';
import TeamManagement from './pages/team/TeamManagement';

// Performance Management
import PerformanceDashboard from './pages/performance/PerformanceDashboard';
import MyKPIs from './pages/performance/MyKPIs';
import Recognition from './pages/performance/Recognition';

// Appraisals
import MyAppraisals from './pages/appraisals/MyAppraisals';
import Goals from './pages/appraisals/Goals';

// Probation
import ProbationDashboard from './pages/probation/ProbationDashboard';
import MyProbation from './pages/probation/MyProbation';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ToastProvider>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      {/* Dashboard */}
                      <Route path="/" element={<Dashboard />} />

                      {/* Profile */}
                      <Route path="/profile" element={<Profile />} />

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

                      {/* Team Management - Admin Only */}
                      <Route
                        path="/team/management"
                        element={
                          <ProtectedRoute requireAdmin>
                            <TeamManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/team/employees"
                        element={
                          <ProtectedRoute requireAdmin>
                            <TeamManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/team/departments"
                        element={
                          <ProtectedRoute requireAdmin>
                            <TeamManagement />
                          </ProtectedRoute>
                        }
                      />

                      {/* Performance Management */}
                      <Route
                        path="/performance/dashboard"
                        element={
                          <ProtectedRoute requireAdmin>
                            <PerformanceDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/performance/my-kpis" element={<MyKPIs />} />
                      <Route path="/performance/goals" element={<Goals />} />
                      <Route path="/performance/recognition" element={<Recognition />} />

                      {/* Appraisals */}
                      <Route path="/appraisals/my-appraisals" element={<MyAppraisals />} />
                      <Route path="/appraisals/goals" element={<Goals />} />
                      <Route
                        path="/appraisals/all"
                        element={
                          <ProtectedRoute requireAdmin>
                            <MyAppraisals />
                          </ProtectedRoute>
                        }
                      />

                      {/* Probation */}
                      <Route
                        path="/probation/dashboard"
                        element={
                          <ProtectedRoute requireAdmin>
                            <ProbationDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/probation/my-status" element={<MyProbation />} />

                      {/* Placeholder routes */}
                      <Route path="/crm" element={<Dashboard />} />
                      <Route path="/company-settings" element={<Settings />} />

                      {/* Fallback */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
