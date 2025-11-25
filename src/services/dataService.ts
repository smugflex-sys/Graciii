import { 
  authAPI, 
  usersAPI, 
  studentsAPI, 
  classesAPI, 
  subjectsAPI, 
  scoresAPI, 
  resultsAPI, 
  notificationsAPI,
  teacherAssignmentsAPI,
  sessionsAPI,
  termsAPI,
  feesAPI,
  paymentsAPI,
  settingsAPI,
  accountantsAPI
} from './apiService';

// Basic type definitions
type User = any;
type Class = any;
type Student = any;
type Payment = any;

interface Score {
  id: number;
  studentId: number;
  subjectId: number;
  classId: number;
  term: string;
  academicYear: string;
  ca1: number;
  ca2: number;
  exam: number;
  total?: number;
  grade?: string;
  remark?: string;
  isPublished?: boolean;
  publishedAt?: string;
  publishedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ClassSubject {
  id: number;
  classId: number;
  subjectId: number;
  teacherId?: number;
}

interface Session {
  id: number;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

interface Term {
  id: number;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

// Score interface is already defined above

interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface SystemInfo {
  appName: string;
  version: string;
  schoolName: string;
  currentSession: string;
  currentTerm: string;
}

// Unified data service for better state management
export class DataService {
  // Auth methods
  static async login(credentials: { email: string; password: string }) {
    return authAPI.login(credentials);
  }

  static async logout() {
    return authAPI.logout();
  }

  static async changePassword(data: { oldPassword: string; newPassword: string }) {
    return authAPI.changePassword(data);
  }

  static getCurrentUser(): Promise<User> {
    return authAPI.getCurrentUser();
  }
  
  // Users management
  static async getPayments(params?: { status?: string; studentId?: number }): Promise<Payment[]> {
    try {
      const rawList = await paymentsAPI.getAll(params);
      const list = Array.isArray(rawList) ? rawList : [];

      return list.map((p: any) => ({
        ...p,
        amount: p.amount !== undefined ? p.amount : p.amount_paid,
      }));
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  }

  static async getUserById(id: number): Promise<User> {
    return usersAPI.getById(id);
  }

  static async getUsers(params: { role?: string; status?: string } = {}): Promise<User[]> {
    try {
      const response = await usersAPI.getAll(params);
      const data = (response as any)?.data;
      if (Array.isArray(data)) {
        return data as User[];
      }
      return Array.isArray(response) ? (response as User[]) : [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  static async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
    return usersAPI.create(userData);
  }

  static async updateUser(id: number, userData: any) {
    return usersAPI.update(id, userData);
  }

  static async deleteUser(id: number) {
    return usersAPI.delete(id);
  }

  // Classes management
  static async getClasses(): Promise<Class[]> {
    try {
      const response = await classesAPI.getAll();
      return response.data || [];
    } catch (error) {
      console.error('Error fetching classes:', error);
      throw error;
    }
  }

  static async getClassById(id: number) {
    return classesAPI.getById(id);
  }

  static async createClass(classData: any) {
    return classesAPI.create(classData);
  }

  static async updateClass(id: number, classData: any) {
    return classesAPI.update(id, classData);
  }

  static async deleteClass(id: number) {
    return classesAPI.delete(id);
  }

  static async getClassStudents(classId: number) {
    const response = await studentsAPI.getAll();
    return Array.isArray(response) ? response.filter((s: any) => s.classId === classId) : [];
  }

  // Subjects management
  static async getSubjects(params?: { classId?: number }) {
    const response = await subjectsAPI.getAll();
    const subjects = Array.isArray(response) ? response : [];
    
    if (params?.classId) {
      try {
        const classWithSubjects = await classesAPI.getWithSubjects(params.classId);
        const envelope = classWithSubjects as any;
        const data = envelope && envelope.data ? envelope.data : envelope;
        const subjectIds = Array.isArray(data?.subjects)
          ? data.subjects.map((s: any) => s.id)
          : [];
        return subjects.filter((s: any) => subjectIds.includes(s.id));
      } catch (error) {
        console.error('Error filtering subjects by class:', error);
        return subjects;
      }
    }
    
    return subjects;
  }

  static async getSubjectsWithClasses() {
    try {
      // First get all subjects
      const subjectsResponse = await subjectsAPI.getAll();
      const subjects = Array.isArray(subjectsResponse) ? subjectsResponse : [];
      
      const subjectsWithClasses = await Promise.all(
        subjects.map(async (subject: any) => {
          try {
            const res = await subjectsAPI.getWithClasses(subject.id);
            const envelope = res as any;
            const data = envelope && envelope.data ? envelope.data : envelope;
            const classes = Array.isArray(data?.classes) ? data.classes : [];

            return {
              ...subject,
              classes: classes.map((c: any) => c.id ?? c.class_id ?? c),
            };
          } catch (error) {
            console.error('Error fetching classes for subject', subject.id, error);
            return {
              ...subject,
              classes: [],
            };
          }
        })
      );

      return subjectsWithClasses;
    } catch (error) {
      console.error('Error fetching subjects with classes:', error);
      throw error;
    }
  }

  static async getSubjectById(id: number) {
    return subjectsAPI.getById(id);
  }

  static async createSubject(subjectData: any) {
    return subjectsAPI.create(subjectData);
  }

  static async updateSubject(id: number, subjectData: any) {
    return subjectsAPI.update(id, subjectData);
  }

  static async deleteSubject(id: number) {
    return subjectsAPI.delete(id);
  }

  // Class-subject assignments
  static async getClassSubjects(params: { teacherId?: number; classId?: number } = {}) {
    try {
      if (!params.classId) {
        // Backend does not support listing all class-subjects without a class context
        return [];
      }

      const classWithSubjects = await classesAPI.getWithSubjects(params.classId);
      const envelope = classWithSubjects as any;
      const data = envelope && envelope.data ? envelope.data : envelope;
      const subjects = Array.isArray(data?.subjects) ? data.subjects : [];

      return subjects.map((s: any) => ({
        id: s.id,
        classId: data.id,
        subjectId: s.id,
        teacherId: s.teacher_id ?? undefined,
      })) as ClassSubject[];
    } catch (error) {
      console.error('Error fetching class subjects:', error);
      throw error;
    }
  }

  static async createClassSubject(assignmentData: Omit<ClassSubject, 'id'>) {
    try {
      const { classId, subjectId } = assignmentData;
      return classesAPI.assignSubjectToClass(classId, subjectId);
    } catch (error) {
      console.error('Error creating class subject:', error);
      throw error;
    }
  }

  static async updateClassSubject(id: number, assignmentData: Partial<Omit<ClassSubject, 'id'>>) {
    try {
      if (assignmentData.classId && assignmentData.subjectId) {
        return classesAPI.assignSubjectToClass(assignmentData.classId, assignmentData.subjectId);
      }
      console.warn('updateClassSubject called without classId/subjectId; no backend update performed.');
      return null as any;
    } catch (error) {
      console.error(`Error updating class subject ${id}:`, error);
      throw error;
    }
  }

  static async deleteClassSubject(_assignmentId: number) {
    try {
      console.warn('deleteClassSubject is not implemented; use classesAPI.removeSubjectFromClass directly with class and subject IDs.');
      return false;
    } catch (error) {
      console.error(`Error deleting class subject:`, error);
      throw error;
    }
  }

  // Students management
  static async getStudents(params: { parentId?: number; classId?: number } = {}): Promise<Student[]> {
    try {
      const allStudents = await studentsAPI.getAll();
      
      return allStudents.filter((student: any) => {
        if (params.parentId && student.parentId !== params.parentId) return false;
        if (params.classId && student.classId !== params.classId) return false;
        return true;
      });
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  }

  static async getStudentById(id: number) {
    return studentsAPI.getById(id);
  }

  static async createStudent(studentData: any) {
    return studentsAPI.create(studentData);
  }

  static async updateStudent(id: number, studentData: any) {
    return studentsAPI.update(id, studentData);
  }

  static async deleteStudent(id: number) {
    return studentsAPI.delete(id);
  }

  static async linkParent(studentId: number, parentData: any) {
    return studentsAPI.update(studentId, parentData);
  }

  // Sessions management
  static async getSessions() {
    return sessionsAPI.getAll();
  }

  static async activateSession(sessionId: number) {
    // Note: The mock API doesn't use the parameter, but we keep it for the real implementation
    return sessionsAPI.setActive(sessionId);
  }

  // Terms management
  static async getTerms() {
    return termsAPI.getAll();
  }

  static async activateTerm(termId: number) {
    // Note: The mock API doesn't use the parameter, but we keep it for the real implementation
    return termsAPI.setActive(termId);
  }

  // Scores management
  static async getScores(classId: number, params?: { subjectId?: number; term?: string; session?: string }): Promise<Score[]> {
    try {
      // Use getByClass with the classId to get scores for the class
      const scores = await scoresAPI.getByClass(classId);
      const scoreList = Array.isArray(scores) ? scores : [];
      
      // Filter the scores based on additional parameters
      return scoreList.filter((score: Score) => {
        if (params?.subjectId && score.subjectId !== params.subjectId) return false;
        if (params?.term && score.term !== params.term) return false;
        if (params?.session && score.academicYear !== params.session) return false;
        return true;
      });
    } catch (error) {
      console.error('Error fetching scores:', error);
      return [];
    }
  }

  static async submitScores(scores: Omit<Score, 'id' | 'total' | 'grade' | 'remark'>[]) {
    try {
      // In a real implementation, this would call scoresAPI.bulkCreate()
      // For now, we'll just return the scores as if they were saved
      return scores;
    } catch (error) {
      console.error('Error submitting scores:', error);
      throw error;
    }
  }

  static async getClassScores(classId: number, params?: { subjectId?: number; term?: string; session?: string }) {
    return this.getScores(classId, params);
  }

  static async exportScores(params: { class?: number; subject?: number; term?: string; session?: string }) {
    try {
      const scores = await this.getScores(
        params.class || 0,
        {
          subjectId: params.subject,
          term: params.term,
          session: params.session
        }
      );
      
      // Format the scores for export
      return scores.map(score => ({
        studentId: score.studentId,
        subjectId: score.subjectId,
        classId: score.classId,
        term: score.term,
        academicYear: score.academicYear,
        ca1: score.ca1,
        ca2: score.ca2,
        exam: score.exam,
        total: (score.ca1 || 0) + (score.ca2 || 0) + (score.exam || 0)
      }));
    } catch (error) {
      console.error('Error exporting scores:', error);
      return [];
    }
  }

  static async importScores(_file: File) {
    return Promise.resolve(null);
  }

  // Compiled results
  static async getClassCompiledResults(classId: number, params?: { term_id?: number; session_id?: number; status?: string }) {
    // Note: The mock API doesn't use parameters, but we keep them for the real implementation
    return resultsAPI.getCompiled({ class_id: classId, ...(params || {}) });
  }

  static async saveCompiledResults(_classId: number, resultData: any) {
    // Note: The mock API doesn't use parameters, but we keep them for the real implementation
    return resultsAPI.compile(resultData);
  }

  static async submitCompiledResults(_classId: number, resultIds: number[]) {
    // Note: The mock API doesn't use the parameter, but we keep it for the real implementation
    return resultsAPI.approve({ result_ids: resultIds });
  }

  static async getStudentResults(studentId: number, _params?: { term?: string; session?: string }) {
    try {
      // Get all scores and filter by studentId
      const allScores = await scoresAPI.getByClass(0); // 0 to get all
      return Array.isArray(allScores) 
        ? allScores.filter((s: any) => s.studentId === studentId) 
        : [];
    } catch (error) {
      console.error('Error fetching student results:', error);
      return [];
    }
  }

  // Notifications
  static async getNotifications() {
    return notificationsAPI.getAll();
  }

  static async markNotificationRead(id: number) {
    // Note: The mock API doesn't use the parameter, but we keep it for the real implementation
    return notificationsAPI.markAsRead(id);
  }

  static async deleteNotification(id: number) {
    // Note: The mock API doesn't use the parameter, but we keep it for the real implementation
    return notificationsAPI.delete(id);
  }

  // System info
  static async getSystemInfo() {
    try {
      const branding = await settingsAPI.getSchoolBranding();

      return {
        appName: 'Germ-in School ERP',
        version: '1.0.0',
        schoolName: branding.schoolName || 'Graceland Royal Academy Gombe',
        currentSession: 'N/A',
        currentTerm: 'N/A',
      };
    } catch (error) {
      console.error('Error fetching system info:', error);
      return {
        appName: 'Germ-in School ERP',
        version: '1.0.0',
        schoolName: 'Graceland Royal Academy Gombe',
        currentSession: 'N/A',
        currentTerm: 'N/A',
      };
    }
  }

  static async getSystemStats() {
    try {
      const users = await usersAPI.getAll();
      const userData = (users as any)?.data;
      const userList = Array.isArray(userData) ? userData : (Array.isArray(users) ? users : []);
      
      return {
        totalUsers: userList.length,
        totalAdmins: userList.filter((u: any) => u.role === 'admin').length,
        totalTeachers: userList.filter((u: any) => u.role === 'teacher').length,
        totalAccountants: userList.filter((u: any) => u.role === 'accountant').length,
        totalParents: userList.filter((u: any) => u.role === 'parent').length
      };
    } catch (error) {
      console.error('Error fetching system stats:', error);
      return {
        totalUsers: 0,
        totalAdmins: 0,
        totalTeachers: 0,
        totalAccountants: 0,
        totalParents: 0
      };
    }
  }

  static async getAccountantDashboardData() {
    try {
      const response = await accountantsAPI.getDashboard();
      const envelope = response as any;
      const data = envelope && envelope.data ? envelope.data : envelope;

      const totalFeesExpected = data?.total_fees_expected ?? 0;
      const totalPaymentsReceived = data?.total_payments_received ?? 0;
      const pending = data?.pending_payments || {};
      const pendingCount = pending.count ?? 0;
      const pendingAmount = pending.amount ?? 0;
      const recentPayments = Array.isArray(data?.recent_payments) ? data.recent_payments : [];
      const paymentStats = Array.isArray(data?.payment_stats) ? data.payment_stats : [];

      return {
        totalFeesExpected,
        totalPaymentsReceived,
        pendingPayments: {
          count: pendingCount,
          amount: pendingAmount,
        },
        recentPayments,
        paymentStats,
      };
    } catch (error) {
      console.error('Error fetching accountant dashboard data:', error);
      return {
        totalFeesExpected: 0,
        totalPaymentsReceived: 0,
        pendingPayments: {
          count: 0,
          amount: 0,
        },
        recentPayments: [],
        paymentStats: [],
      };
    }
  }

  // Dashboard data aggregation
  static async getDashboardData() {
    try {
      const [usersRes, classesRes, subjectsRes, studentsRes, paymentsRes] = await Promise.all([
        this.getUsers(),
        this.getClasses(),
        this.getSubjects(),
        this.getStudents(),
        this.getPayments()
      ]);

      // Ensure we have arrays even if the API returns something unexpected
      const users = Array.isArray(usersRes) ? usersRes : [];
      const classes = Array.isArray(classesRes) ? classesRes : [];
      const subjects = Array.isArray(subjectsRes) ? subjectsRes : [];
      const students = Array.isArray(studentsRes) ? studentsRes : [];
      const payments = Array.isArray(paymentsRes) ? paymentsRes : [];

      return {
        totalUsers: users.length,
        totalClasses: classes.length,
        totalSubjects: subjects.length,
        totalStudents: students.length,
        totalPayments: payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  // private static async _getAdminDashboardData() { ... }

  // private static async _getAccountantDashboardData() { ... }

  // private static async _getParentDashboardData() { ... }

  // private static async _getParentDashboardData() {
  //   try {
  //     const user = await this.getCurrentUser();
  //     const userId = user?.id; // Assuming user object has an id field
      
  //     if (!userId) {
  //       throw new Error('User not authenticated');
  //     }
      
  //     const [students, results] = await Promise.all([
  //       this.getStudents({ parentId: userId }),
  //       this.getStudentResults(userId)
  //     ]);

  //     return {
  //       students,
  //       results: results || []
  //     };
  //   } catch (error) {
  //     console.error('Error in getParentDashboardData:', error);
  //     return {
  //       students: [],
  //       results: []
  //     };
  //   }
  // }

  // ==================== TEACHER ASSIGNMENTS ====================

  static async getTeacherAssignments(params?: any): Promise<any[]> {
    try {
      const list = await teacherAssignmentsAPI.get(params);
      return Array.isArray(list) ? list : [];
    } catch (error) {
      console.error('Error fetching teacher assignments:', error);
      return [];
    }
  }

  static async createTeacherAssignments(data: { teacher_id: number; assignments: { class_id: number; subject_id: number }[]; term_id?: number; session_id?: number }): Promise<{ created_count: number; errors: string[] }> {
    try {
      const result = await teacherAssignmentsAPI.create(data);
      return result || { created_count: 0, errors: [] };
    } catch (error) {
      console.error('Error creating teacher assignments:', error);
      throw error;
    }
  }

  static async deleteTeacherAssignment(id: number): Promise<boolean> {
    try {
      await teacherAssignmentsAPI.delete({ id });
      return true;
    } catch (error) {
      console.error('Error deleting teacher assignment:', error);
      throw error;
    }
  }
}

export default DataService;
