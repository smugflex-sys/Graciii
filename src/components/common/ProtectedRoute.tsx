import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, RolePermissions } from '../../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import { Shield, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string | string[];
  requiredPermissions?: (keyof RolePermissions)[];
  requireAllPermissions?: boolean;
  redirectTo?: string;
  showUnauthorizedPage?: boolean;
}

export const ProtectedRoute = ({
  children,
  requiredRoles,
  requiredPermissions,
  requireAllPermissions = false,
  redirectTo = '/login',
  showUnauthorizedPage = false,
}: ProtectedRouteProps) => {
  const { isAuthenticated, hasRole, permissions, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: window.location.pathname }} replace />;
  }

  // Check role requirements
  if (requiredRoles && !hasRole(requiredRoles)) {
    if (showUnauthorizedPage) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have the required role to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
    return <Navigate to="/unauthorized" replace />;
  }

  // Check permission requirements
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasPermission = requireAllPermissions
      ? requiredPermissions.every(perm => permissions[perm])
      : requiredPermissions.some(perm => permissions[perm]);

    if (!hasPermission) {
      if (showUnauthorizedPage) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
              <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Permission Required</h2>
              <p className="text-gray-600 mb-4">
                You don't have the required permissions to access this feature.
              </p>
              <button
                onClick={() => window.history.back()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        );
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
