// Common types
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

// User types (aligned with backend users table and AuthController responses)
// Backend fields: id, role, name, email, phone, status, created_at, updated_at, lastLogin
export interface User {
  id: number;
  role: 'admin' | 'teacher' | 'accountant' | 'parent';
  name: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'inactive' | 'suspended' | string;
  created_at?: string;
  updated_at?: string;
  lastLogin?: string;
}

// Class types
export interface Class {
  id: number;
  name: string;
  level: string;
  section: string;
  capacity: number;
  currentStudents: number;
  classTeacherId: number | null;
  status: 'active' | 'inactive';
  academicYear: string;
  createdAt: string;
  updatedAt: string;
}

// Subject types
export interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Student types
export interface Student {
  id: number;
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  address?: string;
  phone?: string;
  email?: string;
  classId: number;
  parentId?: number;
  status: 'active' | 'inactive' | 'graduated' | 'withdrawn';
  createdAt: string;
  updatedAt: string;
}

// Payment types
export interface Payment {
  id: number;
  studentId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'other';
  referenceNumber?: string;
  term: string;
  academicYear: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: number;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Class-Subject Assignment types
export interface ClassSubject {
  id: number;
  classId: number;
  subjectId: number;
  teacherId?: number;
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
  academicYear: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
  isPublished: boolean;
  publishedAt?: string;
  publishedBy?: number;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Common filter params
export interface CommonFilterParams extends PaginationParams {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// Error response
// Session types
export interface Session extends Timestamps {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description?: string;
}

// Term types
export interface Term extends Timestamps {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  sessionId: number;
  session?: Session;
}

// System Info types
export interface SystemInfo extends Timestamps {
  id: number;
  schoolName: string;
  schoolCode: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  principalName?: string;
  currentSessionId?: number;
  currentTermId?: number;
  currentSession?: Session;
  currentTerm?: Term;
}

export interface ErrorResponse {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}
