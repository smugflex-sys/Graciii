<?php

/**
 * Teacher Assignment Controller
 * Handles CRUD operations for teacher-subject-class assignments
 */

class TeacherAssignmentController {
    private $db;
    private $model;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->model = new TeacherAssignment();
    }
    
    /**
     * Create teacher assignment(s)
     */
    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['teacher_id']) || !isset($input['assignments']) || !is_array($input['assignments'])) {
                Response::error('teacher_id and assignments array are required', 400);
                return;
            }
            
            $teacherId = $input['teacher_id'];
            $assignments = $input['assignments'];
            $termId = $input['term_id'] ?? null;
            $sessionId = $input['session_id'] ?? null;
            
            // If term/session not provided, get active ones
            if (!$termId || !$sessionId) {
                $activeSession = $this->getActiveSession();
                $activeTerm = $this->getActiveTerm($activeSession['id'] ?? null);
                
                $sessionId = $sessionId ?? $activeSession['id'] ?? 1;
                $termId = $termId ?? $activeTerm['id'] ?? 1;
            }
            
            $createdCount = 0;
            $errors = [];
            
            foreach ($assignments as $assignment) {
                if (!isset($assignment['class_id']) || !isset($assignment['subject_id'])) {
                    $errors[] = 'Each assignment must have class_id and subject_id';
                    continue;
                }
                
                // First ensure class-subject link exists
                $classModel = new ClassModel();
                $classModel->assignSubject($assignment['class_id'], $assignment['subject_id']);
                
                // Then create teacher assignment
                if (!$this->model->exists($teacherId, $assignment['class_id'], $assignment['subject_id'], $termId, $sessionId)) {
                    if ($this->model->create($teacherId, $assignment['class_id'], $assignment['subject_id'], $termId, $sessionId)) {
                        $createdCount++;
                    } else {
                        $errors[] = "Failed to create assignment for class {$assignment['class_id']}, subject {$assignment['subject_id']}";
                    }
                }
            }
            
            Response::success([
                'created_count' => $createdCount,
                'errors' => $errors
            ], "Teacher assignments created successfully");
            
        } catch (Exception $e) {
            Response::error('Failed to create teacher assignments: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get teacher assignments
     */
    public function get() {
        try {
            $user = JWTHandler::getCurrentUser();
            $params = $_GET;
            
            // Non-admins can only see their own assignments
            if ($user['role'] !== 'admin') {
                $params['teacher_id'] = $user['id'];
            }
            
            $assignments = $this->model->get($params);
            Response::success($assignments, 'Teacher assignments retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve teacher assignments: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Delete teacher assignment
     */
    public function delete() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                Response::error('Assignment ID is required', 400);
                return;
            }
            
            if ($this->model->delete($input['id'])) {
                Response::success(null, 'Teacher assignment deleted successfully');
            } else {
                Response::error('Failed to delete teacher assignment', 500);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to delete teacher assignment: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get active session
     */
    private function getActiveSession() {
        $sql = "SELECT * FROM sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }
    
    /**
     * Get active term for session
     */
    private function getActiveTerm($sessionId) {
        if (!$sessionId) return [];
        $sql = "SELECT * FROM terms WHERE session_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$sessionId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
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
}
