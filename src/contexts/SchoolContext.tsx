import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth, type AuthUser } from './AuthContext';
import apiClient, { classesAPI, subjectsAPI, studentsAPI, usersAPI, paymentsAPI, sessionsAPI, termsAPI, resultsAPI, teacherAssignmentsAPI, scoresAPI, classSubjectsAPI, promotionsAPI } from '../services/apiService';
import DataService from '../services/dataService';

// Mock teachersAPI since it doesn't exist in apiService
const teachersAPI = {
  getAll: () => apiClient.get('/teachers'),
  getById: (id: number) => apiClient.get(`/teachers/${id}`),
  create: (data: any) => apiClient.post('/teachers', data),
  update: (id: number, data: any) => apiClient.put(`/teachers/${id}`, data),
  delete: (id: number) => apiClient.delete(`/teachers/${id}`)
};

// ==================== INTERFACES ====================

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

export interface SchoolSettings {
  schoolName: string;
  schoolMotto: string;
  principalName: string;
  principalSignature?: string;
  schoolAddress?: string;
  schoolEmail?: string;
  schoolPhone?: string;
}

export interface Student {
  id: number;
  studentId?: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classId: number;
  className: string;
  level?: string;
  parentId: number | null;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  photoUrl?: string;
  phone?: string;
  status: 'Active' | 'Inactive' | 'Graduated';
  academicYear?: string;
}

export interface Teacher {
  id: number;
  teacherId: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  email: string;
  phone: string;
  qualification: string;
  specialization: string[];
  status: 'Active' | 'Inactive';
  isClassTeacher: boolean;
  classTeacherId: number | null; // which class they're class teacher for
}

export interface Parent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  studentIds: number[];
  status: 'Active' | 'Inactive';
}

export interface Class {
  id: number;
  name: string;
  level: string;
  classTeacherId: number | null;
  capacity: number;
  status: 'active' | 'inactive';
  // Optional frontend-only fields
  section?: string;
  currentStudents?: number;
  classTeacher?: string;
  academicYear?: string;
  // Optional student data when fetched with includeStudents
  students?: Student[];
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  department: string;
  creditUnits: number;
  description?: string;
  isCore: boolean;
  status: 'active' | 'inactive';
}

export interface ClassSubjectRegistration {
  id: number;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  term: string;
  academicYear: string;
  isCore: boolean;
  status: 'Active' | 'Inactive';
  registeredBy: string;
  registeredDate: string;
}

export interface SubjectAssignment {
  id: number;
  subjectId: number;
  subjectName: string;
  classId: number;
  className: string;
  teacherId: number;
  teacherName: string;
  academicYear: string;
  term: string;
}

export interface Score {
  id: number;
  studentId: number;
  subjectAssignmentId: number;
  subjectName: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  classAverage: number;
  classMin: number;
  classMax: number;
  grade: string;
  remark: string;
  subjectTeacher: string;
  enteredBy: number;
  enteredDate: string;
  status: 'Draft' | 'Submitted';
  academicYear: string;
  term: string;
}

export interface AffectiveDomain {
  id: number;
  studentId: number;
  classId: number;
  term: string;
  academicYear: string;
  attentiveness: number;
  attentivenessRemark: string;
  honesty: number;
  honestyRemark: string;
  neatness: number;
  neatnessRemark: string;
  obedience: number;
  obedienceRemark: string;
  senseOfResponsibility: number;
  senseOfResponsibilityRemark: string;
  enteredBy: number;
  enteredDate: string;
}

export interface PsychomotorDomain {
  id: number;
  studentId: number;
  classId: number;
  term: string;
  academicYear: string;
  attentionToDirection: number;
  attentionToDirectionRemark: string;
  considerateOfOthers: number;
  considerateOfOthersRemark: string;
  handwriting: number;
  handwritingRemark: string;
  sports: number;
  sportsRemark: string;
  verbalFluency: number;
  verbalFluencyRemark: string;
  worksWellIndependently: number;
  worksWellIndependentlyRemark: string;
  enteredBy: number;
  enteredDate: string;
}

export interface CompiledResult {
  id: number;
  studentId: number;
  classId: number;
  term: string;
  academicYear: string;
  scores: Score[];
  affective: AffectiveDomain | null;
  psychomotor: PsychomotorDomain | null;
  totalScore: number;
  averageScore: number;
  classAverage: number;
  position: number;
  totalStudents: number;
  timesPresent: number;
  timesAbsent: number;
  totalAttendanceDays: number;
  termBegin: string;
  termEnd: string;
  nextTermBegin: string;
  classTeacherName: string;
  classTeacherComment: string;
  principalName: string;
  principalComment: string;
  principalSignature: string;
  compiledBy: number;
  compiledDate: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  approvedBy: number | null;
  approvedDate: string | null;
  rejectionReason: string | null;
}

export interface FeeStructure {
  id: number;
  classId: number;
  className: string;
  level: string;
  term: string;
  academicYear: string;
  tuitionFee: number;
  developmentLevy: number;
  sportsFee: number;
  examFee: number;
  booksFee: number;
  uniformFee: number;
  transportFee: number;
  totalFee: number;
}

export interface StudentFeeBalance {
  id: number;
  studentId: number;
  classId: number;
  term: string;
  academicYear: string;
  totalFeeRequired: number;
  totalPaid: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
}

export interface Payment {
  id: number;
  studentId: number;
  studentName: string;
  amount: number;
  paymentType: string;
  term: string;
  academicYear: string;
  paymentMethod: string;
  reference: string;
  recordedBy: number;
  status?: string;
}

// Authenticated user in SchoolContext, derived from AuthContext.AuthUser
// with optional frontend-only metadata.
export interface User extends AuthUser {
  username?: string;
  password?: string;
  linkedId?: number;
  assignments?: {
    classes?: number[];
    subjects?: number[];
    students?: number[];
  };
  permissions?: string[];
  responsibilities?: string[];
}

export interface Accountant {
  id: number;
  accountantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeId: string;
  status: 'Active' | 'Inactive';
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  targetAudience: 'all' | 'teachers' | 'parents' | 'students' | 'admins' | 'accountants';
  senderId: number;
  senderName: string;
  senderRole: string;
  sentDate: string;
  isRead: boolean;
  readBy: number[];
  priority: 'low' | 'medium' | 'high';
}

export interface ActivityLog {
  id: number;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  ip: string;
  status: 'Success' | 'Failed';
  details: string;
  timestamp: string;
}

export interface BankAccountSettings {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: string;
  bankCode: string;
  routingNumber?: string;
  swiftCode?: string;
  updatedDate: string;
}

// ... (rest of the code remains the same)

// ==================== CONTEXT ====================

interface SchoolContextType {
  // Data
  students: Student[];
  teachers: Teacher[];
  parents: Parent[];
  accountants: Accountant[];
  classes: Class[];
  subjects: Subject[];
  subjectAssignments: SubjectAssignment[];
  scores: Score[];
  affectiveDomains: AffectiveDomain[];
  psychomotorDomains: PsychomotorDomain[];
  compiledResults: CompiledResult[];
  payments: Payment[];
  users: User[];
  currentUser: User | null;
  feeStructures: FeeStructure[];
  studentFeeBalances: StudentFeeBalance[];
  notifications: Notification[];
  activityLogs: ActivityLog[];

  // Settings
  currentTerm: string | null;
  currentAcademicYear: string | null;
  currentTermId: number | null;
  currentSessionId: number | null;
  loadingSessionTerm: boolean;
  sessionTermError: string | null;
  schoolSettings: SchoolSettings;
  bankAccountSettings: BankAccountSettings | null;

  // Student Methods
  addStudent: (student: Omit<Student, 'id'>) => Promise<number>;
  updateStudent: (id: number, student: Partial<Student>) => void;
  deleteStudent: (id: number) => void;
  getStudentsByClass: (classId: number) => Student[];
  fetchStudents: () => Promise<void>;

  // Teacher Methods
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<number>;
  updateTeacher: (id: number, teacher: Partial<Teacher>) => void;
  deleteTeacher: (id: number) => void;
  getTeacherAssignments: (teacherId: number) => SubjectAssignment[];
  fetchTeachers: () => Promise<void>;

  // Parent Methods
  addParent: (parent: Omit<Parent, 'id'>) => number;
  updateParent: (id: number, parent: Partial<Parent>) => void;
  deleteParent: (id: number) => void;
  getParentStudents: (parentId: number) => Student[];
  linkParentToStudent: (parentId: number, studentId: number) => void;

  // Accountant Methods
  addAccountant: (accountant: Omit<Accountant, 'id'>) => number;
  updateAccountant: (id: number, accountant: Partial<Accountant>) => void;
  deleteAccountant: (id: number) => void;

  // Class Methods
  addClass: (class_: Omit<Class, 'id'>) => Promise<void>;
  updateClass: (id: number, class_: Partial<Class>) => void;
  deleteClass: (id: number) => void;
  fetchClasses: () => Promise<void>;
  fetchClassesWithStudents: () => Promise<Class[]>;

  // Subject Methods
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<void>;
  updateSubject: (id: number, subject: Partial<Subject>) => void;
  deleteSubject: (id: number) => void;
  fetchSubjects: () => Promise<void>;

  // Subject Assignment Methods
  addSubjectAssignment: (assignment: Omit<SubjectAssignment, 'id'>) => Promise<void>;
  updateSubjectAssignment: (id: number, assignment: Partial<SubjectAssignment>) => void;
  deleteSubjectAssignment: (id: number) => void;
  getAssignmentsByClass: (classId: number) => SubjectAssignment[];
  getAssignmentsByTeacher: (teacherId: number) => SubjectAssignment[];
  fetchTeacherAssignments: () => Promise<void>;
  createTeacherAssignments: (teacherId: number, assignments: { subjectId: number; classId: number; }[]) => Promise<{ created_count: number; errors: string[]; }>;
  deleteTeacherAssignment: (id: number) => void;

  // Score Methods
  addScore: (score: Omit<Score, 'id'>) => void;
  updateScore: (id: number, score: Partial<Score>) => void;
  deleteScore: (id: number) => void;
  submitScores: (scoreIds: number[]) => Promise<void>;
  getScoresByAssignment: (assignmentId: number) => Score[];
  getScoresByStudent: (studentId: number) => Score[];

  // Affective & Psychomotor Methods
  addAffectiveDomain: (domain: Omit<AffectiveDomain, 'id'>) => void;
  updateAffectiveDomain: (id: number, domain: Partial<AffectiveDomain>) => void;
  addPsychomotorDomain: (domain: Omit<PsychomotorDomain, 'id'>) => void;
  updatePsychomotorDomain: (id: number, domain: Partial<PsychomotorDomain>) => void;

  // Compiled Results Methods
  compileResult: (result: Omit<CompiledResult, 'id'>) => void;
  updateCompiledResult: (id: number, result: Partial<CompiledResult>) => void;
  fetchCompiledResults: () => Promise<void>;
  getPendingApprovals: () => CompiledResult[];
  rejectResult: (id: number, reason: string) => void;
  submitResult: (id: number) => void;
  approveResult: (id: number, approvedBy: number) => void;
  getResultsByClass: (classId: number) => CompiledResult[];

  // Fee Methods
  addFeeStructure: (structure: Omit<FeeStructure, 'id'>) => void;
  updateFeeStructure: (id: number, structure: Partial<FeeStructure>) => void;
  getFeeStructureByClass: (classId: number, term: string, academicYear: string) => FeeStructure | undefined;
  updateStudentFeeBalance: (id: number, balance: Partial<StudentFeeBalance>) => void;
  getStudentFeeBalance: (studentId: number, term: string, academicYear: string) => StudentFeeBalance | undefined;

  // Payment Methods
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updatePayment: (id: number, payment: Partial<Payment>) => void;
  verifyPayment: (id: number) => Promise<void>;
  getPaymentsByStudent: (studentId: number) => Payment[];
  fetchPaymentsByStudent: (studentId: number) => Promise<void>;
  fetchPendingPayments: () => Promise<void>;

  // User Methods
  addUser: (user: any) => Promise<number>;
  updateUser: (id: number, user: Partial<User>) => void;
  deleteUser: (id: number) => void;
  fetchUsers: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;

  // Notification Methods
  addNotification: (notification: Omit<Notification, 'id' | 'sentDate' | 'isRead' | 'readBy'>) => void;
  markNotificationAsRead: (id: number, userId: number) => void;
  getUnreadNotifications: (userId: number, userRole: string) => Notification[];
  getAllNotifications: (userId: number, userRole: string) => Notification[];

  // Activity Log Methods
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  getActivityLogs: (filterAction?: string, filterDate?: string) => ActivityLog[];

  // Promotion Methods
  promoteStudent: (studentId: number, newClassId: number, newAcademicYear: string) => Promise<void>;
  promoteMultipleStudents: (studentIds: number[], classMapping: { [studentId: number]: number }, newAcademicYear: string) => Promise<void>;

  // Class Helper Methods
  getClassTeacher: (classId: number) => Teacher | null;
  getClassSubjects: (classId: number) => SubjectAssignment[];
  updateClassStudentCount: (classId: number) => void;

  // Class Subject Registration Methods
  addClassSubjectRegistration: (registration: Omit<ClassSubjectRegistration, 'id' | 'registeredDate'>) => Promise<number>;
  deleteClassSubjectRegistration: (id: number) => Promise<void>;
  fetchClassSubjectRegistrations: (filters?: { term?: string; academicYear?: string; classId?: number }) => Promise<ClassSubjectRegistration[]>;
  getClassRegisteredSubjects: (classId: number, term?: string, academicYear?: string) => ClassSubjectRegistration[];

  // System Settings Methods
  updateCurrentTerm: (term: string) => void;
  updateCurrentAcademicYear: (year: string) => void;
  updateSchoolSettings: (settings: Partial<SchoolSettings>) => void;
  getTeacherClassTeacherAssignments: (teacherId: number) => number[]; // Returns class IDs where teacher is class teacher
  validateClassTeacherAssignment: (teacherId: number, newClassId: number) => { valid: boolean; message: string };

  // Bank Account Settings Methods
  updateBankAccountSettings: (settings: Omit<BankAccountSettings, 'id' | 'updatedDate'>) => void;
  getBankAccountSettings: () => BankAccountSettings | null;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function useSchool() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within SchoolProvider');
  }
  return context;
}

// ==================== PROVIDER ====================

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentTerm, setCurrentTerm] = useState<string | null>(null);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string | null>(null);
  // currentUser is now derived from AuthContext.user (AuthUser) and kept in sync
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTermId, setCurrentTermId] = useState<number | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [loadingSessionTerm, setLoadingSessionTerm] = useState(true);
  const [sessionTermError, setSessionTermError] = useState<string | null>(null);
  
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({
    schoolName: 'Graceland Royal Academy',
    schoolMotto: 'Wisdom & Illumination',
    principalName: 'Mrs. Grace Okoro',
    principalSignature: '',
    schoolAddress: 'Behind Hakim Palace Opposite NNPC Depot Tumfure, Gombe',
    schoolEmail: 'gracelandroyalacademy05@gmail.com',
    schoolPhone: '+234-800-000-0000'
  });

  const [bankAccountSettings, setBankAccountSettings] = useState<BankAccountSettings | null>(null);

  // Initialize empty data arrays - All data created through the system
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
  const [classSubjectRegistrations, setClassSubjectRegistrations] = useState<ClassSubjectRegistration[]>([]);

  const [scores, setScores] = useState<Score[]>([]);
  const [affectiveDomains, setAffectiveDomains] = useState<AffectiveDomain[]>([]);
  const [psychomotorDomains, setPsychomotorDomains] = useState<PsychomotorDomain[]>([]);
  const [compiledResults, setCompiledResults] = useState<CompiledResult[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentFeeBalances, setStudentFeeBalances] = useState<StudentFeeBalance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accountants, setAccountants] = useState<Accountant[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Users loaded from backend /users API
  const [users, setUsers] = useState<User[]>([]);

  // Keep currentUser in sync with AuthContext.user
  useEffect(() => {
    if (user) {
      setCurrentUser({ ...(user as AuthUser) });
    } else {
      setCurrentUser(null);
    }
  }, [user]);

  // Fetch data from API when authenticated
  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchClasses(),
          fetchSubjects(),
          fetchStudents(),
          fetchUsers(),
          fetchTeacherAssignments(), // NEW: sync teacher assignments
          fetchClassSubjectRegistrations(), // NEW: fetch subject registrations
        ]);
      } catch (error) {
        // silent
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  // Fetch active session and term from backend when authenticated
  useEffect(() => {
    const fetchSessionAndTerm = async () => {
      try {
        setLoadingSessionTerm(true);
        setSessionTermError(null);
        
        const [sessionResp, termResp] = await Promise.all([
          sessionsAPI.getActive(),
          termsAPI.getActive(),
        ]);

        const sessionEnvelope = sessionResp as any;
        const termEnvelope = termResp as any;

        const activeSession = sessionEnvelope?.data || sessionEnvelope || null;
        const activeTerm = termEnvelope?.data || termEnvelope || null;

        if (activeSession) {
          if (activeSession.id) {
            setCurrentSessionId(Number(activeSession.id));
          }
          if (activeSession.name) {
            setCurrentAcademicYear(activeSession.name);
          }
        } else {
          setSessionTermError('No active session found. Please contact administrator.');
        }

        if (activeTerm) {
          if (activeTerm.id) {
            setCurrentTermId(Number(activeTerm.id));
          }
          if (activeTerm.name) {
            setCurrentTerm(activeTerm.name);
          }
        } else {
          setSessionTermError(prev => 
            prev ? `${prev} No active term found.` : 'No active term found. Please contact administrator.'
          );
        }
      } catch (error) {
        console.error('Error fetching active session/term:', error);
        setSessionTermError('Failed to load academic session or term. Please try again.');
        
        // Set fallback values for basic functionality
        setCurrentTerm('First Term');
        setCurrentAcademicYear('2024/2025');
      } finally {
        setLoadingSessionTerm(false);
      }
    };

    if (user) {
      fetchSessionAndTerm();
    } else {
      // Reset state when user logs out
      setCurrentTerm(null);
      setCurrentAcademicYear(null);
      setCurrentTermId(null);
      setCurrentSessionId(null);
      setSessionTermError(null);
      setLoadingSessionTerm(false);
    }
  }, [user]);

  // Helper function to calculate grade (70-based A–F scale)
  const calculateGrade = (total: number): string => {
    if (total >= 70) return 'A';
    if (total >= 60) return 'B';
    if (total >= 50) return 'C';
    if (total >= 45) return 'D';
    if (total >= 40) return 'E';
    return 'F';
  };

  // Helper function to get remark (aligned with backend Score::calculateRemarks)
  const getRemark = (grade: string): string => {
    const remarks: { [key: string]: string } = {
      A: 'Excellent',
      B: 'Very Good',
      C: 'Good',
      D: 'Fair',
      E: 'Poor',
      F: 'Very Poor',
    };
    return remarks[grade] || 'N/A';
  };

  // ==================== IMPLEMENTATION ====================

  // Fetch Students from API (backend -> frontend Student mapping)
  const fetchStudents = async () => {
    try {
      const response = await studentsAPI.getAll();
      const rawList = Array.isArray(response)
        ? response
        : ((response as any)?.data && Array.isArray((response as any).data)
            ? (response as any).data
            : []);

      const mapped: Student[] = rawList.map((s: any) => {
        const fullName: string = (s.full_name || '').toString().trim();
        const [first, ...rest] = fullName.split(' ').filter(Boolean);
        const last = rest.join(' ');

        const classId = s.class_id !== undefined ? Number(s.class_id) : 0;
        const className = s.class_name || '';

        const statusRaw = (s.status || '').toString().toLowerCase();
        const status: 'Active' | 'Inactive' | 'Graduated' =
          statusRaw === 'inactive' ? 'Inactive' : 
          statusRaw === 'graduated' ? 'Graduated' : 'Active';

        const genderRaw = (s.gender || '').toString();
        const gender: 'Male' | 'Female' =
          genderRaw === 'Female' ? 'Female' : 'Male';

        return {
          id: Number(s.id),
          studentId: s.student_id || undefined,
          firstName: first || '',
          lastName: last || '',
          admissionNumber: s.reg_no || '',
          classId,
          className,
          level: s.level || undefined,
          parentId:
            s.parent_id !== undefined && s.parent_id !== null
              ? Number(s.parent_id)
              : null,
          dateOfBirth: s.dob || '',
          gender,
          photoUrl: s.photo_path || undefined,
          phone: s.phone || undefined,
          status,
          academicYear: s.academic_year || currentAcademicYear,
        };
      });

      setStudents(mapped);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  // Student Methods
  const addStudent = async (student: Omit<Student, 'id'>) => {
    try {
      // Generate automatic IDs and admission number
      const studentId = generateStudentId();
      const admissionNumber = generateAdmissionNumber();
      
      // Add generated IDs to student data
      const studentWithIds = {
        ...student,
        studentId,
        admissionNumber
      };
      
      const response = await studentsAPI.create(studentWithIds);
      const envelope = response as any;
      const created = envelope?.data || envelope;

      await fetchStudents(); // Refresh the list from backend

      return created && created.id ? Number(created.id) : 0;
    } catch (error) {
      console.error('Error adding student:', error);
      throw error;
    }
  };

  const updateStudent = async (id: number, student: Partial<Student>) => {
    try {
      await studentsAPI.update(id, student);
      await fetchStudents();
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  };

  const deleteStudent = async (id: number) => {
    try {
      await studentsAPI.delete(id);

      // Clean up local state for the deleted student and related records
      setStudents(prev => prev.filter(s => s.id !== id));
      setScores(prev => prev.filter(s => s.studentId !== id));
      setAffectiveDomains(prev => prev.filter(a => a.studentId !== id));
      setPsychomotorDomains(prev => prev.filter(p => p.studentId !== id));
      setCompiledResults(prev => prev.filter(r => r.studentId !== id));
      setPayments(prev => prev.filter(p => p.studentId !== id));
      setStudentFeeBalances(prev => prev.filter(b => b.studentId !== id));

      // Remove from parent's student list
      setParents(prevParents =>
        prevParents.map(p => ({
          ...p,
          studentIds: p.studentIds.filter(sid => sid !== id),
        }))
      );
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  };

  const getStudentsByClass = (classId: number) => {
    return students.filter(s => s.classId === classId);
  };

  // Teacher Methods
  // Automatic ID generation utilities
const generateTeacherId = () => {
  const currentYear = new Date().getFullYear();
  const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TCH${currentYear}${randomDigits}`;
};

const generateStudentId = () => {
  const currentYear = new Date().getFullYear();
  const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `STU${currentYear}${randomDigits}`;
};

const generateAdmissionNumber = () => {
  const currentYear = new Date().getFullYear();
  const sequentialNumber = Math.floor(Math.random() * 9000) + 1000;
  return `${currentYear}/${sequentialNumber}`;
};

  const addTeacher = async (teacher: Omit<Teacher, 'id'>) => {
    try {
      const newId = teachers.length > 0 ? Math.max(...teachers.map(t => t.id)) + 1 : 1;
      const teacherId = generateTeacherId();
      const newTeacher = { ...teacher, id: newId, teacherId };
      
      // Try to save to backend API
      try {
        const response = await teachersAPI.create({
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          employeeId: teacherId,
          email: teacher.email,
          phone: teacher.phone,
          qualification: teacher.qualification,
          specialization: teacher.specialization,
          status: teacher.status,
          isClassTeacher: teacher.isClassTeacher,
          classTeacherId: teacher.classTeacherId
        });
        
        // If API call succeeds, use the returned ID
        if (response && (response as any).id) {
          newTeacher.id = (response as any).id;
        }
      } catch (apiError) {
        console.warn('Could not save teacher to backend, using local state only:', apiError);
        // Continue with local state if API fails
      }

      // Update local state
      setTeachers([...teachers, newTeacher]);
      
      // Add activity log
      addActivityLog({
        actor: currentUser?.username || 'System',
        actorRole: 'Admin',
        action: 'CREATE',
        target: `Teacher: ${teacher.firstName} ${teacher.lastName}`,
        ip: '127.0.0.1',
        status: 'Success',
        details: `Added teacher with ID: ${teacherId}`
      });
      
      return newId;
    } catch (error) {
      console.error('Error adding teacher:', error);
      throw error;
    }
  };

  const updateTeacher = (id: number, teacher: Partial<Teacher>) => {
    setTeachers(teachers.map(t => (t.id === id ? { ...t, ...teacher } : t)));
  };

  const deleteTeacher = (id: number) => {
    // Delete teacher and all associated data
    setTeachers(teachers.filter(t => t.id !== id));
    setSubjectAssignments(subjectAssignments.filter(a => a.teacherId !== id));
    
    // Remove as class teacher from classes
    setClasses(classes.map(c => 
      c.classTeacherId === id ? { ...c, classTeacherId: null, classTeacher: '' } : c
    ));
    
    // Delete associated user account
    const teacherUser = users.find(u => u.role === 'teacher' && u.linkedId === id);
    if (teacherUser) {
      setUsers(users.filter(u => u.id !== teacherUser.id));
    }
  };

  const getTeacherAssignments = (teacherId: number) => {
    return subjectAssignments.filter(a => a.teacherId === teacherId);
  };

  const fetchTeachers = async () => {
    try {
      const response = await teachersAPI.getAll();
      // The API client returns the data directly
      setTeachers(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
    }
  };

  // Parent Methods
  const addParent = (parent: Omit<Parent, 'id'>) => {
    const newId = parents.length > 0 ? Math.max(...parents.map(p => p.id)) + 1 : 1;
    const newParent = { ...parent, id: newId };
    setParents([...parents, newParent]);
    return newId;
  };

  // Accountant Methods
  const addAccountant = (accountant: Omit<Accountant, 'id'>) => {
    const newId = accountants.length > 0 ? Math.max(...accountants.map(a => a.id)) + 1 : 1;
    const newAccountant = { ...accountant, id: newId };
    setAccountants([...accountants, newAccountant]);
    return newId;
  };

  const updateAccountant = (id: number, accountant: Partial<Accountant>) => {
    setAccountants(accountants.map(a => (a.id === id ? { ...a, ...accountant } : a)));
  };

  const deleteAccountant = (id: number) => {
    setAccountants(accountants.filter(a => a.id !== id));
    // Also delete associated user account
    const accountantUser = users.find(u => u.role === 'accountant' && u.linkedId === id);
    if (accountantUser) {
      setUsers(users.filter(u => u.id !== accountantUser.id));
    }
  };

  const updateParent = (id: number, parent: Partial<Parent>) => {
    setParents(parents.map(p => (p.id === id ? { ...p, ...parent } : p)));
  };

  const deleteParent = (id: number) => {
    // Delete parent and associated data
    setParents(parents.filter(p => p.id !== id));
    
    // Remove parent reference from students
    setStudents(students.map(s => 
      s.parentId === id ? { ...s, parentId: null } : s
    ));
    
    // Delete associated user account
    const parentUser = users.find(u => u.role === 'parent' && u.linkedId === id);
    if (parentUser) {
      setUsers(users.filter(u => u.id !== parentUser.id));
    }
  };

  const getParentStudents = (parentId: number) => {
    const parent = parents.find(p => p.id === parentId);
    if (!parent) return [];
    return students.filter(s => parent.studentIds.includes(s.id));
  };

  // Fetch Classes from API (backend -> frontend Class mapping)
  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll();
      const rawList = Array.isArray(response)
        ? response
        : ((response as any)?.data && Array.isArray((response as any).data)
            ? (response as any).data
            : []);

      const mapped: Class[] = rawList.map((c: any) => {
        const statusRaw = (c.status || '').toString().toLowerCase();
        const status: 'active' | 'inactive' =
          statusRaw === 'inactive' ? 'inactive' : 'active';

        return {
          id: Number(c.id),
          name: c.name || '',
          level: c.level || '',
          classTeacherId:
            c.class_teacher_id !== undefined && c.class_teacher_id !== null
              ? Number(c.class_teacher_id)
              : null,
          capacity: c.capacity !== undefined ? Number(c.capacity) : 0,
          status,
          // Frontend-only / derived fields
          section: '',
          currentStudents:
            c.student_count !== undefined ? Number(c.student_count) : 
            (c.students && Array.isArray(c.students) ? c.students.length : 0),
          classTeacher: c.class_teacher_name || '',
          academicYear: currentAcademicYear,
          // Include students if provided by backend
          ...(c.students && Array.isArray(c.students) && { 
            students: c.students.map((s: any) => ({
              id: Number(s.id),
              studentId: s.student_id,
              firstName: s.full_name ? s.full_name.split(' ')[0] : '',
              lastName: s.full_name ? s.full_name.split(' ').slice(1).join(' ') : '',
              admissionNumber: s.reg_no,
              classId: Number(c.id),
              className: c.name,
              gender: s.gender,
              phone: s.phone,
              status: s.status,
              level: s.level,
              academicYear: s.academic_year
            }))
          })
        };
      });

      setClasses(mapped);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses([]);
    }
  };

  // Class Methods
  const addClass = async (cls: Omit<Class, 'id'>) => {
    try {
      await classesAPI.create(cls);
      await fetchClasses(); // Refresh the list
    } catch (error) {
      console.error('Error adding class:', error);
      throw error;
    }
  };

  const updateClass = async (id: number, cls: Partial<Class>) => {
    try {
      await classesAPI.update(id, cls);
      await fetchClasses(); // Refresh the list
    } catch (error) {
      console.error('Error updating class:', error);
      throw error;
    }
  };

  const deleteClass = async (id: number) => {
    try {
      await classesAPI.delete(id);

      // Delete class and all associated data locally
      setClasses(prev => prev.filter(c => c.id !== id));
      setSubjectAssignments(prev => prev.filter(a => a.classId !== id));
      setFeeStructures(prev => prev.filter(f => f.classId !== id));
    } catch (error) {
      console.error('Error deleting class:', error);
      throw error;
    }
  };

  // Fetch classes with student data
  const fetchClassesWithStudents = async () => {
    try {
      const response = await classesAPI.getAll({ includeStudents: true });
      const rawList = Array.isArray(response)
        ? response
        : ((response as any)?.data && Array.isArray((response as any).data)
            ? (response as any).data
            : []);

      const mapped: Class[] = rawList.map((c: any) => {
        const statusRaw = (c.status || '').toString().toLowerCase();
        const status: 'active' | 'inactive' =
          statusRaw === 'inactive' ? 'inactive' : 'active';

        return {
          id: Number(c.id),
          name: c.name || '',
          level: c.level || '',
          classTeacherId:
            c.class_teacher_id !== undefined && c.class_teacher_id !== null
              ? Number(c.class_teacher_id)
              : null,
          capacity: c.capacity !== undefined ? Number(c.capacity) : 0,
          status,
          // Frontend-only / derived fields
          section: '',
          currentStudents:
            c.student_count !== undefined ? Number(c.student_count) : 
            (c.students && Array.isArray(c.students) ? c.students.length : 0),
          classTeacher: c.class_teacher_name || '',
          academicYear: currentAcademicYear,
          // Include students data
          students: c.students && Array.isArray(c.students) ? c.students.map((s: any) => ({
            id: Number(s.id),
            studentId: s.student_id,
            firstName: s.full_name ? s.full_name.split(' ')[0] : '',
            lastName: s.full_name ? s.full_name.split(' ').slice(1).join(' ') : '',
            admissionNumber: s.reg_no,
            classId: Number(c.id),
            className: c.name,
            gender: s.gender,
            phone: s.phone,
            status: s.status,
            level: s.level,
            academicYear: s.academic_year
          })) : []
        };
      });

      return mapped;
    } catch (error) {
      console.error('Error fetching classes with students:', error);
      return [];
    }
  };

  // Fetch Subjects from API
  const fetchSubjects = async () => {
    try {
      const response = await subjectsAPI.getAll();

      const rawList = Array.isArray(response)
        ? response
        : ((response as any)?.data && Array.isArray((response as any).data)
            ? (response as any).data
            : []);

      const mapped: Subject[] = rawList.map((s: any) => {
        const statusRaw = (s.status || '').toString().toLowerCase();
        const status: 'Active' | 'Inactive' = statusRaw === 'active' ? 'Active' : 'Inactive';

        return {
          id: Number(s.id),
          name: s.name || '',
          code: s.code || '',
          department: s.department || 'General',
          isCore: Boolean(s.is_core),
          status,
        };
      });

      setSubjects(mapped);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects([]);
    }
  };

  // Subject Methods
  const addSubject = async (subject: Omit<Subject, 'id'>) => {
    try {
      await subjectsAPI.create(subject);
      await fetchSubjects(); // Refresh the list
    } catch (error) {
      console.error('Error adding subject:', error);
      throw error;
    }
  };

  const updateSubject = async (id: number, subject: Partial<Subject>) => {
    try {
      await subjectsAPI.update(id, subject);
      await fetchSubjects(); // Refresh the list
    } catch (error) {
      console.error('Error updating subject:', error);
      throw error;
    }
  };

  const deleteSubject = (id: number) => {
    // Delete subject and all associated assignments
    setSubjects(subjects.filter(s => s.id !== id));
    setSubjectAssignments(subjectAssignments.filter(a => a.subjectId !== id));
  };

  // ==================== TEACHER ASSIGNMENTS ====================

  const fetchTeacherAssignments = async () => {
    try {
      const assignments = await DataService.getTeacherAssignments({
        term_id: 1, // TODO: get active term
        session_id: 1, // TODO: get active session
      });
      
      // Map to SubjectAssignment shape for compatibility
      const mapped: SubjectAssignment[] = assignments.map((ta: any) => ({
        id: ta.id,
        subjectId: ta.subject_id,
        subjectName: ta.subject_name,
        classId: ta.class_id,
        className: ta.class_name,
        teacherId: ta.teacher_id,
        teacherName: `${ta.first_name} ${ta.last_name}`,
        academicYear: ta.session_name,
        term: ta.term_name,
      }));
      
      setSubjectAssignments(mapped);
    } catch (error) {
      console.error('Failed to fetch teacher assignments:', error);
    }
  };

  const createTeacherAssignments = async (teacherId: number, assignments: { subjectId: number; classId: number }[]) => {
    try {
      const result = await DataService.createTeacherAssignments({
        teacher_id: teacherId,
        assignments: assignments.map(a => ({ class_id: a.classId, subject_id: a.subjectId })),
        term_id: 1, // TODO: get active term
        session_id: 1, // TODO: get active session
      });
      
      // Refresh assignments
      await fetchTeacherAssignments();
      
      return result;
    } catch (error) {
      console.error('Failed to create teacher assignments:', error);
      throw error;
    }
  };

  const deleteTeacherAssignment = async (id: number) => {
    try {
      await DataService.deleteTeacherAssignment(id);
      
      // Refresh assignments
      await fetchTeacherAssignments();
    } catch (error) {
      console.error('Failed to delete teacher assignment:', error);
      throw error;
    }
  };

  // Subject Assignment Methods
  const addSubjectAssignment = async (assignment: Omit<SubjectAssignment, 'id'>) => {
    try {
      const newAssignment = { ...assignment, id: subjectAssignments.length + 1 };
      
      // Try to save to backend API
      try {
        const response = await teacherAssignmentsAPI.create({
          teacher_id: assignment.teacherId,
          assignments: [{
            class_id: assignment.classId,
            subject_id: assignment.subjectId
          }]
        });
        
        // If API call succeeds, use the returned ID
        if (response && (response as any).created_count > 0) {
          // API doesn't return individual IDs, keep local ID
          console.log('Subject assignment created successfully');
        }
      } catch (apiError) {
        console.warn('Could not save subject assignment to backend, using local state only:', apiError);
        // Continue with local state if API fails
      }

      // Update local state
      setSubjectAssignments([...subjectAssignments, newAssignment]);
      
      // Add activity log
      addActivityLog({
        actor: currentUser?.username || 'System',
        actorRole: 'Admin',
        action: 'CREATE',
        target: `Subject Assignment: ${assignment.subjectName} to ${assignment.teacherName}`,
        ip: '127.0.0.1',
        status: 'Success',
        details: `Assigned ${assignment.subjectName} to ${assignment.teacherName} for ${assignment.className}`
      });
    } catch (error) {
      console.error('Error adding subject assignment:', error);
      throw error;
    }
  };

  const updateSubjectAssignment = (id: number, assignment: Partial<SubjectAssignment>) => {
    setSubjectAssignments(subjectAssignments.map(a => (a.id === id ? { ...a, ...assignment } : a)));
  };

  const deleteSubjectAssignment = (id: number) => {
    setSubjectAssignments(subjectAssignments.filter(a => a.id !== id));
  };

  const getAssignmentsByClass = (classId: number) => {
    return subjectAssignments.filter(a => a.classId === classId);
  };

  const getAssignmentsByTeacher = (teacherId: number) => {
    return subjectAssignments.filter(a => a.teacherId === teacherId);
  };

  // Score Methods
  const addScore = async (score: Omit<Score, 'id' | 'total' | 'grade' | 'remark' | 'classAverage' | 'classMin' | 'classMax'>) => {
    const total = score.ca1 + score.ca2 + score.exam;
    const grade = calculateGrade(total);
    const remark = getRemark(grade);
    
    // Calculate class statistics for this subject/assignment
    const assignmentScores = scores.filter(s => s.subjectAssignmentId === score.subjectAssignmentId);
    const allTotals = [...assignmentScores.map(s => s.total), total];
    const classAverage = allTotals.reduce((sum, t) => sum + t, 0) / allTotals.length;
    const classMin = Math.min(...allTotals);
    const classMax = Math.max(...allTotals);
    
    const newScore: Score = {
      ...score,
      id: scores.length > 0 ? Math.max(...scores.map(s => s.id)) + 1 : 1,
      total,
      grade,
      remark,
      classAverage,
      classMin,
      classMax
    };

    try {
      // Try to save to backend API
      try {
        // Get class and subject from the subject assignment
        const assignment = subjectAssignments.find(sa => sa.id === score.subjectAssignmentId);
        if (!assignment) {
          throw new Error('Subject assignment not found for score');
        }
        
        // Validate required fields
        if (!score.studentId || !assignment.classId || !assignment.subjectId) {
          throw new Error('Missing required fields for score creation');
        }
        
        const response = await scoresAPI.bulkCreate([
          {
            student_id: score.studentId,
            subject_id: assignment.subjectId,
            class_id: assignment.classId,
            term_id: currentTermId,
            session_id: currentSessionId,
            score: (score.ca1 || 0) + (score.ca2 || 0) + (score.exam || 0),
            teacher_id: currentUser?.linkedId,
            status: 'submitted',
          } as any,
        ]);
        
        // If API call succeeds, use the returned ID
        if (response && response.length > 0 && response[0].id) {
          newScore.id = response[0].id;
        }
      } catch (apiError) {
        console.warn('Could not save score to backend, using local state only:', apiError);
        // Continue with local state if API fails
      }

      // Update local state
      setScores([...scores, newScore]);
      
      // Add activity log
      const student = students.find(s => s.id === score.studentId);
      const assignment = subjectAssignments.find(sa => sa.id === score.subjectAssignmentId);
      addActivityLog({
        actor: currentUser?.username || 'System',
        actorRole: 'Admin',
        action: 'CREATE',
        target: `Score for ${student?.firstName} ${student?.lastName} in ${assignment?.subjectName}`,
        ip: '127.0.0.1',
        status: 'Success',
        details: `Added score for ${student?.firstName} ${student?.lastName} in ${assignment?.subjectName}`
      });
    } catch (error) {
      console.error('Error adding score:', error);
      throw error;
    }
  };

  const updateScore = async (id: number, score: Partial<Score>) => {
    try {
      // Find the existing score
      const existingScore = scores.find(s => s.id === id);
      if (!existingScore) return;

      // Calculate new total, grade, and remark if CA scores are updated
      let updatedScore = { ...existingScore, ...score };
      if (score.ca1 !== undefined || score.ca2 !== undefined || score.exam !== undefined) {
        const ca1 = score.ca1 !== undefined ? score.ca1 : existingScore.ca1;
        const ca2 = score.ca2 !== undefined ? score.ca2 : existingScore.ca2;
        const exam = score.exam !== undefined ? score.exam : existingScore.exam;
        
        updatedScore.total = ca1 + ca2 + exam;
        updatedScore.grade = calculateGrade(updatedScore.total);
        updatedScore.remark = getRemark(updatedScore.grade);
      }

      // Try to update in backend API
      try {
        // Since scoresAPI doesn't have update method, we'll use bulkCreate to replace
        // Get class and subject from the subject assignment
        const assignment = subjectAssignments.find(sa => sa.id === updatedScore.subjectAssignmentId);
        await scoresAPI.bulkCreate([
          {
            student_id: updatedScore.studentId,
            subject_id: assignment?.subjectId || 1,
            class_id: assignment?.classId || 1,
            term_id: currentTermId,
            session_id: currentSessionId,
            score:
              (updatedScore.ca1 || 0) +
              (updatedScore.ca2 || 0) +
              (updatedScore.exam || 0),
            teacher_id: currentUser?.linkedId,
            status: 'submitted',
          } as any,
        ]);
      } catch (apiError) {
        console.warn('Could not update score in backend, using local state only:', apiError);
        // Continue with local state if API fails
      }

      // Update local state
      setScores(scores.map(s => s.id === id ? updatedScore : s));
      
      // Add activity log
      const student = students.find(s => s.id === updatedScore.studentId);
      const assignment = subjectAssignments.find(sa => sa.id === updatedScore.subjectAssignmentId);
      addActivityLog({
        actor: currentUser?.username || 'System',
        actorRole: 'Admin',
        action: 'UPDATE',
        target: `Score for ${student?.firstName} ${student?.lastName} in ${assignment?.subjectName}`,
        ip: '127.0.0.1',
        status: 'Success',
        details: `Updated score for ${student?.firstName} ${student?.lastName} in ${assignment?.subjectName}`
      });
    } catch (error) {
      console.error('Error updating score:', error);
      throw error;
    }
  };

  const deleteScore = async (id: number) => {
    try {
      // Find the score to delete
      const score = scores.find(s => s.id === id);
      
      if (score) {
        // Try to delete from backend API
        try {
          await scoresAPI.submit([id]); // Use submit instead of delete
        } catch (apiError) {
          console.warn('Could not delete score from backend, using local state only:', apiError);
          // Continue with local state if API fails
        }
        
        // Add activity log
        const student = students.find(s => s.id === score.studentId);
        const assignment = subjectAssignments.find(sa => sa.id === score.subjectAssignmentId);
        addActivityLog({
          actor: currentUser?.username || 'System',
          actorRole: 'Admin',
          action: 'DELETE',
          target: `Score for ${student?.firstName} ${student?.lastName} in ${assignment?.subjectName}`,
          ip: '127.0.0.1',
          status: 'Success',
          details: `Deleted score for ${student?.firstName} ${student?.lastName} in ${assignment?.subjectName}`
        });
      }

      // Update local state
      setScores(scores.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting score:', error);
      throw error;
    }
  };

  const submitScores = async (scoreIds: number[]) => {
    try {
      // Find scores to submit
      const scoresToSubmit = scores.filter(s => scoreIds.includes(s.id));
      
      // Try to submit to backend API
      try {
        await scoresAPI.submit(scoreIds);
      } catch (apiError) {
        console.warn('Could not submit scores to backend, using local state only:', apiError);
        // Continue with local state if API fails
      }

      // Update local state
      setScores(
        scores.map(s => (scoreIds.includes(s.id) ? { ...s, status: 'Submitted' } : s))
      );
      
      // Add activity log
      const studentNames = scoresToSubmit.map(score => {
        const student = students.find(s => s.id === score.studentId);
        return student ? `${student.firstName} ${student.lastName}` : 'Unknown';
      }).join(', ');
      
      addActivityLog({
        actor: currentUser?.username || 'System',
        actorRole: 'Admin',
        action: 'SUBMIT',
        target: `Scores for ${scoresToSubmit.length} student(s)`,
        ip: '127.0.0.1',
        status: 'Success',
        details: `Submitted scores for ${scoresToSubmit.length} student(s): ${studentNames}`
      });
    } catch (error) {
      console.error('Error submitting scores:', error);
      throw error;
    }
  };

  const getScoresByAssignment = (assignmentId: number) => {
    return scores.filter(s => s.subjectAssignmentId === assignmentId);
  };

  const getScoresByStudent = (studentId: number) => {
    return scores.filter(s => s.studentId === studentId);
  };

  // Affective/Psychomotor Methods
  const addAffectiveDomain = (domain: Omit<AffectiveDomain, 'id'>) => {
    const newDomain = { ...domain, id: affectiveDomains.length + 1 };
    setAffectiveDomains([...affectiveDomains, newDomain]);
  };

  const updateAffectiveDomain = (id: number, domain: Partial<AffectiveDomain>) => {
    setAffectiveDomains(affectiveDomains.map(a => (a.id === id ? { ...a, ...domain } : a)));
  };

  const addPsychomotorDomain = (domain: Omit<PsychomotorDomain, 'id'>) => {
    const newDomain = { ...domain, id: psychomotorDomains.length + 1 };
    setPsychomotorDomains([...psychomotorDomains, newDomain]);
  };

  const updatePsychomotorDomain = (id: number, domain: Partial<PsychomotorDomain>) => {
    setPsychomotorDomains(psychomotorDomains.map(p => (p.id === id ? { ...p, ...domain } : p)));
  };

  // Result Compilation Methods
  const fetchCompiledResults = async (filters?: { status?: string }) => {
    try {
      const params: any = {};
      // Backend expects numeric IDs in 'term' and 'session' query params
      if (currentTermId) params.term = currentTermId;
      if (currentSessionId) params.session = currentSessionId;

      // Optional status filter: map UI labels to backend statuses
      if (filters?.status) {
        const rawStatus = filters.status.toLowerCase();
        let backendStatus = rawStatus;

        // Frontend uses 'Submitted' to represent compiled (pending approval)
        if (rawStatus === 'submitted') {
          backendStatus = 'compiled';
        }

        params.status = backendStatus;
      }

      const response = await resultsAPI.getCompiled(params);
      const envelope = response as any;
      const rawResults = Array.isArray(envelope?.data)
        ? envelope.data
        : (Array.isArray(response) ? response : []);

      if (!Array.isArray(rawResults)) {
        setCompiledResults([]);
        return;
      }

      const mapped: CompiledResult[] = rawResults.map((r: any) => {
        const data = r.data || {};
        const studentId = Number(r.student_id ?? data.student_id ?? 0);
        const classId = Number(r.class_id ?? data.class_id ?? 0);
        const totalScore = Number(r.total_score ?? data.total_score ?? 0);
        const averageScore = Number(r.average_score ?? data.average_score ?? 0);
        const position = Number(r.position ?? data.position ?? 0);
        const termName = r.term_name || data.term_name || currentTerm;
        const sessionName = r.session_name || data.session_name || currentAcademicYear;
        const subjects = Array.isArray(data.subjects) ? data.subjects : [];

        const subjectScores: Score[] = subjects.map((sub: any, index: number) => {
          const ca1 = Number(sub.ca1 ?? sub.first_ca ?? 0);
          const ca2 = Number(sub.ca2 ?? sub.second_ca ?? 0);
          const exam = Number(sub.exam ?? sub.exam_score ?? 0);
          const total = Number(sub.total ?? sub.total_score ?? ca1 + ca2 + exam);
          const grade = calculateGrade(total);
          const remark = getRemark(grade);
          const classAverage = Number(sub.class_average ?? 0);
          const classMin = Number(sub.class_min ?? 0);
          const classMax = Number(sub.class_max ?? 0);
          const subjectTeacher = sub.subject_teacher || sub.teacher_name || r.class_teacher_name || '';
          
          return {
            id: Number(sub.id ?? index + 1),
            studentId,
            subjectAssignmentId: Number(sub.subject_assignment_id ?? 0),
            subjectName: sub.subject_name || sub.name || '',
            ca1,
            ca2,
            exam,
            total,
            classAverage,
            classMin,
            classMax,
            grade,
            remark,
            subjectTeacher,
            enteredBy: Number(sub.entered_by ?? 0),
            enteredDate: sub.entered_date || '',
            status: 'Submitted',
          };
        });

        const backendStatus = (r.status || 'compiled').toLowerCase();
        let uiStatus: CompiledResult['status'] = 'Submitted';
        if (backendStatus === 'approved') uiStatus = 'Approved';
        else if (backendStatus === 'rejected') uiStatus = 'Rejected';
        else if (backendStatus === 'draft') uiStatus = 'Draft';

        // Fetch real affective domains from API
      const affectiveData = data.affective_domains || data.affective || null;
      const affective = affectiveData ? {
        id: Number(affectiveData.id ?? 0),
        studentId,
        classId,
        term: termName,
        academicYear: sessionName,
        attentiveness: Number(affectiveData.attentiveness ?? 0),
        honesty: Number(affectiveData.honesty ?? 0),
        neatness: Number(affectiveData.neatness ?? 0),
        obedience: Number(affectiveData.obedience ?? 0),
        senseOfResponsibility: Number(affectiveData.sense_of_responsibility ?? 0),
        attentivenessRemark: affectiveData.attentiveness_remark || '',
        honestyRemark: affectiveData.honesty_remark || '',
        neatnessRemark: affectiveData.neatness_remark || '',
        obedienceRemark: affectiveData.obedience_remark || '',
        senseOfResponsibilityRemark: affectiveData.sense_of_responsibility_remark || '',
        enteredBy: Number(affectiveData.entered_by ?? 0),
        enteredDate: affectiveData.entered_date || '',
      } : null;

      // Fetch real psychomotor domains from API
      const psychomotorData = data.psychomotor_domains || data.psychomotor || null;
      const psychomotor = psychomotorData ? {
        id: Number(psychomotorData.id ?? 0),
        studentId,
        classId,
        term: termName,
        academicYear: sessionName,
        attentionToDirection: Number(psychomotorData.attention_to_direction ?? 0),
        considerateOfOthers: Number(psychomotorData.considerate_of_others ?? 0),
        handwriting: Number(psychomotorData.handwriting ?? 0),
        sports: Number(psychomotorData.sports ?? 0),
        verbalFluency: Number(psychomotorData.verbal_fluency ?? 0),
        worksWellIndependently: Number(psychomotorData.works_well_independently ?? 0),
        attentionToDirectionRemark: psychomotorData.attention_to_direction_remark || '',
        considerateOfOthersRemark: psychomotorData.considerate_of_others_remark || '',
        handwritingRemark: psychomotorData.handwriting_remark || '',
        sportsRemark: psychomotorData.sports_remark || '',
        verbalFluencyRemark: psychomotorData.verbal_fluency_remark || '',
        worksWellIndependentlyRemark: psychomotorData.works_well_independently_remark || '',
        enteredBy: Number(psychomotorData.entered_by ?? 0),
        enteredDate: psychomotorData.entered_date || '',
      } : null;

        return {
          id: Number(r.id),
          studentId,
          classId,
          term: termName,
          academicYear: sessionName,
          scores: subjectScores,
          affective,
          psychomotor,
          totalScore,
          averageScore,
          classAverage: Number(data.class_average ?? 0),
          position,
          totalStudents: Number(data.total_students ?? rawResults.length),
          timesPresent: Number(data.times_present ?? 0),
          timesAbsent: Number(data.times_absent ?? 0),
          totalAttendanceDays: Number(data.total_attendance_days ?? 0),
          termBegin: data.term_begin ?? '',
          termEnd: data.term_end ?? '',
          nextTermBegin: data.next_term_begin ?? '',
          classTeacherName: data.class_teacher_name || r.class_teacher_name || '',
          classTeacherComment: data.class_teacher_comment || '',
          principalName: data.principal_name || r.principal_name || schoolSettings.principalName || 'Mrs. Grace Okoro',
          principalComment: data.principal_comment ?? '',
          principalSignature: data.principal_signature ?? '',
          compiledBy: Number(data.compiled_by ?? 0),
          compiledDate: r.created_at || new Date().toISOString(),
          status: uiStatus,
          approvedBy: r.approved_by ? Number(r.approved_by) : null,
          approvedDate: r.approved_at || null,
          rejectionReason: null,
        };
      });

      setCompiledResults(mapped);
    } catch (error) {
      console.error('Error fetching compiled results:', error);
      setCompiledResults([]);
    }
  };

  const compileResult = (result: Omit<CompiledResult, 'id'>) => {
    const newId = compiledResults.length > 0 ? Math.max(...compiledResults.map(r => r.id)) + 1 : 1;
    
    // Get teacher info for additional fields
    const teacherInfo = teachers.find(t => t.id === result.compiledBy);
    
    // Calculate class average from all students' scores
    const classResults = compiledResults.filter(r => r.classId === result.classId && r.term === result.term && r.academicYear === result.academicYear);
    const allAverages = [...classResults.map(r => r.averageScore), result.averageScore];
    const classAverage = allAverages.reduce((sum, avg) => sum + avg, 0) / allAverages.length;
    
    const newResult: CompiledResult = { 
      ...result, 
      id: newId,
      classAverage,
      classTeacherName: teacherInfo ? `${teacherInfo.firstName} ${teacherInfo.lastName}` : '',
      principalName: schoolSettings.principalName || 'Mrs. Grace Okoro',
      principalComment: '',
      principalSignature: '',
      timesPresent: result.timesPresent || 0,
      timesAbsent: result.timesAbsent || 0,
      totalAttendanceDays: result.totalAttendanceDays || 0,
      termBegin: result.termBegin || '',
      termEnd: result.termEnd || '',
      nextTermBegin: result.nextTermBegin || '',
    };
    setCompiledResults([...compiledResults, newResult]);
  };

  const updateCompiledResult = (id: number, result: Partial<CompiledResult>) => {
    setCompiledResults(compiledResults.map(r => (r.id === id ? { ...r, ...result } : r)));
  };

  const submitResult = (id: number) => {
    setCompiledResults(
      compiledResults.map(r => (r.id === id ? { ...r, status: 'Submitted' } : r))
    );
  };

  const approveResult = (id: number, approvedBy: number) => {
    setCompiledResults(
      compiledResults.map(r =>
        r.id === id
          ? { ...r, status: 'Approved', approvedBy, approvedDate: new Date().toISOString() }
          : r
      )
    );
  };

  const rejectResult = (id: number, reason: string) => {
    setCompiledResults(
      compiledResults.map(r =>
        r.id === id ? { ...r, status: 'Rejected', rejectionReason: reason } : r
      )
    );
  };

  const getResultsByClass = (classId: number) => {
    return compiledResults.filter(r => r.classId === classId);
  };

  const getPendingApprovals = () => {
    return compiledResults.filter(r => r.status === 'Submitted');
  };

  // Payment Methods
  const addPayment = async (payment: Omit<Payment, 'id'>) => {
    try {
      const response = await paymentsAPI.create(payment);
      const envelope = response as any;
      const created = envelope?.data;
      if (created) {
        setPayments(prev => [...prev, created]);
      }
    } catch (error) {
      console.error('Failed to add payment:', error);
      throw error;
    }
  };

  const updatePayment = (id: number, payment: Partial<Payment>) => {
    setPayments(payments.map(p => (p.id === id ? { ...p, ...payment } : p)));
  };

  const verifyPayment = async (id: number) => {
    try {
      await paymentsAPI.verify({ id });
      setPayments(payments.map(p => (p.id === id ? { ...p, status: 'Verified' } : p)));
    } catch (error) {
      console.error('Failed to verify payment:', error);
      throw error;
    }
  };

  const getPaymentsByStudent = (studentId: number) => {
    return payments.filter(p => p.studentId === studentId);
  };

  const fetchPaymentsByStudent = async (studentId: number) => {
    try {
      const response = await paymentsAPI.getByStudent(studentId);
      const envelope = response as any;
      const rawPayments = Array.isArray(envelope?.data)
        ? envelope.data
        : (Array.isArray(response) ? response : []);

      if (!Array.isArray(rawPayments)) {
        return;
      }

      const student = students.find(s => s.id === studentId);
      const studentName = student ? `${student.firstName} ${student.lastName}` : '';

      const mappedPayments: Payment[] = rawPayments.map((p: any) => ({
        id: Number(p.id),
        studentId: Number(p.student_id),
        studentName: p.student_name || studentName,
        amount: Number(p.amount_paid),
        paymentType: p.fee_type || 'Payment',
        term: currentTerm,
        academicYear: currentAcademicYear,
        paymentMethod: p.payment_method || '',
        reference: p.transaction_id || '',
        recordedBy: Number(p.created_by) || 0,
        recordedDate: p.payment_date
          ? new Date(p.payment_date).toISOString()
          : new Date().toISOString(),
        status: p.status === 'verified'
          ? 'Verified'
          : p.status === 'pending'
          ? 'Pending'
          : 'Rejected',
        receiptNumber: p.transaction_id || `PAY-${p.id}`,
      }));

      setPayments(prev => {
        const others = prev.filter(p => p.studentId !== studentId);
        return [...others, ...mappedPayments];
      });

      updateStudentFeeBalance(studentId);
    } catch (error) {
      console.error('Error fetching payments for student:', error);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const response = await paymentsAPI.getPending();
      const envelope = response as any;
      const rawPayments = Array.isArray(envelope?.data)
        ? envelope.data
        : (Array.isArray(response) ? response : []);

      if (!Array.isArray(rawPayments)) {
        return;
      }

      const mappedPayments: Payment[] = rawPayments.map((p: any) => {
        const studentId = Number(p.student_id);
        const student = students.find(s => s.id === studentId);
        const studentName = p.student_name || (student ? `${student.firstName} ${student.lastName}` : '');

        return {
          id: Number(p.id),
          studentId,
          studentName,
          amount: Number(p.amount_paid),
          paymentType: p.fee_type || 'Payment',
          term: currentTerm,
          academicYear: currentAcademicYear,
          paymentMethod: p.payment_method || '',
          reference: p.transaction_id || '',
          recordedBy: Number(p.created_by) || 0,
          recordedDate: p.payment_date
            ? new Date(p.payment_date).toISOString()
            : new Date().toISOString(),
          status: 'Pending',
          receiptNumber: p.transaction_id || `PAY-${p.id}`,
        };
      });

      setPayments(prev => {
        const byId = new Map<number, Payment>();
        prev.forEach(p => {
          byId.set(p.id, p);
        });
        mappedPayments.forEach(p => {
          byId.set(p.id, p);
        });
        return Array.from(byId.values());
      });

      const affectedStudentIds = Array.from(new Set(mappedPayments.map(p => p.studentId)));
      affectedStudentIds.forEach(id => {
        updateStudentFeeBalance(id);
      });
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    }
  };

  // Fee Structure Methods
  const addFeeStructure = (feeStructure: Omit<FeeStructure, 'id' | 'totalFee'>) => {
    const totalFee = feeStructure.tuitionFee + feeStructure.developmentLevy + feeStructure.sportsFee + 
                     feeStructure.examFee + feeStructure.booksFee + feeStructure.uniformFee + feeStructure.transportFee;
    const newFeeStructure = { ...feeStructure, id: feeStructures.length + 1, totalFee };
    setFeeStructures([...feeStructures, newFeeStructure]);
  };

  const updateFeeStructure = (id: number, feeStructure: Partial<FeeStructure>) => {
    setFeeStructures(feeStructures.map(fs => {
      if (fs.id === id) {
        const updated = { ...fs, ...feeStructure };
        updated.totalFee = updated.tuitionFee + updated.developmentLevy + updated.sportsFee + 
                          updated.examFee + updated.booksFee + updated.uniformFee + updated.transportFee;
        return updated;
      }
      return fs;
    }));
  };

  const getFeeStructureByClass = (classId: number, term: string, academicYear: string) => {
    return feeStructures.find(fs => fs.classId === classId && fs.term === term && fs.academicYear === academicYear);
  };

  // Student Fee Balance Methods
  const getStudentFeeBalance = (studentId: number, term: string, academicYear: string) => {
    return studentFeeBalances.find(sfb => sfb.studentId === studentId && sfb.term === term && sfb.academicYear === academicYear);
  };

  const updateStudentFeeBalance = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const studentPayments = payments.filter(
      p => p.studentId === studentId && p.term === currentTerm && p.academicYear === currentAcademicYear && p.status === 'Verified'
    );

    const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);

    const feeStructure = getFeeStructureByClass(student.classId, currentTerm, currentAcademicYear);
    const totalFeeRequired = feeStructure?.totalFee || 0;
    const balance = totalFeeRequired - totalPaid;

    const status: 'Paid' | 'Partial' | 'Unpaid' = 
      balance <= 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid';

    const existingBalance = studentFeeBalances.find(
      sfb => sfb.studentId === studentId && sfb.term === currentTerm && sfb.academicYear === currentAcademicYear
    );

    if (existingBalance) {
      setStudentFeeBalances(studentFeeBalances.map(sfb =>
        sfb.id === existingBalance.id
          ? { ...sfb, totalPaid, balance, status }
          : sfb
      ));
    } else {
      const newBalance: StudentFeeBalance = {
        id: studentFeeBalances.length + 1,
        studentId,
        classId: student.classId,
        term: currentTerm,
        academicYear: currentAcademicYear,
        totalFeeRequired,
        totalPaid,
        balance,
        status,
      };
      setStudentFeeBalances([...studentFeeBalances, newBalance]);
    }
  };

  const linkParentToStudent = (parentId: number, studentId: number) => {
    // Update parent's studentIds array
    setParents(parents.map(p => {
      if (p.id === parentId) {
        const studentIds = p.studentIds.includes(studentId) ? p.studentIds : [...p.studentIds, studentId];
        return { ...p, studentIds };
      }
      return p;
    }));

    // Update student's parentId
    setStudents(students.map(s => (s.id === studentId ? { ...s, parentId } : s)));
  };

  // Fetch Users from API
  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      const data = (response as any)?.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  // User Methods
  const addUser = async (user: Omit<User, 'id'>) => {
    try {
      const response = await usersAPI.create(user);
      // The API client returns the created user data directly
      await fetchUsers(); // Refresh the list
      return (response as User)?.id || 0;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  };

  const updateUser = (id: number, user: Partial<User>) => {
    setUsers(users.map(u => (u.id === id ? { ...u, ...user } : u)));
  };

  const deleteUser = (id: number) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const login = (username: string, password: string): User | null => {
    const user = users.find(u => u.username === username && u.password === password && u.status === 'Active');
    if (user) {
      setCurrentUser(user);
      return user;
    }
    return null;
  };

  const changePassword = (userId: number, oldPassword: string, newPassword: string): boolean => {
    const user = users.find(u => u.id === userId && u.password === oldPassword);
    if (user) {
      setUsers(users.map(u => (u.id === userId ? { ...u, password: newPassword } : u)));
      return true;
    }
    return false;
  };

  // Notification Methods
  const addNotification = (notification: Omit<Notification, 'id' | 'sentDate' | 'isRead' | 'readBy'>) => {
    const newId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1;
    const newNotification: Notification = {
      ...notification,
      id: newId,
      sentDate: new Date().toISOString(),
      isRead: false,
      readBy: [],
    };
    setNotifications([...notifications, newNotification]);
  };

  const markNotificationAsRead = (notificationId: number, userId: number) => {
    setNotifications(notifications.map(n => {
      if (n.id === notificationId && !n.readBy.includes(userId)) {
        return { ...n, readBy: [...n.readBy, userId], isRead: true };
      }
      return n;
    }));
  };

  const getUnreadNotifications = (userId: number, userRole: string): Notification[] => {
    return notifications.filter(n => {
      const isForUser = n.targetAudience === 'all' || n.targetAudience === userRole + 's';
      const isUnread = !n.readBy.includes(userId);
      return isForUser && isUnread;
    });
  };

  const getAllNotifications = (_userId: number, userRole: string): Notification[] => {
    return notifications.filter(n => {
      return n.targetAudience === 'all' || n.targetAudience === userRole + 's';
    }).sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());
  };

  // Class Helper Methods
  const getClassTeacher = (classId: number): Teacher | null => {
    const cls = classes.find(c => c.id === classId);
    if (!cls || !cls.classTeacherId) return null;
    return teachers.find(t => t.id === cls.classTeacherId) || null;
  };

  const getClassSubjects = (classId: number): SubjectAssignment[] => {
    return subjectAssignments.filter(sa => sa.classId === classId);
  };

  // Class Subject Registration Methods
  const addClassSubjectRegistration = async (registration: Omit<ClassSubjectRegistration, 'id' | 'registeredDate'>): Promise<number> => {
    try {
      // Get class and subject information
      const cls = classes.find(c => c.id === registration.classId);
      const subject = subjects.find(s => s.id === registration.subjectId);
      
      if (!cls || !subject) {
        throw new Error('Invalid class or subject');
      }

      // Check if already registered for this term/year
      const existing = classSubjectRegistrations.find(
        r => r.classId === registration.classId && 
             r.subjectId === registration.subjectId && 
             r.term === registration.term && 
             r.academicYear === registration.academicYear
      );

      if (existing) {
        throw new Error('Subject already registered for this class in the specified term and academic year');
      }

      // Create new registration
      const newRegistration: ClassSubjectRegistration = {
        ...registration,
        id: classSubjectRegistrations.length > 0 ? Math.max(...classSubjectRegistrations.map(r => r.id)) + 1 : 1,
        className: cls.name,
        subjectName: subject.name,
        subjectCode: subject.code,
        registeredDate: new Date().toISOString().split('T')[0],
        status: 'Active'
      };

      // Try to save to backend API
      try {
        const response = await classSubjectsAPI.createRegistration({
          classId: registration.classId,
          subjectId: registration.subjectId,
          term: registration.term,
          academicYear: registration.academicYear,
          isCore: registration.isCore,
          registeredBy: registration.registeredBy
        });
        
        // If API call succeeds, use the returned ID
        if (response && (response as any).id) {
          newRegistration.id = response.id;
        }
      } catch (apiError) {
        console.warn('Could not save to backend, using local state only:', apiError);
        // Continue with local state if API fails
      }

      // Update local state
      setClassSubjectRegistrations([...classSubjectRegistrations, newRegistration]);
      
      // Add activity log
      addActivityLog({
        actor: currentUser?.username || 'System',
        actorRole: 'Admin',
        action: 'CREATE',
        target: `Subject Registration: ${subject.name} for ${cls.name}`,
        ip: '127.0.0.1',
        status: 'Success',
        details: `Registered ${subject.name} for ${cls.name} - ${registration.term} ${registration.academicYear}`
      });
      
      return newRegistration.id;
    } catch (error) {
      console.error('Error adding class subject registration:', error);
      throw error;
    }
  };

  const deleteClassSubjectRegistration = async (id: number): Promise<void> => {
    try {
      // Find the registration to delete
      const registration = classSubjectRegistrations.find(r => r.id === id);
      
      if (registration) {
        // Try to delete from backend API
        try {
          await classSubjectsAPI.deleteRegistration(id);
        } catch (apiError) {
          console.warn('Could not delete from backend, using local state only:', apiError);
          // Continue with local state if API fails
        }
        
        // Add activity log
        addActivityLog({
          actor: currentUser?.username || 'System',
          actorRole: 'Admin',
          action: 'DELETE',
          target: `Subject Registration: ${registration.subjectName} for ${registration.className}`,
          ip: '127.0.0.1',
          status: 'Success',
          details: `Deleted ${registration.subjectName} registration for ${registration.className}`
        });
      }

      // Update local state
      setClassSubjectRegistrations(classSubjectRegistrations.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting class subject registration:', error);
      throw error;
    }
  };

  const fetchClassSubjectRegistrations = async (filters?: { term?: string; academicYear?: string; classId?: number }): Promise<ClassSubjectRegistration[]> => {
    try {
      // First try to fetch from backend API
      const response = await classSubjectsAPI.getRegistrations(filters || {});
      const apiData = Array.isArray(response) 
        ? response 
        : ((response as any)?.data && Array.isArray((response as any).data) 
            ? (response as any).data 
            : []);

      // If API returns data, use it
      if (apiData.length > 0) {
        const mappedData: ClassSubjectRegistration[] = apiData.map((reg: any) => ({
          id: reg.id,
          classId: reg.classId,
          className: reg.className || classes.find(c => c.id === reg.classId)?.name || 'Unknown Class',
          subjectId: reg.subjectId,
          subjectName: reg.subjectName || subjects.find(s => s.id === reg.subjectId)?.name || 'Unknown Subject',
          subjectCode: reg.subjectCode || subjects.find(s => s.id === reg.subjectId)?.code || '',
          term: reg.term || currentTerm,
          academicYear: reg.academicYear || currentAcademicYear,
          isCore: reg.isCore || false,
          status: reg.status || 'Active',
          registeredBy: reg.registeredBy || 'System',
          registeredDate: reg.registeredDate || new Date().toISOString().split('T')[0]
        }));
        
        setClassSubjectRegistrations(mappedData);
        return mappedData;
      }

      // Fallback to local state filtering
      let filtered = [...classSubjectRegistrations];
      
      if (filters?.term) {
        filtered = filtered.filter(r => r.term === filters.term);
      }
      
      if (filters?.academicYear) {
        filtered = filtered.filter(r => r.academicYear === filters.academicYear);
      }
      
      if (filters?.classId) {
        filtered = filtered.filter(r => r.classId === filters.classId);
      }
      
      return filtered;
    } catch (error) {
      console.error('Error fetching class subject registrations:', error);
      
      // Fallback to local state filtering
      let filtered = [...classSubjectRegistrations];
      
      if (filters?.term) {
        filtered = filtered.filter(r => r.term === filters.term);
      }
      
      if (filters?.academicYear) {
        filtered = filtered.filter(r => r.academicYear === filters.academicYear);
      }
      
      if (filters?.classId) {
        filtered = filtered.filter(r => r.classId === filters.classId);
      }
      
      return filtered;
    }
  };

  const getClassRegisteredSubjects = (classId: number, term?: string, academicYear?: string): ClassSubjectRegistration[] => {
    return classSubjectRegistrations.filter(r => 
      r.classId === classId && 
      (term ? r.term === term : true) && 
      (academicYear ? r.academicYear === academicYear : true)
    );
  };

  const updateClassStudentCount = (classId: number) => {
    const classStudents = students.filter(s => s.classId === classId && s.status === 'Active');
    setClasses(classes.map(c => 
      c.id === classId ? { ...c, currentStudents: classStudents.length } : c
    ));
  };

  // System Settings Methods
  const updateCurrentTerm = (term: string) => {
    setCurrentTerm(term);
  };

  const updateCurrentAcademicYear = (year: string) => {
    setCurrentAcademicYear(year);
  };

  const getTeacherClassTeacherAssignments = (teacherId: number): number[] => {
    return classes.filter(c => c.classTeacherId === teacherId).map(c => c.id);
  };

  const validateClassTeacherAssignment = (teacherId: number, newClassId: number): { valid: boolean; message: string } => {
    const currentAssignments = getTeacherClassTeacherAssignments(teacherId);
    
    // Check if already assigned to this class
    if (currentAssignments.includes(newClassId)) {
      return { valid: false, message: 'Teacher is already class teacher for this class' };
    }
    
    // Check if limit of 3 classes will be exceeded
    if (currentAssignments.length >= 3) {
      return { 
        valid: false, 
        message: 'Teacher cannot be class teacher for more than 3 classes. Current assignments: ' + currentAssignments.length 
      };
    }
    
    return { valid: true, message: 'Valid assignment' };
  };

  const updateSchoolSettings = (settings: Partial<SchoolSettings>) => {
    setSchoolSettings({ ...schoolSettings, ...settings });
  };

  // Bank Account Settings Methods
  const updateBankAccountSettings = (settings: Omit<BankAccountSettings, 'id' | 'updatedDate'>) => {
    const newSettings: BankAccountSettings = {
      ...settings,
      id: 1,
      updatedDate: new Date().toISOString(),
    };
    setBankAccountSettings(newSettings);
    
    if (currentUser) {
      addActivityLog({
        actor: currentUser.username || currentUser.name || 'Unknown',
        actorRole: 'Accountant',
        action: 'Update Bank Settings',
        target: settings.bankName,
        ip: '127.0.0.1',
        status: 'Success',
        details: `Updated bank account to ${settings.accountNumber}`,
      });
    }
  };

  const getBankAccountSettings = () => {
    return bankAccountSettings;
  };

  // Activity Log Methods
  const addActivityLog = (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const newId = activityLogs.length > 0 ? Math.max(...activityLogs.map(l => l.id)) + 1 : 1;
    const newLog: ActivityLog = {
      ...log,
      id: newId,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs([newLog, ...activityLogs]);
  };

  const getActivityLogs = (filterAction?: string, filterDate?: string): ActivityLog[] => {
    let filtered = activityLogs;
    
    if (filterAction && filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }
    
    if (filterDate && filterDate !== 'all') {
      const now = new Date();
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        if (filterDate === 'today') {
          return logDate.toDateString() === now.toDateString();
        } else if (filterDate === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return logDate >= weekAgo;
        } else if (filterDate === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return logDate >= monthAgo;
        }
        return true;
      });
    }
    
    return filtered;
  };

  // Promotion Methods
  const promoteStudent = async (studentId: number, newClassId: number, newAcademicYear: string) => {
    const student = students.find(s => s.id === studentId);
    const newClass = classes.find(c => c.id === newClassId);
    const currentSession = sessions.find(s => s.is_active);
    
    if (!student || !newClass || !currentSession) return;
    
    try {
      // Create promotion record in backend
      const promotionResponse = await promotionsAPI.create({
        student_id: studentId,
        to_class_id: newClassId,
        to_session_id: currentSession.id,
        promotion_type: 'regular',
        academic_performance: 'Good',
        conduct: 'Good',
        attendance_rate: 75,
        promotion_date: new Date().toISOString().split('T')[0]
      });
      
      // Auto-approve the promotion
      if (promotionResponse?.data?.id) {
        await promotionsAPI.approve(promotionResponse.data.id);
      }
      
      // Update local state after successful backend creation and approval
      setStudents(students.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            classId: newClassId,
            className: newClass.name,
            level: newClass.level,
            academicYear: newAcademicYear,
          };
        }
        return s;
      }));
      
      // Update class student counts
      updateClassStudentCount(student.classId);
      updateClassStudentCount(newClassId);
      
      // Log the promotion activity
      if (currentUser) {
        addActivityLog({
          actor: currentUser.username || currentUser.name || 'Unknown',
          actorRole: 'Admin',
          action: 'Promote Student',
          target: `${student.firstName} ${student.lastName} → ${newClass.name}`,
          ip: 'System',
          status: 'Success',
          details: `Promoted from ${student.className} to ${newClass.name} for ${newAcademicYear}`,
        });
      }
    } catch (error) {
      console.error('Failed to promote student:', error);
      throw error;
    }
  };

  const promoteMultipleStudents = async (studentIds: number[], classMapping: { [studentId: number]: number }, newAcademicYear: string) => {
    const currentSession = sessions.find(s => s.is_active);
    if (!currentSession) throw new Error('No active session found');
    
    try {
      // Prepare bulk promotion data
      const promotions = studentIds.map(studentId => {
        const student = students.find(s => s.id === studentId);
        const newClassId = classMapping[studentId];
        
        if (!student || !newClassId) return null;
        
        return {
          student_id: studentId,
          to_class_id: newClassId,
          to_session_id: currentSession.id,
          promotion_type: 'regular',
          academic_performance: 'Good',
          conduct: 'Good',
          attendance_rate: 75,
          promotion_date: new Date().toISOString().split('T')[0]
        };
      }).filter(Boolean);
      
      // Create bulk promotion records in backend
      const bulkResponse = await promotionsAPI.createBulk(promotions);
      
      // Auto-approve all successful promotions
      if (bulkResponse?.data?.success_count > 0) {
        // Note: In a real implementation, you'd need to get the promotion IDs and approve them
        // For now, we'll assume the backend handles auto-approval or we'd need to modify the flow
        console.log(`Successfully created ${bulkResponse.data.success_count} promotions`);
      }
      
      // Update local state after successful backend creation
      studentIds.forEach(studentId => {
        const newClassId = classMapping[studentId];
        const student = students.find(s => s.id === studentId);
        const newClass = classes.find(c => c.id === newClassId);
        
        if (student && newClass) {
          setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
              return {
                ...s,
                classId: newClassId,
                className: newClass.name,
                level: newClass.level,
                academicYear: newAcademicYear,
              };
            }
            return s;
          }));
          
          // Update class student counts
          updateClassStudentCount(student.classId);
          updateClassStudentCount(newClassId);
        }
      });
      
      // Log the bulk promotion activity
      if (currentUser) {
        addActivityLog({
          actor: currentUser.username || currentUser.name || 'Unknown',
          actorRole: 'Admin',
          action: 'Promote Students',
          target: `${studentIds.length} students promoted`,
          ip: 'System',
          status: 'Success',
          details: `Promoted ${studentIds.length} students to ${newAcademicYear}`,
        });
      }
    } catch (error) {
      console.error('Failed to promote multiple students:', error);
      throw error;
    }
  };

  const value: SchoolContextType = {
    // Data
    students,
    teachers,
    parents,
    accountants,
    classes,
    subjects,
    subjectAssignments,
    scores,
    affectiveDomains,
    psychomotorDomains,
    compiledResults,
    payments,
    users,
    currentUser,
    feeStructures,
    studentFeeBalances,
    notifications,
    activityLogs,

    // Settings
    currentTerm,
    currentAcademicYear,
    currentTermId,
    currentSessionId,
    loadingSessionTerm,
    sessionTermError,
    schoolSettings,
    bankAccountSettings,

    // Methods
    addStudent,
    updateStudent,
    deleteStudent,
    getStudentsByClass,
    fetchStudents,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    getTeacherAssignments,
    fetchTeachers,
    addParent,
    updateParent,
    deleteParent,
    getParentStudents,
    addAccountant,
    updateAccountant,
    deleteAccountant,
    addClass,
    updateClass,
    deleteClass,
    fetchClasses,
    fetchClassesWithStudents,
    addSubject,
    updateSubject,
    deleteSubject,
    fetchSubjects,
    addSubjectAssignment,
    updateSubjectAssignment,
    deleteSubjectAssignment,
    getAssignmentsByClass,
    getAssignmentsByTeacher,
    fetchTeacherAssignments,
    createTeacherAssignments,
    deleteTeacherAssignment,
    addScore,
    updateScore,
    deleteScore,
    submitScores,
    getScoresByAssignment,
    getScoresByStudent,
    addAffectiveDomain,
    updateAffectiveDomain,
    addPsychomotorDomain,
    updatePsychomotorDomain,
    compileResult,
    updateCompiledResult,
    submitResult,
    approveResult,
    rejectResult,
    getResultsByClass,
    getPendingApprovals,
    fetchCompiledResults,
    addPayment,
    updatePayment,
    verifyPayment,
    getPaymentsByStudent,
    fetchPaymentsByStudent,
    fetchPendingPayments,
    addFeeStructure,
    updateFeeStructure,
    getFeeStructureByClass,
    getStudentFeeBalance,
    updateStudentFeeBalance,
    linkParentToStudent,
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    setCurrentUser,
    addNotification,
    markNotificationAsRead,
    getUnreadNotifications,
    getAllNotifications,
    getClassTeacher,
    getClassSubjects,
    updateClassStudentCount,
    addClassSubjectRegistration,
    deleteClassSubjectRegistration,
    fetchClassSubjectRegistrations,
    getClassRegisteredSubjects,
    updateCurrentTerm,
    updateCurrentAcademicYear,
    updateSchoolSettings,
    getTeacherClassTeacherAssignments,
    validateClassTeacherAssignment,
    updateBankAccountSettings,
    getBankAccountSettings,
    addActivityLog,
    getActivityLogs,
    promoteStudent,
    promoteMultipleStudents,
  };

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}
