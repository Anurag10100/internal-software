import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { BoothPilotProvider } from './context/BoothPilotContext';
import ProtectedRoute from './components/ProtectedRoute';
import BPProtectedRoute from './components/BPProtectedRoute';
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';

// BoothPilot AI Pages
import BPLogin from './pages/boothpilot/BPLogin';
import BPLayout from './pages/boothpilot/BPLayout';
import BPDashboard from './pages/boothpilot/BPDashboard';
import BPBoothMode from './pages/boothpilot/BPBoothMode';
import BPLeadsList from './pages/boothpilot/BPLeadsList';
import BPLeadDetail from './pages/boothpilot/BPLeadDetail';
import BPSettingsUsers from './pages/boothpilot/settings/BPSettingsUsers';
import BPSettingsQuestions from './pages/boothpilot/settings/BPSettingsQuestions';
import BPSettingsExhibitor from './pages/boothpilot/settings/BPSettingsExhibitor';
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

// Enterprise Modules
import PayrollDashboard from './pages/payroll/PayrollDashboard';
import RecruitmentDashboard from './pages/recruitment/RecruitmentDashboard';
import LearningDashboard from './pages/learning/LearningDashboard';
import AssetDashboard from './pages/assets/AssetDashboard';
import ExpenseDashboard from './pages/expenses/ExpenseDashboard';
import OrgChart from './pages/organization/OrgChart';
import DocumentCenter from './pages/documents/DocumentCenter';
import AnnouncementCenter from './pages/announcements/AnnouncementCenter';
import OffboardingDashboard from './pages/offboarding/OffboardingDashboard';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ToastProvider>
          <BoothPilotProvider>
            <Routes>
              {/* BoothPilot AI Routes */}
              <Route path="/boothpilot/login" element={<BPLogin />} />
              <Route
                path="/boothpilot/*"
                element={
                  <BPProtectedRoute>
                    <BPLayout />
                  </BPProtectedRoute>
                }
              >
                <Route index element={<BPDashboard />} />
                <Route path="booth" element={<BPBoothMode />} />
                <Route path="leads" element={<BPLeadsList />} />
                <Route path="leads/:id" element={<BPLeadDetail />} />
                <Route path="settings/users" element={<BPSettingsUsers />} />
                <Route path="settings/questions" element={<BPSettingsQuestions />} />
                <Route path="settings/exhibitor" element={<BPSettingsExhibitor />} />
              </Route>

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

                      {/* Payroll Management */}
                      <Route
                        path="/payroll/*"
                        element={
                          <ProtectedRoute requireAdmin>
                            <PayrollDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/payroll/my-payslips" element={<PayrollDashboard />} />

                      {/* Recruitment & ATS */}
                      <Route
                        path="/recruitment/*"
                        element={
                          <ProtectedRoute requireAdmin>
                            <RecruitmentDashboard />
                          </ProtectedRoute>
                        }
                      />

                      {/* Learning & Development */}
                      <Route path="/learning/*" element={<LearningDashboard />} />

                      {/* Asset Management */}
                      <Route
                        path="/assets/*"
                        element={
                          <ProtectedRoute requireAdmin>
                            <AssetDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/assets/my-assets" element={<AssetDashboard />} />

                      {/* Expense Management */}
                      <Route path="/expenses/*" element={<ExpenseDashboard />} />

                      {/* Organization */}
                      <Route path="/organization/*" element={<OrgChart />} />

                      {/* Document Center */}
                      <Route path="/documents/*" element={<DocumentCenter />} />

                      {/* Announcements & Events */}
                      <Route path="/announcements/*" element={<AnnouncementCenter />} />

                      {/* Offboarding */}
                      <Route
                        path="/offboarding/*"
                        element={
                          <ProtectedRoute requireAdmin>
                            <OffboardingDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/offboarding/my-exit" element={<OffboardingDashboard />} />

                      {/* Analytics & Reports */}
                      <Route
                        path="/analytics/*"
                        element={
                          <ProtectedRoute requireAdmin>
                            <AnalyticsDashboard />
                          </ProtectedRoute>
                        }
                      />

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
          </BoothPilotProvider>
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
