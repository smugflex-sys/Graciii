import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import { SchoolProvider } from './contexts/SchoolContext';
import { AuthProvider, useAuth, RolePermissions } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import './index.css';

// Lazy loaded components
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./components/LoginPage').then(m => ({ default: m.LoginPage })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const AccountantDashboard = lazy(() => import('./components/AccountantDashboard').then(m => ({ default: m.AccountantDashboard })));
const ParentDashboard = lazy(() => import('./components/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const ResultReportCard = lazy(() => import('./components/ResultReportCard').then(m => ({ default: m.ResultReportCard })));
const UnauthorizedPage = lazy(() => import('./components/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })));
const HealthPage = lazy(() => import('./components/admin/HealthPage').then(m => ({ default: m.HealthPage })));

// Role-based route wrapper with permission checking
const RoleBasedRoute = ({ role, requiredPermissions, children }: { 
  role: string; 
  requiredPermissions?: (keyof RolePermissions)[];
  children: React.ReactNode 
}) => {
  const { user, permissions } = useAuth();
  
  if (user?.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  // Check specific permissions if required
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(perm => permissions[perm]);
    if (!hasAllPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }
  
  return <>{children}</>;
};

// App content with routing
function AppContent() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRoles="admin">
              <RoleBasedRoute role="admin">
                <AdminDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/teacher/*"
          element={
            <ProtectedRoute requiredRoles="teacher">
              <RoleBasedRoute role="teacher">
                <TeacherDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/accountant/*"
          element={
            <ProtectedRoute requiredRoles="accountant">
              <RoleBasedRoute role="accountant">
                <AccountantDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/parent/*"
          element={
            <ProtectedRoute requiredRoles="parent">
              <RoleBasedRoute role="parent">
                <ParentDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        
        {/* Common protected routes */}
        <Route
          path="/report-card/:id"
          element={
            <ProtectedRoute>
              <ResultReportCard onClose={() => window.history.back()} />
            </ProtectedRoute>
          }
        />
        
        {/* Admin health page */}
        <Route
          path="/health"
          element={
            <ProtectedRoute requiredRoles="admin">
              <HealthPage />
            </ProtectedRoute>
          }
        />
        
        {/* Error routes */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SchoolProvider>
          <AppContent />
          <Toaster />
        </SchoolProvider>
      </AuthProvider>
    </Router>
  );
}
