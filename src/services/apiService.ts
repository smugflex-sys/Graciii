import { toast } from 'sonner';
import type {
  ClassSubject,
  Score,
  SystemInfo
} from './apiTypes';
import { SecurityHeaders, RateLimiter, SecurityValidator } from '../config/security';

// Session and Term interfaces (matching SchoolContext)
export interface Session {
  id: number;
  name: string;
  is_active: boolean;
  prefix?: string;
  status: 'active' | 'inactive';
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface Term {
  id: number;
  session_id: number;
  name: string;
  is_active: boolean;
  is_current: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  session_name?: string; // From JOIN with sessions
}

type RequestParams = Record<string, string | number | boolean | undefined>;

// Types
type CacheEntry<T = any> = {
  data: T;
  timestamp: number;
};

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  params?: Record<string, string | number | boolean | undefined>;
  useCache?: boolean;
};

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL
const CACHE = new Map<string, CacheEntry>();
const PENDING_REQUESTS = new Map<string, Promise<Response>>();

// Request timeout
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Support both Vite (VITE_) and Create React App (REACT_APP_) environment variables
// Default to relative URL for development, production URL for deployment
export const API_BASE_URL = 
  (import.meta as any)?.env?.VITE_API_BASE_URL || 
  (typeof process !== 'undefined' && (process as any)?.env?.REACT_APP_API_URL) || 
  // For local development, use relative URL to work with backend's /api stripping
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '/api' 
    : 'https://gracelandroyalacademy.org/api');

// Enhanced rate limiting configuration
const RATE_LIMITS = {
  login: { limit: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  password: { limit: 3, window: 15 * 60 * 1000 }, // 3 attempts per 15 minutes
  payment: { limit: 10, window: 60 * 1000 }, // 10 payments per minute
  score: { limit: 50, window: 60 * 1000 }, // 50 score entries per minute
  default: { limit: 100, window: 60 * 1000 }, // 100 requests per minute for others
};

// Helper function to get rate limit configuration
const getRateLimitConfig = (endpoint: string): { limit: number; window: number } => {
  const key = endpoint.toLowerCase();
  for (const [configKey, config] of Object.entries(RATE_LIMITS)) {
    if (configKey !== 'default' && key.includes(configKey)) {
      return config;
    }
  }
  return RATE_LIMITS.default;
};
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    // Enhanced error handling with specific messages based on status codes
    let errorMessage = (data as any)?.message || 'An error occurred';
    
    switch (response.status) {
      case 400:
        errorMessage = (data as any)?.message || 'Invalid request. Please check your input.';
        break;
      case 401:
        errorMessage = 'Your session has expired. Please log in again.';
        break;
      case 403:
        errorMessage = 'You do not have permission to perform this action.';
        break;
      case 404:
        errorMessage = 'The requested resource was not found.';
        break;
      case 422:
        errorMessage = (data as any)?.message || 'Validation failed. Please check your input.';
        break;
      case 429:
        errorMessage = 'Too many requests. Please try again later.';
        break;
      case 500:
        errorMessage = 'Server error. Please try again later.';
        break;
      default:
        errorMessage = (data as any)?.message || `Request failed with status ${response.status}`;
    }
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).data = data;
    (error as any).isApiError = true;
    
    throw error;
  }
  
  // Handle response envelope format: { success, message, data }
  if (data && typeof data === 'object' && 'success' in data) {
    // Return the data field from the envelope
    return (data as any).data as T;
  }
  
  // Handle direct response (no envelope)
  return data as T;
}

// Helper function to get headers with auth and security
function getHeaders(auth = true): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  if (auth) {
    const token = localStorage.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

// Build URL with query parameters
function buildUrl(endpoint: string, params: RequestParams = {}): string {
  const isAbsoluteBase = /^https?:\/\//i.test(API_BASE_URL);

  let urlObj: URL;
  if (isAbsoluteBase) {
    urlObj = new URL(endpoint, API_BASE_URL);
  } else {
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    urlObj = new URL(`${base}${path}`, window.location.origin);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      urlObj.searchParams.append(key, String(value));
    }
  });

  return urlObj.toString();
}

/**
 * Main API client that handles all HTTP requests with built-in caching and authentication.
 * Provides methods for making GET, POST, PUT, and DELETE requests with proper TypeScript support.
 */
const apiClient = {
  /**
   * Makes an HTTP request with the given options.
   * @template T - The expected response type
   * @param {string} endpoint - The API endpoint to call (e.g., '/users')
   * @param {RequestOptions} [options={}] - Request options including headers, method, etc.
   * @returns {Promise<T>} A promise that resolves to the response data
   * @throws {Error} If the request fails or returns an error status
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const safeOptions = options || {};
    const {
      skipAuth = false,
      useCache = true,
      params = {},
      ...requestOptions
    } = safeOptions;

    // Build the full URL with query parameters
    const url = buildUrl(endpoint, params);
    const cacheKey = `${requestOptions.method || 'GET'}:${url}`;

    // Apply enhanced rate limiting
    const rateLimitConfig = getRateLimitConfig(endpoint);
    const rateLimitKey = `${endpoint}:${localStorage.getItem('userId') || 'anonymous'}`;
    
    if (!RateLimiter.isAllowed(rateLimitKey, rateLimitConfig.limit)) {
      const remainingTime = Math.ceil((RateLimiter.getResetTime(rateLimitKey) - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. Please try again in ${remainingTime} seconds.`);
    }

    // Validate request data for security
    if (requestOptions.body && typeof requestOptions.body === 'object') {
      // Sanitize string fields to prevent XSS
      const sanitizedBody = JSON.parse(JSON.stringify(requestOptions.body, (key, value) => {
        if (typeof value === 'string') {
          return SecurityValidator.sanitizeInput(value);
        }
        return value;
      }));
      requestOptions.body = JSON.stringify(sanitizedBody);
    }

    // Handle GET requests with cache
    if (requestOptions.method?.toUpperCase() === 'GET' && useCache) {
      const cached = CACHE.get(cacheKey);
      
      // Return cached data if it's still valid
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return Promise.resolve(cached.data as T);
      }

      // Check for pending requests for the same URL
      const pendingRequest = PENDING_REQUESTS.get(cacheKey);
      if (pendingRequest) {
        return pendingRequest.then(handleResponse) as Promise<T>;
      }
    }

    // Create the request promise with enhanced security
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const requestPromise = SecurityHeaders.secureFetch(url, {
      ...requestOptions,
      signal: controller.signal,
      headers: {
        ...getHeaders(!skipAuth),
        ...(requestOptions.headers || {}),
      } as HeadersInit,
    })
      .then(async (response) => {
        clearTimeout(timeoutId);
        const data = await handleResponse<T>(response);
        
        // Cache successful GET responses
        if (requestOptions.method?.toUpperCase() === 'GET' && response.ok && useCache) {
          CACHE.set(cacheKey, {
            data,
            timestamp: Date.now(),
          });
        }
        
        return data;
      })
      .catch(async (error) => {
        clearTimeout(timeoutId);
        
        // Handle 401 Unauthorized
        if (error.status === 401) {
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              // Try to refresh the token
              const refreshResponse = await this.post<{
                token: string;
                refreshToken?: string;
              }>(
                '/auth/refresh',
                { refreshToken },
                { skipAuth: true }
              );

              const newToken = (refreshResponse as any)?.token as string | undefined;
              const newRefreshToken = undefined; // Refresh endpoint only returns new access token

              if (newToken) {
                // Update tokens
                localStorage.setItem('authToken', newToken);
                if (newRefreshToken) {
                  localStorage.setItem('refreshToken', newRefreshToken);
                }

                // Retry the original request with new token
                return this.request<T>(endpoint, options);
              }
            }
          } catch (refreshError) {
            // If refresh fails, log out the user
            console.error('Failed to refresh token:', refreshError);
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('currentUser');
            window.dispatchEvent(new Event('auth:logout'));
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Enhanced error handling and user feedback
        if (error.status) {
          // Handle different error types appropriately
          if (error.status === 401) {
            // Already handled above by token refresh
            return Promise.reject(error);
          } else if (error.status === 403) {
            // Forbidden - don't show toast, let component handle
            return Promise.reject(error);
          } else if (error.status === 422) {
            // Validation errors - show specific message
            const validationErrors = (error as any)?.data?.errors;
            if (validationErrors && typeof validationErrors === 'object') {
              const errorMessages = Object.values(validationErrors).join(', ');
              toast.error(`Validation failed: ${errorMessages}`);
            } else {
              toast.error(error.message || 'Please check your input and try again.');
            }
          } else if (error.status >= 500) {
            // Server errors - generic message
            toast.error('Server is temporarily unavailable. Please try again later.');
          } else {
            // Other client errors
            toast.error(error.message || 'An error occurred. Please try again.');
          }
        } else {
          // Network errors or connection issues
          if (error.name === 'AbortError') {
            toast.error('Request timed out. Please try again.');
          } else if (error.message.includes('fetch')) {
            toast.error('Unable to connect to the server. Please check your internet connection.');
          } else {
            toast.error('An unexpected error occurred. Please try again.');
          }
        }

        return Promise.reject(error);
      });

    // Store the promise to prevent duplicate requests
    if (requestOptions.method?.toUpperCase() === 'GET' && useCache) {
      PENDING_REQUESTS.set(cacheKey, requestPromise.then(() => ({} as Response)));
      // Remove from pending requests when resolved
      requestPromise.finally(() => {
        PENDING_REQUESTS.delete(cacheKey);
      });
    }

    return requestPromise;
  },

  get<T = any>(
    endpoint: string, 
    params: RequestParams = {},
    options: Omit<RequestOptions, 'method' | 'params' | 'body'> = {}
  ): Promise<T> {
    const requestParams = Object.entries(params).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      }, 
      {}
    );

    const requestOptions: RequestOptions = {
      ...(options || {}),
      method: 'GET',
      params: requestParams
    };
    
    return this.request<T>(endpoint, requestOptions);
  },

  post<T>(
    endpoint: string,
    data: any,
    options: Omit<RequestOptions, 'body' | 'method'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put<T>(
    endpoint: string,
    data: any,
    options: Omit<RequestOptions, 'body' | 'method'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      params,
    });
  },

  // File upload helper
  async upload<T>(
    endpoint: string,
    file: File,
    fieldName = 'file',
    params: Record<string, string | number> = {}
  ): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    // Remove Content-Type header to let browser set it with boundary
    const { 'Content-Type': _, ...headers } = getHeaders();

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: headers as HeadersInit,
      params,
    });
  },
};

/**
 * Authentication API endpoints for user login, logout, and session management.
 * Handles JWT token management and user authentication state.
 * @namespace authAPI
 */
// ==================== AUTHENTICATION API ====================

export const authAPI = {
  async login(credentials: { email: string; password: string }) {
    const response = await apiClient.post<{
      token: string;
      refreshToken?: string;
      user: any;
    }>('/auth/login', credentials);

    // Response is automatically unwrapped by handleResponse
    const token = (response as any)?.token as string | undefined;
    const refreshToken = (response as any)?.refreshToken as string | undefined;
    const user = (response as any)?.user;

    if (token && user) {
      localStorage.setItem('authToken', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      localStorage.setItem('currentUser', JSON.stringify(user));

      // Notify app that authentication has succeeded
      window.dispatchEvent(new Event('auth:login'));
      return { token, user };
    }

    console.error('Unexpected auth response:', response);
    throw new Error('Authentication failed');
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return { success: true };
  },

  changePassword(data: { oldPassword: string; newPassword: string }) {
    return apiClient.put('/auth/change-password', data);
  },

  getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  },

  async verifyToken() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // This endpoint should verify the token and return user data if valid
      const response = await apiClient.get<any>('/auth/profile');
      if (response) {
        localStorage.setItem('currentUser', JSON.stringify(response));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token verification failed:', error);
      // Clear invalid auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('refreshToken');
      throw error;
    }
  },
};

/**
 * Users API for managing user accounts and profiles.
 * @namespace usersAPI
 */
// ==================== USERS API ====================

export const usersAPI = {
  getAll(params?: { role?: string; status?: string }) {
    return apiClient.get('/users', params);
  },

  getById(id: number) {
    return apiClient.get('/users/view', { id });
  },

  getByRole(role: string) {
    return apiClient.get('/users/by-role', { role });
  },

  search(query: string) {
    return apiClient.get('/users/search', { q: query });
  },

  getStats() {
    return apiClient.get('/users/stats');
  },

  create(userData: any) {
    // Map frontend fields to backend fields for user creation
    const payload: any = { ...userData };

    // Handle name field mapping (frontend may send firstName/lastName, backend expects name/fullName)
    if (!payload.name && (payload.firstName || payload.lastName)) {
      const first = (payload.firstName || '').toString().trim();
      const last = (payload.lastName || '').toString().trim();
      payload.name = `${first} ${last}`.trim();
    } else if (!payload.name && payload.fullName) {
      payload.name = payload.fullName;
    }

    // Remove frontend-only fields that backend doesn't expect
    delete payload.firstName;
    delete payload.lastName;
    delete payload.fullName;

    // Map role-specific field names from camelCase to snake_case
    if (payload.employeeId && !payload.employee_id) {
      payload.employee_id = payload.employeeId;
      delete payload.employeeId;
    }
    
    if (payload.isClassTeacher !== undefined && !payload.is_class_teacher) {
      payload.is_class_teacher = payload.isClassTeacher;
      delete payload.isClassTeacher;
    }
    
    if (payload.classTeacherId !== undefined && !payload.class_teacher_id) {
      payload.class_teacher_id = payload.classTeacherId;
      delete payload.classTeacherId;
    }
    
    if (payload.studentIds !== undefined && !payload.student_ids) {
      payload.student_ids = payload.studentIds;
      delete payload.studentIds;
    }
    
    if (payload.photoUrl !== undefined && !payload.photo_url) {
      payload.photo_url = payload.photoUrl;
      delete payload.photoUrl;
    }
    
    if (payload.dateOfBirth !== undefined && !payload.date_of_birth) {
      payload.date_of_birth = payload.dateOfBirth;
      delete payload.dateOfBirth;
    }
    
    if (payload.employeeLevel !== undefined && !payload.employee_level) {
      payload.employee_level = payload.employeeLevel;
      delete payload.employeeLevel;
    }

    return apiClient.post('/users', payload);
  },

  update(id: number, userData: any) {
    return apiClient.put('/users', userData, { params: { id } });
  },

  delete(id: number) {
    return apiClient.delete('/users', { id });
  },

  updateStatus(id: number, status: string) {
    return apiClient.post('/users/update-status', {}, { params: { id, status } });
  },
};

/**
 * Sessions API for managing academic sessions.
 * @namespace sessionsAPI
 */
// ==================== SESSIONS API ====================

export const sessionsAPI = {
  getAll(): Promise<Session[]> {
    return apiClient.get('/sessions');
  },

  getActive(): Promise<{ data: Session } | Session> {
    return apiClient.get('/sessions/active');
  },

  getById(id: number): Promise<{ data: Session } | Session> {
    return apiClient.get('/sessions/view', { id });
  },

  create(sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Session } | Session> {
    return apiClient.post('/sessions', sessionData);
  },

  update(id: number, sessionData: Partial<Omit<Session, 'id' | 'created_at' | 'updated_at'>>): Promise<{ data: Session } | Session> {
    return apiClient.put('/sessions', sessionData, { params: { id } });
  },

  delete(id: number): Promise<{ success: boolean }> {
    return apiClient.delete('/sessions', { id });
  },

  setActive(id: number): Promise<{ data: Session } | Session> {
    return apiClient.post('/sessions/active', { id });
  },

  getStats(): Promise<{ data: { total_sessions: number; active_sessions: number; inactive_sessions: number } }> {
    return apiClient.get('/sessions/stats');
  },
};

/**
 * Terms API for managing academic terms.
 * @namespace termsAPI
 */
// ==================== TERMS API ====================

export const termsAPI = {
  getAll(params?: { session_id?: number; is_active?: boolean; status?: string }): Promise<Term[]> {
    return apiClient.get('/terms', params);
  },

  getActive(): Promise<{ data: Term } | Term> {
    return apiClient.get('/terms/active');
  },

  getCurrent(): Promise<{ data: Term } | Term> {
    return apiClient.get('/terms/current');
  },

  getById(id: number): Promise<{ data: Term } | Term> {
    return apiClient.get('/terms/view', { id });
  },

  getBySession(sessionId: number): Promise<Term[]> {
    return apiClient.get('/terms/by-session', { session_id: sessionId });
  },

  create(termData: Omit<Term, 'id' | 'created_at' | 'updated_at' | 'session_name'>): Promise<{ data: Term } | Term> {
    return apiClient.post('/terms', termData);
  },

  update(id: number, termData: Partial<Omit<Term, 'id' | 'created_at' | 'updated_at' | 'session_name'>>): Promise<{ data: Term } | Term> {
    return apiClient.put('/terms', termData, { params: { id } });
  },

  delete(id: number): Promise<{ success: boolean }> {
    return apiClient.delete('/terms', { id });
  },

  setActive(id: number): Promise<{ data: Term } | Term> {
    return apiClient.post('/terms/set-active', {}, { params: { id } });
  },

  search(query: string): Promise<Term[]> {
    return apiClient.get('/terms/search', { q: query });
  },
};

/**
 * Classes API for managing academic classes and their properties.
 * @namespace classesAPI
 */
// ==================== CLASSES API ====================

export const classesAPI = {
  async getAll(params?: { status?: string; level?: string; classTeacherId?: number; limit?: number; includeStudents?: boolean }) {
    const apiParams: RequestParams = {};

    if (params?.status !== undefined) {
      apiParams.status = params.status;
    }
    if (params?.level !== undefined) {
      apiParams.level = params.level;
    }
    if (params?.classTeacherId !== undefined) {
      apiParams.class_teacher_id = params.classTeacherId;
    }
    if (params?.limit !== undefined) {
      apiParams.limit = params.limit;
    }
    if (params?.includeStudents !== undefined) {
      apiParams.include_students = params.includeStudents;
    }

    const response = await apiClient.get('/classes', apiParams);
    return response;
  },

  getById(id: number) {
    return apiClient.get('/classes/view', { id });
  },

  getWithStudents(id: number) {
    return apiClient.get('/classes/with-students', { id });
  },

  getWithSubjects(classId: number) {
    return apiClient.get('/classes/with-subjects', { id: classId });
  },

  create(classData: any) {
    const payload: any = { ...classData };

    // Map frontend fields to backend fields
    if (payload.classTeacherId !== undefined && payload.class_teacher_id === undefined) {
      payload.class_teacher_id = payload.classTeacherId;
    }

    // Remove frontend-only fields
    delete payload.section;
    delete payload.currentStudents;
    delete payload.classTeacherId;
    delete payload.classTeacher;
    delete payload.academicYear;

    return apiClient.post('/classes', payload);
  },

  update(id: number, classData: any) {
    const payload: any = { ...classData };

    if (payload.classTeacherId !== undefined && payload.class_teacher_id === undefined) {
      payload.class_teacher_id = payload.classTeacherId;
    }

    delete payload.section;
    delete payload.currentStudents;
    delete payload.classTeacherId;
    delete payload.classTeacher;
    delete payload.academicYear;

    return apiClient.put('/classes', payload, { params: { id } });
  },

  delete(id: number) {
    return apiClient.delete('/classes', { id });
  },

  assignSubjectToClass(classId: number, subjectId: number) {
    return apiClient.post('/classes/assign-subject', {
      class_id: classId,
      subject_id: subjectId,
    });
  },

  removeSubjectFromClass(classId: number, subjectId: number) {
    return apiClient.post('/classes/remove-subject', {
      class_id: classId,
      subject_id: subjectId,
    });
  },
};

/**
 * Subjects API for managing academic subjects and their details.
 * @namespace subjectsAPI
 */
// ==================== SUBJECTS API ====================

export const subjectsAPI = {

  async getAll(params?: { status?: string; isCore?: boolean; limit?: number }) {
    const apiParams: RequestParams = {};

    if (params?.status !== undefined) {
      apiParams.status = params.status;
    }
    if (params?.isCore !== undefined) {
      apiParams.is_core = params.isCore;
    }
    if (params?.limit !== undefined) {
      apiParams.limit = params.limit;
    }

    const response = await apiClient.get('/subjects', apiParams);
    return response;
  },

  getById(id: number) {
    return apiClient.get('/subjects/view', { id });
  },

  getWithClasses(subjectId: number) {
    return apiClient.get('/subjects/with-classes', { id: subjectId });
  },

  create(subjectData: any) {
    const payload: any = { ...subjectData };

    // Map frontend Subject shape -> backend fields
    if (payload.isCore !== undefined && payload.is_core === undefined) {
      payload.is_core = payload.isCore;
      delete payload.isCore;
    }

    if (payload.creditUnits !== undefined && payload.credit_units === undefined) {
      payload.credit_units = payload.creditUnits;
      delete payload.creditUnits;
    }

    // Keep status as Active/Inactive since backend now handles it properly
    if (payload.status === 'Active') {
      payload.status = 'Active';
    } else if (payload.status === 'Inactive') {
      payload.status = 'Inactive';
    }

    // Map frontend fields to backend
    if (payload.department !== undefined) {
      payload.department = payload.department; // Already mapped
    }
    
    // Remove frontend-only fields
    delete payload.creditUnits;

    return apiClient.post('/subjects', payload);
  },

  update(id: number, subjectData: any) {
    const payload: any = { ...subjectData };

    if (payload.isCore !== undefined && payload.is_core === undefined) {
      payload.is_core = payload.isCore;
    }

    // Keep status as Active/Inactive since backend now handles it properly
    if (payload.status === 'Active') {
      payload.status = 'Active';
    } else if (payload.status === 'Inactive') {
      payload.status = 'Inactive';
    }

    delete payload.department;

    return apiClient.put('/subjects', payload, { params: { id } });
  },

  delete(id: number) {
    return apiClient.delete('/subjects', { id });
  },

  getWithTeachers(subjectId: number, classId?: number) {
    const params: RequestParams = { id: subjectId };
    if (classId !== undefined) {
      params.class_id = classId;
    }
    return apiClient.get('/subjects/with-teachers', params);
  },

  assignToTeacher(subjectId: number, teacherId: number, options?: { classId?: number; academicYear?: string; term?: string; isPrimaryTeacher?: boolean }) {
    const payload: RequestParams = {
      subject_id: subjectId,
      teacher_id: teacherId,
    };
    
    if (options?.classId !== undefined) {
      payload.class_id = options.classId;
    }
    if (options?.academicYear !== undefined) {
      payload.academic_year = options.academicYear;
    }
    if (options?.term !== undefined) {
      payload.term = options.term;
    }
    if (options?.isPrimaryTeacher !== undefined) {
      payload.is_primary_teacher = options.isPrimaryTeacher;
    }
    
    return apiClient.post('/subjects/assign-to-teacher', payload);
  },

  removeTeacherAssignment(subjectId: number, teacherId: number, classId?: number) {
    const payload: RequestParams = {
      subject_id: subjectId,
      teacher_id: teacherId,
    };
    
    if (classId !== undefined) {
      payload.class_id = classId;
    }
    
    return apiClient.post('/subjects/remove-teacher-assignment', payload);
  },

  getTeacherSubjects(teacherId: number, options?: { classId?: number; academicYear?: string; term?: string }) {
    const params: RequestParams = { teacher_id: teacherId };
    
    if (options?.classId !== undefined) {
      params.class_id = options.classId;
    }
    if (options?.academicYear !== undefined) {
      params.academic_year = options.academicYear;
    }
    if (options?.term !== undefined) {
      params.term = options.term;
    }
    
    return apiClient.get('/subjects/teacher-subjects', params);
  },

  getSubjectsByDepartment(department: string) {
    return apiClient.get('/subjects/by-department', { department });
  },

  getDepartmentStats() {
    return apiClient.get('/subjects/department-stats');
  },
};

/**
 * Students API for managing student records and information.
 * @namespace studentsAPI
 */
// ==================== STUDENTS API ====================

export const studentsAPI = {

  async getAll(params?: { 
  classId?: number; 
  classIds?: number[];
  parentId?: number; 
  status?: string; 
  gender?: string; 
  limit?: number; 
  offset?: number;
  search?: string;
}) {
    const apiParams: RequestParams = {};

    if (params?.classId !== undefined) {
      apiParams.class_id = params.classId;
    }
    if (params?.classIds && params.classIds.length > 0) {
      // Send multiple class IDs as comma-separated for backend
      apiParams.class_ids = params.classIds.join(',');
    }
    if (params?.parentId !== undefined) {
      apiParams.parent_id = params.parentId;
    }
    if (params?.status !== undefined) {
      apiParams.status = params.status;
    }
    if (params?.gender !== undefined) {
      apiParams.gender = params.gender;
    }
    if (params?.limit !== undefined) {
      apiParams.limit = params.limit;
    }
    if (params?.offset !== undefined) {
      apiParams.offset = params.offset;
    }
    if (params?.search !== undefined) {
      apiParams.search = params.search;
    }

    const response = await apiClient.get('/students', apiParams);
    return response;
  },

  getById(id: number) {
    return apiClient.get('/students/view', { id });
  },

  create(studentData: any) {
    // Map common frontend SchoolContext Student shape to backend Student model fields
    const payload: any = { ...studentData };

    // Name mapping
    if ((payload.firstName || payload.lastName) && !payload.full_name) {
      const first = (payload.firstName || '').toString().trim();
      const last = (payload.lastName || '').toString().trim();
      payload.full_name = `${first} ${last}`.trim();
    }

    // Student ID mapping (if provided)
    if (payload.studentId && !payload.student_id) {
      payload.student_id = payload.studentId;
    }

    // Admission number / registration number
    if (payload.admissionNumber && !payload.reg_no) {
      payload.reg_no = payload.admissionNumber;
    }

    // Date of birth
    if (payload.dateOfBirth && !payload.dob) {
      payload.dob = payload.dateOfBirth;
    }

    // Class and parent IDs
    if (payload.classId !== undefined && payload.class_id === undefined) {
      payload.class_id = payload.classId;
    }
    if (payload.parentId !== undefined && payload.parent_id === undefined) {
      payload.parent_id = payload.parentId;
    }

    // Photo
    if (payload.photoUrl && !payload.photo_path) {
      payload.photo_path = payload.photoUrl;
    }

    // Level mapping (if provided)
    if (payload.level && !payload.level) {
      payload.level = payload.level;
    }

    // Academic year mapping (if provided)
    if (payload.academicYear && !payload.academic_year) {
      payload.academic_year = payload.academicYear;
    }

    // Status mapping (frontend uses 'Active' | 'Inactive' | 'Graduated')
    if (payload.status === 'Active') {
      payload.status = 'Active';
    } else if (payload.status === 'Inactive') {
      payload.status = 'Inactive';
    } else if (payload.status === 'Graduated') {
      payload.status = 'Graduated';
    }

    // Remove purely-frontend fields (but keep optional ones that backend can handle)
    delete payload.firstName;
    delete payload.lastName;
    delete payload.admissionNumber;
    delete payload.dateOfBirth;
    delete payload.classId;
    delete payload.parentId;
    delete payload.photoUrl;
    delete payload.className;
    delete payload.academicYear; // Keep academic_year instead

    return apiClient.post('/students', payload);
  },

  update(id: number, studentData: any) {
    // Map common frontend field names to backend student fields
    const payload: any = { ...studentData };

    if ('classId' in payload && payload.classId !== undefined) {
      payload.class_id = payload.classId;
      delete payload.classId;
    }

    if ('parentId' in payload && payload.parentId !== undefined) {
      payload.parent_id = payload.parentId;
      delete payload.parentId;
    }

    if (payload.status === 'Active') {
      payload.status = 'active';
    } else if (payload.status === 'Inactive') {
      payload.status = 'inactive';
    }

    // If first/last name fields are present (SchoolContext Student), build full_name
    if (payload.firstName || payload.lastName) {
      const first = (payload.firstName || '').toString().trim();
      const last = (payload.lastName || '').toString().trim();
      if (first || last) {
        payload.full_name = `${first} ${last}`.trim();
      }
    }

    // Map admissionNumber/dateOfBirth if provided
    if (payload.admissionNumber) {
      payload.reg_no = payload.admissionNumber;
    }
    if (payload.dateOfBirth) {
      payload.dob = payload.dateOfBirth;
    }

    // Photo
    if (payload.photoUrl) {
      payload.photo_path = payload.photoUrl;
    }

    // Remove frontend-only fields that the backend does not know about
    delete payload.firstName;
    delete payload.lastName;
    delete payload.admissionNumber;
    delete payload.dateOfBirth;
    delete payload.className;
    delete payload.level;
    delete payload.photoUrl;
    delete payload.academicYear;

    return apiClient.put('/students', payload, { params: { id } });
  },

  delete(id: number) {
    return apiClient.delete('/students', { id });
  },

  async getByClass(classId: number) {
    return apiClient.get('/students/by-class', { class_id: classId });
  },

  search(query: string) {
    return apiClient.get('/students/search', { q: query });
  },
};

/**
 * Payments API for handling student fee payments and financial records.
 * @namespace paymentsAPI
 */
// ==================== PAYMENTS API ====================

export const paymentsAPI = {
  async getAll(params?: { status?: string; studentId?: number }) {
    const apiParams: RequestParams = {};

    if (params?.status !== undefined) {
      apiParams.status = params.status;
    }

    if (params?.studentId !== undefined) {
      apiParams.student_id = params.studentId;
    }

    const response = await apiClient.get('/payments', apiParams);
    return response;
  },

  create(paymentData: any) {
    return apiClient.post('/payments', paymentData);
  },

  manual(paymentData: any) {
    return apiClient.post('/payments/manual', paymentData);
  },

  verify(data: { id: number }) {
    return apiClient.put('/payments/verify', {}, { params: data });
  },

  getPending() {
    return apiClient.get('/payments/pending');
  },

  getByStudent(studentId: number) {
    return apiClient.get('/payments/student', { student_id: studentId });
  },

  uploadProof(file: File) {
    return apiClient.upload('/payments/upload-proof', file, 'proof');
  },
};

export const accountantsAPI = {
  getDashboard: () =>
    apiClient.get<any>('/accountants/dashboard'),
};

/**
 * Teachers API for managing teacher records and profiles.
 * @namespace teachersAPI
 */
// ==================== TEACHERS API ====================

export const teachersAPI = {
  create: (teacherData: any) => {
    // Map frontend Teacher interface to backend teacher fields
    const payload: any = { ...teacherData };
    
    // Name mapping
    if (payload.firstName || payload.lastName) {
      payload.first_name = payload.firstName;
      payload.last_name = payload.lastName;
      delete payload.firstName;
      delete payload.lastName;
    }
    
    // Boolean mapping
    if (payload.isClassTeacher !== undefined) {
      payload.is_class_teacher = payload.isClassTeacher ? 1 : 0;
      delete payload.isClassTeacher;
    }
    
    // Field name mapping
    if (payload.classTeacherId !== undefined) {
      payload.class_teacher_id = payload.classTeacherId;
      delete payload.classTeacherId;
    }
    
    // Specialization JSON handling
    if (payload.specialization && Array.isArray(payload.specialization)) {
      payload.specialization = JSON.stringify(payload.specialization);
    }
    
    return apiClient.post('/teachers', payload);
  },
  
  getAll: (params?: any) => {
    const apiParams: any = {};
    
    if (params?.classTeacherId !== undefined) {
      apiParams.class_teacher_id = params.classTeacherId;
    }
    if (params?.status !== undefined) {
      apiParams.status = params.status;
    }
    
    return apiClient.get('/teachers', apiParams);
  },
  
  getById: (id: number) => apiClient.get('/teachers', { id }),
  
  update: (id: number, data: any) => {
    const payload: any = { ...data };
    
    // Apply same mappings as create
    if (payload.firstName || payload.lastName) {
      payload.first_name = payload.firstName;
      payload.last_name = payload.lastName;
      delete payload.firstName;
      delete payload.lastName;
    }
    
    if (payload.isClassTeacher !== undefined) {
      payload.is_class_teacher = payload.isClassTeacher ? 1 : 0;
      delete payload.isClassTeacher;
    }
    
    if (payload.classTeacherId !== undefined) {
      payload.class_teacher_id = payload.classTeacherId;
      delete payload.classTeacherId;
    }
    
    if (payload.specialization && Array.isArray(payload.specialization)) {
      payload.specialization = JSON.stringify(payload.specialization);
    }
    
    return apiClient.put('/teachers', { id, ...payload });
  },
  
  delete: (id: number) => apiClient.delete('/teachers', { id }),
};

/**
 * Parents API for managing parent records and profiles.
 * @namespace parentsAPI
 */
// ==================== PARENTS API ====================

export const parentsAPI = {
  create: (parentData: any) => {
    // Map frontend Parent interface to backend parent fields
    const payload: any = { ...parentData };
    
    // Name mapping
    if (payload.firstName || payload.lastName) {
      payload.first_name = payload.firstName;
      payload.last_name = payload.lastName;
      delete payload.firstName;
      delete payload.lastName;
    }
    
    // Student IDs JSON handling
    if (payload.studentIds && Array.isArray(payload.studentIds)) {
      payload.student_ids = JSON.stringify(payload.studentIds);
      delete payload.studentIds;
    }
    
    return apiClient.post('/parents', payload);
  },
  
  getAll: (params?: any) => {
    const apiParams: any = {};
    
    if (params?.status !== undefined) {
      apiParams.status = params.status;
    }
    
    return apiClient.get('/parents', apiParams);
  },
  
  getById: (id: number) => apiClient.get('/parents', { id }),
  
  update: (id: number, data: any) => {
    const payload: any = { ...data };
    
    // Apply same mappings as create
    if (payload.firstName || payload.lastName) {
      payload.first_name = payload.firstName;
      payload.last_name = payload.lastName;
      delete payload.firstName;
      delete payload.lastName;
    }
    
    if (payload.studentIds && Array.isArray(payload.studentIds)) {
      payload.student_ids = JSON.stringify(payload.studentIds);
      delete payload.studentIds;
    }
    
    return apiClient.put('/parents', { id, ...payload });
  },
  
  delete: (id: number) => apiClient.delete('/parents', { id }),
};

/**
 * Fees API for managing school fees and fee structures.
 * @namespace feesAPI
 */
// ==================== FEES API ====================

export const feesAPI = {
  async getAll(apiParams?: { page?: number; limit?: number; search?: string; status?: string }) {
    return apiClient.get<[]>('/classes', apiParams);
  },

  create(feeData: any) {
    return apiClient.post('/fees', feeData);
  },

  update(id: number, feeData: any) {
    return apiClient.put('/fees', feeData, { params: { id } });
  },

  delete(id: number) {
    return apiClient.delete('/fees', { id });
  },
};

/**
 * Class Subjects API for managing class subjects and their properties.
 * @namespace classSubjectsAPI
 */
// ==================== CLASS SUBJECTS API ====================

export const classSubjectsAPI = {
  getClassSubjects: (params: { 
    classId?: number; 
    teacherId?: number; 
    subjectId?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) => apiClient.get<ClassSubject[]>('/class-subjects', params),

  // Class Subject Registration API
  getRegistrations: (params: {
    classId?: number;
    term?: string;
    academicYear?: string;
    page?: number;
    limit?: number;
  } = {}) => apiClient.get<any[]>('/class-subject-registrations', params),

  createRegistration: (data: {
    classId: number;
    subjectId: number;
    term: string;
    academicYear: string;
    isCore: boolean;
    registeredBy: string;
  }) => apiClient.post<any>('/class-subject-registrations', data),

  deleteRegistration: (id: number) => apiClient.delete('/class-subject-registrations', { id }),
  
  getClassStudents: (classId: number, params: RequestParams = {}) => 
    apiClient.get('/classes/with-subjects', { id: classId, ...params }),
    
  
};

/**
 * Academic Sessions API for managing school sessions.
 * @namespace sessionsAPI
 */
// ==================== SESSIONS API ====================

/**
 * Academic Terms API for managing school terms within sessions.
 * @namespace termsAPI
 */
// ==================== TERMS API ====================

/**
 * Student Scores API for managing academic scores and results.
 * @namespace scoresAPI
 */
// ==================== SCORES API ====================

export const scoresAPI = {
  bulkCreate: (scores: Omit<Score, 'id' | 'total' | 'grade' | 'remark' | 'isPublished' | 'publishedAt' | 'publishedBy' | 'createdAt' | 'updatedAt'>[]) => 
    apiClient.post<Score[]>('/scores/bulk', { scores }),
    
  submit: (scoreIds: number[]) => 
    apiClient.post<{ success: boolean }>('/scores/submit', { scoreIds }),
    
  async getByClass(classId: number, params: { subjectId?: number; term?: string; session?: string } = {}) {
    return apiClient.get<any[]>('/scores/by-class', { class_id: classId, ...params });
  },
    
  async getByStudent(studentId: number, params: { term?: string; session?: string } = {}) {
    return apiClient.get<any[]>('/scores/by-student', { student_id: studentId, ...params });
  },
    
  exportScores: (params: { classId?: number; subjectId?: number; term?: string; session?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.classId) queryParams.append('classId', params.classId.toString());
    if (params.subjectId) queryParams.append('subjectId', params.subjectId.toString());
    if (params.term) queryParams.append('term', params.term);
    if (params.session) queryParams.append('session', params.session);
    
    return apiClient.get<Blob>(`/scores/export?${queryParams.toString()}`, undefined, {
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
  },
    
  importScores: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{ success: boolean; message: string }>('/scores/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

/**
 * Results API for compiling and managing student results.
 * @namespace resultsAPI
 */
// ==================== RESULTS API ====================

export const resultsAPI = {
  async getCompiled(params?: { class_id?: number; student_id?: number; term_id?: number; session_id?: number; status?: string }) {
    return apiClient.get<any[]>('/results/compiled', params);
  },
    
  compile: (data: { class_id: number; term_id: number; session_id: number; students_meta?: any[] }) => 
    apiClient.post<{ success: boolean; data?: any }>('/results/compile', data),
    
  approve: (data: { result_ids: number[] }) => 
    apiClient.post<{ success: boolean }>('/results/approve', data),

  reject: (data: { result_ids: number[]; rejection_reason: string }) => 
    apiClient.post<{ success: boolean }>('/results/reject', data),
    
  async getByStudent(studentId: number, params?: { term_id?: number; session_id?: number; status?: string }) {
    const response = await apiClient.get<any>('/results/compiled', { student_id: studentId, ...params });
    const envelope = response as any;
    const data = envelope && Array.isArray(envelope.data) ? envelope.data : null;
    if (data) {
      return data;
    }
    return Array.isArray(response) ? response : [];
  }
};

/**
 * Teacher Assignments API for managing teacher-subject-class assignments per term/session.
 * @namespace teacherAssignmentsAPI
 */
// ==================== TEACHER ASSIGNMENTS API ====================

export const teacherAssignmentsAPI = {
  create: (data: { teacher_id: number; assignments: { class_id: number; subject_id: number }[]; term_id?: number; session_id?: number }) => 
    apiClient.post<{ created_count: number; errors: string[] }>('/teacher-assignments', data),
    
  get: (params?: { teacher_id?: number; class_id?: number; subject_id?: number; term_id?: number; session_id?: number }) => 
    apiClient.get<any[]>('/teacher-assignments', params),
    
  delete: (data: { id: number }) => 
    apiClient.delete<{ success: boolean }>('/teacher-assignments', data)
};

/**
 * Notifications API for managing system and user notifications.
 * @namespace notificationsAPI
 */
// ==================== NOTIFICATIONS API ====================

export const notificationsAPI = {
  getAll: () => 
    apiClient.get<Notification[]>('/notifications'),
  
  getUnreadCount: () => 
    apiClient.get<{ unread_count: number }>('/notifications/unread-count'),
  
  markAsRead: (id: number) => 
    apiClient.put<Notification>('/notifications/read', {}, { params: { id } }),
  
  delete: (id: number) => 
    apiClient.delete<{ success: boolean }>('/notifications', { id })
};

/**
 * System Settings API for managing application-wide settings.
 * @namespace settingsAPI
 */
// ==================== SETTINGS API ====================

export const settingsAPI = {
  async getSchoolBranding() {
    const response = await apiClient.get('/settings', { category: 'branding' });
    const envelope = response as any;
    const data = envelope && envelope.data ? envelope.data : envelope;

    const brandingArray = Array.isArray(data?.branding) ? data.branding : [];

    const findValue = (key: string) => {
      const item = brandingArray.find((s: any) => s.setting_key === key);
      return item ? item.setting_value : undefined;
    };

    return {
      schoolName: findValue('school_name'),
      schoolMotto: findValue('school_motto'),
      principalName: findValue('principal_name'),
    };
  },

  async updateSchoolBranding(payload: { schoolName?: string; schoolMotto?: string; principalName?: string }) {
    const settings: { setting_key: string; setting_value: any }[] = [];

    if (payload.schoolName !== undefined) {
      settings.push({ setting_key: 'school_name', setting_value: payload.schoolName });
    }
    if (payload.schoolMotto !== undefined) {
      settings.push({ setting_key: 'school_motto', setting_value: payload.schoolMotto });
    }
    if (payload.principalName !== undefined) {
      settings.push({ setting_key: 'principal_name', setting_value: payload.principalName });
    }

    if (settings.length === 0) {
      return { success: true } as any;
    }

    return apiClient.put('/settings', { settings });
  },

  async getAll(params?: { category?: string }) {
    return apiClient.get('/settings', params || {});
  },

  async getByKey(key: string) {
    return apiClient.get('/settings/key', { key });
  },
};

// ==================== PROMOTIONS API ====================

/**
 * Promotions API for managing student promotions and academic progression.
 * @namespace promotionsAPI
 */
export const promotionsAPI = {
  async getAll(params?: { 
    status?: string; 
    from_session_id?: number; 
    to_session_id?: number; 
    from_class_id?: number; 
    to_class_id?: number; 
    search?: string; 
    limit?: number; 
    offset?: number 
  }) {
    return apiClient.get('/promotions', params);
  },

  create(data: { 
    student_id: number; 
    to_class_id: number; 
    to_session_id: number; 
    promotion_type?: string; 
    academic_performance?: string; 
    conduct?: string; 
    attendance_rate?: number; 
    promotion_date?: string 
  }) {
    return apiClient.post('/promotions', data);
  },

  createBulk(promotions: Array<{ 
    student_id: number; 
    to_class_id: number; 
    to_session_id: number; 
    promotion_type?: string; 
    academic_performance?: string; 
    conduct?: string; 
    attendance_rate?: number; 
    promotion_date?: string 
  }>) {
    return apiClient.post('/promotions/bulk', { promotions });
  },

  approve(promotionId: number) {
    return apiClient.put('/promotions/approve', { promotion_id: promotionId });
  },

  reject(promotionId: number, reason: string) {
    return apiClient.put('/promotions/reject', { promotion_id: promotionId, reason });
  },

  getStatistics(params?: { session_id?: number }) {
    return apiClient.get('/promotions/statistics', params);
  },

  getEligibleStudents(params: { from_session_id: number; to_session_id: number }) {
    return apiClient.get('/promotions/eligible', params);
  },
};

export default apiClient;
