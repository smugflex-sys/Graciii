/**
 * Academic Management Types
 */

// Minimal core types used by academic models
export interface Student {
  id: string;
  reg_no: string;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender: 'male' | 'female';
  address?: string;
  photo?: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  class_id: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  level: string;
  capacity: number;
  teacher_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: SubjectCategory;
  created_at: string;
  updated_at: string;
}

export type SubjectCategory = 'core' | 'elective' | 'vocational' | 'religious';

export interface SubjectWithStats extends Subject {
  student_count: number;
  average_score?: number;
}

export interface Score {
  id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  term_id: string;
  session_id: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: Grade;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface ScoreCreateData {
  student_id: string;
  subject_id: string;
  class_id: string;
  term_id: string;
  session_id: string;
  ca1: number;
  ca2: number;
  exam: number;
  remarks?: string;
}

export interface ScoreUpdateData {
  ca1?: number;
  ca2?: number;
  exam?: number;
  remarks?: string;
}

export interface Term {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: TermStatus;
  session_id: string;
  created_at: string;
  updated_at: string;
}

export type TermStatus = 'upcoming' | 'active' | 'completed';

export interface Session {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'upcoming' | 'active' | 'completed';

export interface ScoreWithRelations extends Score {
  Student: Student;
  Subject: Subject;
  Class: Class;
  Term: Term;
  Session: Session;
}

export interface CompiledResult {
  id: string;
  student_id: string;
  class_id: string;
  term_id: string;
  session_id: string;
  average: number;
  position: number;
  total_subjects: number;
  status: ResultStatus;
  created_at: string;
  updated_at: string;
}

export type ResultStatus = 'pending' | 'approved' | 'rejected';

export interface CompiledResultWithRelations extends CompiledResult {
  Student: Student;
  Class: Class;
  Term: Term;
  Session: Session;
}

export interface AffectiveSkill {
  id: string;
  student_id: string;
  class_id: string;
  term_id: string;
  session_id: string;
  punctuality?: number;
  neatness?: number;
  honesty?: number;
  cooperation?: number;
  leadership?: number;
  created_at: string;
  updated_at: string;
}

export interface PsychomotorSkill {
  id: string;
  student_id: string;
  class_id: string;
  term_id: string;
  session_id: string;
  handwriting?: number;
  verbal_fluency?: number;
  games_sports?: number;
  handling_tools?: number;
  drawing_painting?: number;
  created_at: string;
  updated_at: string;
}

export interface AcademicRecord {
  student_id: string;
  student_name: string;
  class_name: string;
  term_name: string;
  session_name: string;
  subjects: Array<{
    subject_name: string;
    ca1: number;
    ca2: number;
    exam: number;
    total: number;
    grade: Grade;
  }>;
  total_score: number;
  average: number;
  position: number;
  total_students: number;
  affective_skills?: AffectiveSkill;
  psychomotor_skills?: PsychomotorSkill;
}

export interface ClassResult {
  class_id: string;
  class_name: string;
  term_id: string;
  session_id: string;
  total_students: number;
  students_with_results: number;
  class_average: number;
  highest_score: number;
  lowest_score: number;
  passed_students: number;
  failed_students: number;
  pass_rate: number;
  results: CompiledResultWithRelations[];
}

export interface ScoreSheetData {
  class: Class;
  term: Term;
  session: Session;
  subjects: Subject[];
  students: Array<{
    id: string;
    reg_no: string;
    full_name: string;
    scores: { [subjectId: string]: Score };
  }>;
}

export interface BulkScoreData {
  scores: Array<{
    student_id: string;
    subject_id: string;
    ca1: number;
    ca2: number;
    exam: number;
  }>;
}

export interface GradeScale {
  grade: Grade;
  min_score: number;
  max_score: number;
  description: string;
  points: number;
}

export interface AcademicCalendar {
  id: string;
  session_id: string;
  term_id: string;
  event_type: CalendarEventType;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export type CalendarEventType = 'holiday' | 'exam' | 'event' | 'deadline';

export interface AcademicSettings {
  grading_system: GradeScale[];
  score_weights: {
    ca1: number;
    ca2: number;
    exam: number;
  };
  minimum_pass_score: number;
  maximum_subjects: number;
  compulsory_subjects: string[];
}
