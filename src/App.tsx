import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { GovernanceNotificationProvider } from "@/contexts/GovernanceNotificationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import Diagnostic from "./pages/Diagnostic";
import Curative from "./pages/Curative";
import Analytics from "./pages/Analytics";
import Alerts from "./pages/Alerts";
import TeacherPanel from "./pages/TeacherPanel";
import SettingsPage from "./pages/Settings";
import Gamification from "./pages/Gamification";
import AcademicTests from "./pages/AcademicTests";
import AdminPanel from "./pages/AdminPanel";
import Requests from "./pages/Requests";
import AIKnowledgeHub from "./pages/AIKnowledgeHub";
import AITutor from "./pages/AITutor";
import SchoolAnalytics from "./pages/SchoolAnalytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
          <GovernanceNotificationProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/diagnostic" element={<ProtectedRoute><Diagnostic /></ProtectedRoute>} />
              <Route path="/curative" element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["teacher", "admin"]}>
                    <Curative />
                  </RoleGuard>
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["teacher", "admin", "school_admin"]}>
                    <Analytics />
                  </RoleGuard>
                </ProtectedRoute>
              } />
              <Route path="/alerts" element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["admin"]}>
                    <Alerts />
                  </RoleGuard>
                </ProtectedRoute>
              } />
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute>
                    <RoleGuard allowedRoles={["teacher", "admin", "school_admin"]}>
                      <TeacherPanel />
                    </RoleGuard>
                  </ProtectedRoute>
                }
              />
              <Route path="/gamification" element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["student", "admin"]}>
                    <Gamification />
                  </RoleGuard>
                </ProtectedRoute>
              } />
              <Route path="/academic-tests" element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["student"]}>
                    <AcademicTests />
                  </RoleGuard>
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["admin", "school_admin"]}>
                    <AdminPanel />
                  </RoleGuard>
                </ProtectedRoute>
              } />
              <Route path="/requests" element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["teacher"]}>
                    <Requests />
                  </RoleGuard>
                </ProtectedRoute>
              } />
              <Route path="/ai-knowledge" element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["admin", "teacher"]}>
                    <AIKnowledgeHub />
                  </RoleGuard>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </GovernanceNotificationProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
