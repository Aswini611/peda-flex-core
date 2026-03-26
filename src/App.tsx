import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Diagnostic from "./pages/Diagnostic";
import Curative from "./pages/Curative";
import Analytics from "./pages/Analytics";
import Alerts from "./pages/Alerts";
import TeacherPanel from "./pages/TeacherPanel";
import SettingsPage from "./pages/Settings";
import Gamification from "./pages/Gamification";
import AcademicTests from "./pages/AcademicTests";
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
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
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
                  <RoleGuard allowedRoles={["teacher", "admin"]}>
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
                    <RoleGuard allowedRoles={["teacher", "admin"]}>
                      <TeacherPanel />
                    </RoleGuard>
                  </ProtectedRoute>
                }
              />
              <Route path="/gamification" element={<ProtectedRoute><Gamification /></ProtectedRoute>} />
              <Route path="/academic-tests" element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["student"]}>
                    <AcademicTests />
                  </RoleGuard>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
