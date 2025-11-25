import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { authAPI, API_BASE_URL } from '../services/apiService';

interface AuthFlowOptions {
  requireAuth?: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
  onAuthSuccess?: () => void;
  onAuthError?: (error: Error) => void;
}

export function useAuthFlow(options: AuthFlowOptions = {}) {
  const {
    requireAuth = false,
    allowedRoles,
    redirectTo,
    onAuthSuccess,
    onAuthError,
  } = options;

  const { user, loading, isAuthenticated, hasRole, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const checkAuth = useCallback(() => {
    if (loading) return;

    // Check if authentication is required
    if (requireAuth && !isAuthenticated) {
      const loginPath = redirectTo || '/login';
      navigate(loginPath, { 
        state: { from: location.pathname },
        replace: true 
      });
      return false;
    }

    // Check role permissions
    if (isAuthenticated && allowedRoles && !hasRole(allowedRoles)) {
      navigate('/unauthorized', { replace: true });
      return false;
    }

    // Authentication successful
    if (isAuthenticated) {
      onAuthSuccess?.();
    }

    return true;
  }, [
    loading,
    isAuthenticated,
    requireAuth,
    allowedRoles,
    hasRole,
    navigate,
    location.pathname,
    redirectTo,
    onAuthSuccess,
  ]);

  // Check authentication on mount and when dependencies change
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogin = useCallback(async (username: string, password: string) => {
    try {
      await login(username, password);
      
      // Redirect to intended destination or default dashboard
      const from = location.state?.from;
      if (from) {
        navigate(from, { replace: true });
      } else if (user?.role) {
        navigate(`/${user.role}`, { replace: true });
      }
      
      onAuthSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Login failed');
      onAuthError?.(err);
      throw err;
    }
  }, [login, navigate, location.state, user?.role, onAuthSuccess, onAuthError]);

  return {
    canAccess: checkAuth(),
    handleLogin,
    isLoading: loading,
    user,
    isAuthenticated,
  };
}

// Route guard hook for specific roles
export function useRoleGuard(requiredRole: string) {
  const { user, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    if (!hasRole(requiredRole)) {
      toast.error('Access denied: insufficient permissions');
      navigate('/unauthorized', { replace: true });
      return;
    }
  }, [isAuthenticated, hasRole, requiredRole, navigate]);

  return {
    isAuthorized: isAuthenticated && hasRole(requiredRole),
    user,
  };
}

// Session management hook
export function useSessionManager() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Auto-logout on session expiry
  useEffect(() => {
    if (!user) return;

    // Check session every 5 minutes
    const interval = setInterval(async () => {
      try {
        const valid = await authAPI.verifyToken();
        if (!valid) {
          throw new Error('Token expired');
        }
      } catch (error) {
        console.warn('Session expired:', error);
        logout();
        navigate('/login', { replace: true });
        toast.warning('Session expired. Please login again.');
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, logout, navigate]);

  // Handle tab visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Refresh session when tab becomes visible
        fetch(`${API_BASE_URL}/auth/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }).catch(() => {
          // Silent fail - let the interval handle session expiry
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);
}

// Prefetch data for authenticated routes
export function usePrefetchOnAuth() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      // Prefetch essential data
      const prefetchEssentialData = async () => {
        try {
          // Prefetch user profile
          await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
          });

          // Prefetch notifications
          await fetch(`${API_BASE_URL}/notifications`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
          });
        } catch (error) {
          // Silent fail - data will be fetched when needed
        }
      };

      // Small delay to avoid blocking initial render
      setTimeout(prefetchEssentialData, 100);
    }
  }, [isAuthenticated]);
}
