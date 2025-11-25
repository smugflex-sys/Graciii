<?php

/**
 * Result Controller
 * Handles result compilation and approval operations
 */

class ResultController {
    private $db;
    private $compiledResultModel;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->compiledResultModel = new CompiledResult();
    }
    
    /**
     * Compile results for a class
     */
    public function compile() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!is_array($input)) {
                Response::error('Invalid JSON data', 400);
                return;
            }

            // Optional per-student metadata (attendance, term dates, comments, etc.)
            $studentsMetaMap = [];
            if (isset($input['students_meta']) && is_array($input['students_meta'])) {
                foreach ($input['students_meta'] as $meta) {
                    if (isset($meta['student_id'])) {
                        $studentsMetaMap[$meta['student_id']] = $meta;
                    }
                }
            }

            // Validation
            $errors = $this->validateCompilationData($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            $classId = $input['class_id'];
            $termId = $input['term_id'];
            $sessionId = $input['session_id'];
            
            // Get term and session names for denormalized storage
            $termSql = "SELECT name FROM terms WHERE id = ?";
            $termStmt = $this->db->prepare($termSql);
            $termStmt->execute([$termId]);
            $term = $termStmt->fetchColumn();
            
            $sessionSql = "SELECT name FROM sessions WHERE id = ?";
            $sessionStmt = $this->db->prepare($sessionSql);
            $sessionStmt->execute([$sessionId]);
            $academicYear = $sessionStmt->fetchColumn();
            
            // Check if results already compiled
            $existing = $this->compiledResultModel->checkExists(0, $classId, $term, $academicYear, $sessionId);
            
            if ($existing) {
                Response::error('Results already compiled for this class, term and session', 400);
                return;
            }
            
            // Get all students in the class
            $studentsSql = "SELECT s.id, s.full_name, s.reg_no 
                           FROM students s 
                           WHERE s.class_id = ? AND s.status = 'active'";
            $studentsStmt = $this->db->prepare($studentsSql);
            $studentsStmt->execute([$classId]);
            $students = $studentsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $compiledResults = [];
            
            foreach ($students as $student) {
                // Get student's scores for this term and session
                $scoresSql = "SELECT sc.score, su.subject_name, su.subject_code, su.is_core_subject
                             FROM scores sc
                             JOIN subjects su ON sc.subject_id = su.id
                             WHERE sc.student_id = ? AND sc.term_id = ? AND sc.session_id = ?
                             ORDER BY su.subject_name";
                
                $scoresStmt = $this->db->prepare($scoresSql);
                $scoresStmt->execute([$student['id'], $termId, $sessionId]);
                $scores = $scoresStmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (empty($scores)) {
                    continue; // Skip students with no scores
                }
                
                // Calculate totals and averages
                $totalScore = 0;
                $totalSubjects = count($scores);
                $coreSubjects = array_filter($scores, function($s) { return $s['is_core_subject']; });
                $coreTotal = array_sum(array_column($coreSubjects, 'score'));
                $coreCount = count($coreSubjects);
                
                foreach ($scores as $score) {
                    $totalScore += $score['score'];
                }
                
                $average = $totalScore / $totalSubjects;
                $coreAverage = $coreCount > 0 ? $coreTotal / $coreCount : 0;
                
                // Determine grade and position
                $grade = $this->calculateGrade($average);
                $position = $this->calculatePosition($student['id'], $classId, $termId, $sessionId, $average);
                
                // Compile result data
                $meta = isset($studentsMetaMap[$student['id']]) ? $studentsMetaMap[$student['id']] : [];

                $resultData = [
                    'student_id' => $student['id'],
                    'class_id' => $classId,
                    'term' => $term,
                    'academic_year' => $academicYear,
                    'session_id' => $sessionId,
                    'scores' => $scores,
                    'total_score' => $totalScore,
                    'average_score' => round($average, 2),
                    'class_average' => 0, // Will be calculated after all results
                    'position' => $position,
                    'total_students' => count($students),
                    'grade' => $grade,
                    'times_present' => $meta['times_present'] ?? 0,
                    'times_absent' => $meta['times_absent'] ?? 0,
                    'total_attendance_days' => $meta['total_attendance_days'] ?? 0,
                    'term_begin' => $meta['term_begin'] ?? null,
                    'term_end' => $meta['term_end'] ?? null,
                    'next_term_begin' => $meta['next_term_begin'] ?? null,
                    'class_teacher_name' => $meta['class_teacher_name'] ?? null,
                    'class_teacher_comment' => $meta['class_teacher_comment'] ?? null,
                    'principal_name' => $meta['principal_name'] ?? null,
                    'principal_comment' => $meta['principal_comment'] ?? null,
                    'principal_signature' => $meta['principal_signature'] ?? null,
                    'compiled_by' => $user['id'],
                    'compiled_date' => date('Y-m-d H:i:s'),
                    'status' => 'Draft'
                ];
                
                $compiledResults[] = $resultData;
            }
            
            // Calculate class averages for all results
            $classAverage = array_sum(array_column($compiledResults, 'average_score')) / count($compiledResults);
            foreach ($compiledResults as &$result) {
                $result['class_average'] = round($classAverage, 2);
            }
            
            // Create all compiled results
            $result = $this->compiledResultModel->createBulk($compiledResults);
            
            if ($result['success']) {
                Response::success([
                    'compiled_count' => count($compiledResults),
                    'results' => $compiledResults
                ], 'Results compiled successfully');
            } else {
                Response::error('Failed to compile results: ' . implode(', ', $result['errors']), 500);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to compile results: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Approve compiled results
     */
    public function approve() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['result_ids']) || !is_array($input['result_ids'])) {
                Response::error('Result IDs array is required', 400);
                return;
            }
            
            $approvedCount = 0;
            
            foreach ($input['result_ids'] as $resultId) {
                // Update result status using model
                if ($this->compiledResultModel->approve($resultId, $user['id'])) {
                    $approvedCount++;
                }
            }
            
            Response::success(['approved_count' => $approvedCount], "$approvedCount results approved successfully");
            
        } catch (Exception $e) {
            Response::error('Failed to approve results: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Reject compiled results
     */
    public function reject() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['result_ids']) || !is_array($input['result_ids'])) {
                Response::error('Result IDs array is required', 400);
                return;
            }
            
            if (!isset($input['rejection_reason']) || empty(trim($input['rejection_reason']))) {
                Response::error('Rejection reason is required', 400);
                return;
            }
            
            $rejectionReason = trim($input['rejection_reason']);
            $rejectedCount = 0;
            
            foreach ($input['result_ids'] as $resultId) {
                // Update result status using model
                if ($this->compiledResultModel->reject($resultId, $rejectionReason)) {
                    $rejectedCount++;
                }
            }
            
            Response::success(['rejected_count' => $rejectedCount], "$rejectedCount results rejected successfully");
            
        } catch (Exception $e) {
            Response::error('Failed to reject results: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get compiled results
     */
    public function getCompiled() {
        try {
            $user = JWTHandler::getCurrentUser();
            $params = $_GET;
            
            $options = [];
            
            // Apply filters based on query parameters
            if (isset($params['student_id'])) {
                $options['student_id'] = (int)$params['student_id'];
            }
            
            if (isset($params['class_id'])) {
                $options['class_id'] = (int)$params['class_id'];
            }
            
            if (isset($params['term'])) {
                $options['term'] = $params['term'];
            }
            
            if (isset($params['academic_year'])) {
                $options['academic_year'] = $params['academic_year'];
            }
            
            if (isset($params['session_id'])) {
                $options['session_id'] = (int)$params['session_id'];
            }
            
            if (isset($params['status'])) {
                $options['status'] = $params['status'];
            }
            
            // Apply filters based on user role
            if ($user['role'] === 'parent') {
                // Parents can only see their children's results
                $parentStudents = $this->getParentStudents($user['id']);
                if (empty($parentStudents)) {
                    Response::success([], 'No students found for this parent');
                    return;
                }
                $options['student_id'] = $parentStudents;
            } elseif ($user['role'] === 'teacher') {
                // Teachers can only see results for their classes
                $teacherClasses = $this->getTeacherClasses($user['id']);
                if (empty($teacherClasses)) {
                    Response::success([], 'No classes assigned to this teacher');
                    return;
                }
                $options['class_id'] = $teacherClasses;
            }
            
            $results = $this->compiledResultModel->getAll($options);
            
            Response::success($results, 'Compiled results retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to get compiled results: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get result summary
     */
    public function getSummary() {
        try {
            $user = JWTHandler::getCurrentUser();
            $classId = $_GET['class_id'] ?? null;
            $termId = $_GET['term_id'] ?? null;
            $sessionId = $_GET['session_id'] ?? null;
            
            if (!$classId || !$termId || !$sessionId) {
                Response::error('Class, term, and session IDs are required', 400);
                return;
            }
            
            // Get term and session names
            $termSql = "SELECT name FROM terms WHERE id = ?";
            $termStmt = $this->db->prepare($termSql);
            $termStmt->execute([$termId]);
            $term = $termStmt->fetchColumn();
            
            $sessionSql = "SELECT name FROM sessions WHERE id = ?";
            $sessionStmt = $this->db->prepare($sessionSql);
            $sessionStmt->execute([$sessionId]);
            $academicYear = $sessionStmt->fetchColumn();
            
            // Get summary statistics using model
            $filters = [
                'class_id' => $classId,
                'term' => $term,
                'academic_year' => $academicYear,
                'session_id' => $sessionId
            ];
            
            $summary = $this->compiledResultModel->getStats($filters);
            
            // Get grade distribution
            $gradeSql = "SELECT grade, COUNT(*) as count 
                        FROM compiled_results 
                        WHERE class_id = ? AND term = ? AND academic_year = ? AND session_id = ? AND status = 'Approved'
                        GROUP BY grade 
                        ORDER BY grade";
            
            $gradeStmt = $this->db->prepare($gradeSql);
            $gradeStmt->execute([$classId, $term, $academicYear, $sessionId]);
            $gradeDistribution = $gradeStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $summary['grade_distribution'] = $gradeDistribution;
            
            Response::success($summary, 'Result summary retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve result summary: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Calculate grade based on average score (70-based A–F scale)
     * A: 70–100, B: 60–69, C: 50–59, D: 45–49, E: 40–44, F: 0–39
     */
    private function calculateGrade($average) {
        return $this->compiledResultModel->calculateGrade($average);
    }
    
    /**
     * Calculate student position in class
     */
    private function calculatePosition($studentId, $classId, $termId, $sessionId, $studentAverage) {
        $sql = "SELECT COUNT(*) + 1 as position
                FROM compiled_results cr
                WHERE cr.class_id = ? AND cr.term_id = ? AND cr.session_id = ? 
                AND cr.average_score > ? AND cr.status = 'approved'";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$classId, $termId, $sessionId, $studentAverage]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result['position'];
    }
    
    /**
     * Validate compilation data
     */
    private function validateCompilationData($input) {
        $errors = [];
        
        if (!isset($input['class_id'])) {
            $errors['class_id'] = 'Class ID is required';
        }
        
        if (!isset($input['term_id'])) {
            $errors['term_id'] = 'Term ID is required';
        }
        
        if (!isset($input['session_id'])) {
            $errors['session_id'] = 'Session ID is required';
        }
        
        return $errors;
    }
    
    /**
     * Check user permission
     */
    private function checkPermission($allowedRoles, $user) {
        if (!in_array($user['role'], $allowedRoles)) {
            Response::error('Insufficient permissions', 403);
            exit;
        }
    }
    
    /**
     * Get parent students
     */
    private function getParentStudents($parentId) {
        $sql = "SELECT id FROM students WHERE parent_id = ? AND status = 'active'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$parentId]);
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_column($students, 'id');
    }
    
    /**
     * Get teacher classes
     */
    private function getTeacherClasses($teacherId) {
        $sql = "SELECT id FROM classes WHERE teacher_id = ? AND status = 'active'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$teacherId]);
        $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_column($classes, 'id');
    }
}
