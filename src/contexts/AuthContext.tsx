import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/apiService';
import { toast } from 'sonner';

// Canonical authenticated user shape, aligned with backend users table
// and AuthController::login / ::getProfile responses.
// Backend fields: id, role, name, email, phone, status, created_at, updated_at.
// We expose them in camelCase for convenience while keeping the core set minimal.
export interface AuthUser {
  id: number;
  role: 'admin' | 'teacher' | 'accountant' | 'parent';
  name: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'inactive' | 'suspended' | string;
  created_at?: string;
  updated_at?: string;
}

export interface RolePermissions {
  canManageUsers: boolean;
  canManageStudents: boolean;
  canManageTeachers: boolean;
  canManageParents: boolean;
  canManageClasses: boolean;
  canManageSubjects: boolean;
  canManageAssignments: boolean;
  canEnterScores: boolean;
  canApproveResults: boolean;
  canManagePayments: boolean;
  canVerifyPayments: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: string | string[]) => boolean;
  permissions: RolePermissions;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Role-based permissions
  const getRolePermissions = (role: string | null): RolePermissions => {
    const defaultPermissions: RolePermissions = {
      canManageUsers: false,
      canManageStudents: false,
      canManageTeachers: false,
      canManageParents: false,
      canManageClasses: false,
      canManageSubjects: false,
      canManageAssignments: false,
      canEnterScores: false,
      canApproveResults: false,
      canManagePayments: false,
      canVerifyPayments: false,
      canViewReports: false,
      canManageSettings: false,
    };

    switch (role) {
      case 'admin':
        return {
          ...defaultPermissions,
          canManageUsers: true,
          canManageStudents: true,
          canManageTeachers: true,
          canManageParents: true,
          canManageClasses: true,
          canManageSubjects: true,
          canManageAssignments: true,
          canApproveResults: true,
          canManagePayments: true,
          canViewReports: true,
          canManageSettings: true,
        };
      case 'teacher':
        return {
          ...defaultPermissions,
          canEnterScores: true,
          canViewReports: true,
        };
      case 'accountant':
        return {
          ...defaultPermissions,
          canManagePayments: true,
          canVerifyPayments: true,
          canViewReports: true,
        };
      case 'parent':
        return {
          ...defaultPermissions,
          canViewReports: true,
        };
      default:
        return defaultPermissions;
    }
  };

  const permissions = getRolePermissions(user?.role || null);

  // Initialize auth state with token verification
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = authAPI.getCurrentUser();
        if (currentUser) {
          // Verify token is still valid
          try {
            await authAPI.verifyToken();
            // currentUser comes directly from backend profile
            // and should already match AuthUser fairly closely.
            setUser(currentUser as AuthUser);
          } catch (error) {
            console.warn('Session expired or invalid:', error);
            logout();
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // Input validation
      if (!username || !password) {
        toast.error('Email and password are required');
        return;
      }
      
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
        toast.error('Please enter a valid email address');
        return;
      }
      
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }
      
      setLoading(true);
      const response = await authAPI.login({ email: username, password });
      
      // authAPI.login returns { token, user } after handling the envelope.
      // Cast to AuthUser so the rest of the app can rely on the canonical shape.
      if (response && response.user) {
        setUser(response.user as AuthUser);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        localStorage.setItem('authToken', response.token);
        
        toast.success(`Welcome back, ${response.user.name}!`);
        
        // Return success for navigation handling
        return response.user;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed';
      
      if (error?.response?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (error?.response?.status === 403) {
        errorMessage = 'Account is locked or inactive. Please contact administrator.';
      } else if (error?.response?.status === 429) {
        errorMessage = 'Too many login attempts. Please try again later.';
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      // Clear API tokens
      authAPI.logout();
      
      // Clear user state
      setUser(null);
      
      // Clear localStorage
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
      
      toast.info('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      setUser(null);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
    }
  };

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    permissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
