// User types (aligned with backend users table and AuthContext.AuthUser)
// Backend fields: id, role, name, email, phone, status, created_at, updated_at, lastLogin
export interface User {
  id: number;
  role: UserRole;
  name: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'inactive' | 'suspended' | string;
  lastLogin?: string;
  created_at?: string;
  updated_at?: string;
}

export type UserRole = 'admin' | 'teacher' | 'accountant' | 'parent';

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

// Navigation types
export type Page = "landing" | "login" | "dashboard" | "report-card";
export type Role = "" | UserRole;

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// School types
export interface School {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  motto: string;
  description?: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

// Class types
export interface Class {
  id: number;
  name: string;
  level: string;
  capacity: number;
  currentStudents: number;
  teacherId?: number;
  session?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Subject types
export interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string;
  isCore: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Class-Subject Assignment types
export interface ClassSubject {
  id: number;
  classId: number;
  subjectId: number;
  teacherId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Student types
export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  address: string;
  classId: number;
  parentId?: number;
  admissionNumber: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  createdAt: string;
  updatedAt: string;
}

// Teacher types
export interface Teacher {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specialization?: string;
  qualification?: string;
  experience?: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// Parent types
export interface Parent {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  occupation?: string;
  relationship: 'father' | 'mother' | 'guardian';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// Accountant types
export interface Accountant {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// Session types
export interface Session {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Term types
export interface Term {
  id: number;
  name: string;
  session: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Score types
export interface Score {
  id: number;
  studentId: number;
  subjectId: number;
  classId: number;
  term: string;
  session: string;
  assessmentType: 'ca1' | 'ca2' | 'exam' | 'project' | 'assignment';
  score: number;
  maxScore: number;
  grade?: string;
  remarks?: string;
  isSubmitted: boolean;
  submittedBy?: number;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Compiled Result types
export interface CompiledResult {
  id: number;
  studentId: number;
  classId: number;
  term: string;
  session: string;
  totalScore: number;
  maxTotalScore: number;
  average: number;
  grade: string;
  position: number;
  classPosition: number;
  totalStudents: number;
  remarks: string;
  isSubmitted: boolean;
  submittedBy?: number;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification types
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  recipientId?: number;
  recipientRole?: UserRole;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Fee types
export interface Fee {
  id: number;
  name: string;
  description?: string;
  amount: number;
  classId?: number;
  term?: string;
  session?: string;
  dueDate?: string;
  isRecurring: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Payment types
export interface Payment {
  id: number;
  studentId: number;
  feeId: number;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'online' | 'pos';
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paidBy?: string;
  receiptNumber?: string;
  createdAt: string;
  updatedAt: string;
}

// Activity Log types
export interface ActivityLog {
  id: number;
  userId: number;
  action: string;
  resource: string;
  resourceId?: number;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Dashboard types
export interface DashboardStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalClasses: number;
  totalSubjects: number;
  activeSession?: string;
  activeTerm?: string;
}

export interface AdminDashboardData {
  users: User[];
  classes: Class[];
  subjects: Subject[];
  students: Student[];
  sessions: Session[];
  terms: Term[];
  stats: DashboardStats;
}

export interface TeacherDashboardData {
  classSubjects: ClassSubject[];
  students: Student[];
}

export interface AccountantDashboardData {
  students: Student[];
  classes: Class[];
  sessions: Session[];
}

export interface ParentDashboardData {
  students: Student[];
  results: CompiledResult[];
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// Context types
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

export interface NavigationContextType {
  currentPage: Page;
  userRole: Role;
  isTransitioning: boolean;
  navigateTo: (page: Page, role?: Role) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// Hook types
export interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<T>;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Export all types for easy importing
export * from './api';
export * from './components';
export * from './hooks';
