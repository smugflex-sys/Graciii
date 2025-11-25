// API endpoint types
export interface ApiEndpoints {
  // Auth endpoints
  login: '/api/auth/login';
  logout: '/api/auth/logout';
  refresh: '/api/auth/refresh';
  changePassword: '/api/auth/change-password';
  profile: '/api/auth/profile';
  
  // User endpoints
  users: '/api/users';
  userById: '/api/users/:id';
  
  // Class endpoints
  classes: '/api/classes';
  classById: '/api/classes/:id';
  classStudents: '/api/classes/:id/students';
  
  // Subject endpoints
  subjects: '/api/subjects';
  subjectById: '/api/subjects/:id';
  
  // Class-subject endpoints
  classSubjects: '/api/class-subjects';
  classSubjectById: '/api/class-subjects/:id';
  
  // Student endpoints
  students: '/api/students';
  studentById: '/api/students/:id';
  studentLinkParent: '/api/students/:id/link-parent';
  
  // Session endpoints
  sessions: '/api/sessions';
  activateSession: '/api/sessions/:id/activate';
  
  // Term endpoints
  terms: '/api/terms';
  activateTerm: '/api/terms/:id/activate';
  
  // Score endpoints
  scores: '/api/scores';
  bulkCreateScores: '/api/scores/bulk';
  submitScores: '/api/scores/submit';
  exportScores: '/api/scores/export';
  importScores: '/api/scores/import';
  
  // Compiled results endpoints
  compiledResults: '/api/compiled-results';
  classCompiledResults: '/api/compiled-results/class/:classId';
  studentResults: '/api/compiled-results/student/:studentId';
  
  // Notification endpoints
  notifications: '/api/notifications';
  markNotificationRead: '/api/notifications/:id/read';
  
  // Fee endpoints
  fees: '/api/fees';
  payments: '/api/payments';
  
  // System endpoints
  systemInfo: '/api/system/info';
  systemStats: '/api/system/stats';
}

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Request/Response types
export interface ApiRequest<T = any> {
  method: HttpMethod;
  url: string;
  data?: T;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

// Axios configuration types
export interface AxiosConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

// Interceptor types
export interface RequestInterceptor {
  (config: any): any;
}

export interface ResponseInterceptor {
  (response: any): any;
}

// Error handling types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
  response?: {
    data: {
      message?: string;
      error?: string;
      errors?: Record<string, string[]>;
    };
  };
}

// API client interface
export interface ApiClient {
  get<T>(url: string, params?: Record<string, any>): Promise<T>;
  post<T>(url: string, data?: any): Promise<T>;
  put<T>(url: string, data?: any): Promise<T>;
  patch<T>(url: string, data?: any): Promise<T>;
  delete<T>(url: string): Promise<T>;
  setAuthToken(token: string): void;
  removeAuthToken(): void;
}
