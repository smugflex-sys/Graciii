<?php

/**
 * Admission Controller
 * Handles student admission operations
 */

class AdmissionController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Create new admission application
     */
    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validateAdmissionData($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            // Generate admission number
            $admissionNo = $this->generateAdmissionNumber();
            
            // Create admission record
            $sql = "INSERT INTO admissions (
                admission_no, student_name, date_of_birth, gender, parent_name, 
                parent_phone, parent_email, address, previous_school, 
                class_applied, session_id, admission_date, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $admissionNo,
                $input['student_name'],
                $input['date_of_birth'],
                $input['gender'],
                $input['parent_name'],
                $input['parent_phone'],
                $input['parent_email'] ?? null,
                $input['address'],
                $input['previous_school'] ?? null,
                $input['class_applied'],
                $input['session_id'],
                $input['admission_date'] ?? date('Y-m-d'),
                'pending'
            ]);
            
            $admissionId = $this->db->lastInsertId();
            
            // Log activity
            $this->logActivity($user['id'], 'CREATE_ADMISSION', 'admissions', $admissionId, [
                'admission_no' => $admissionNo,
                'student_name' => $input['student_name']
            ]);
            
            Response::success([
                'id' => $admissionId,
                'admission_no' => $admissionNo
            ], 'Admission application created successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to create admission: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get all admissions
     */
    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $params = $_GET;
            
            $sql = "SELECT a.*, s.name as session_name, c.name as class_name
                   FROM admissions a
                   LEFT JOIN sessions s ON a.session_id = s.id
                   LEFT JOIN classes c ON a.class_applied = c.id
                   WHERE 1=1";
            
            $bindings = [];
            
            if (!empty($params['status'])) {
                $sql .= " AND a.status = ?";
                $bindings[] = $params['status'];
            }
            
            if (!empty($params['session_id'])) {
                $sql .= " AND a.session_id = ?";
                $bindings[] = $params['session_id'];
            }
            
            if (!empty($params['search'])) {
                $sql .= " AND (a.student_name LIKE ? OR a.admission_no LIKE ? OR a.parent_name LIKE ?)";
                $searchTerm = '%' . $params['search'] . '%';
                $bindings[] = $searchTerm;
                $bindings[] = $searchTerm;
                $bindings[] = $searchTerm;
            }
            
            $sql .= " ORDER BY a.created_at DESC";
            
            // Pagination
            $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
            $offset = isset($params['offset']) ? (int)$params['offset'] : 0;
            
            $sql .= " LIMIT ? OFFSET ?";
            $bindings[] = $limit;
            $bindings[] = $offset;
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($bindings);
            $admissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($admissions, 'Admissions retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve admissions: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Approve admission
     */
    public function approve() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['admission_id'])) {
                Response::error('Admission ID is required', 400);
                return;
            }
            
            // Get admission details
            $admissionSql = "SELECT * FROM admissions WHERE id = ?";
            $admissionStmt = $this->db->prepare($admissionSql);
            $admissionStmt->execute([$input['admission_id']]);
            $admission = $admissionStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$admission) {
                Response::error('Admission not found', 404);
                return;
            }
            
            if ($admission['status'] !== 'pending') {
                Response::error('Admission has already been processed', 400);
                return;
            }
            
            // Generate registration number
            $regNo = $this->generateRegistrationNumber($admission['session_id']);
            
            // Create student record
            $studentSql = "INSERT INTO students (
                reg_no, full_name, date_of_birth, gender, class_id, session_id, 
                term_id, status, admission_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW())";
            
            $studentStmt = $this->db->prepare($studentSql);
            $studentStmt->execute([
                $regNo,
                $admission['student_name'],
                $admission['date_of_birth'],
                $admission['gender'],
                $admission['class_applied'],
                $admission['session_id'],
                $this->getCurrentTermId(),
                $admission['admission_date']
            ]);
            
            $studentId = $this->db->lastInsertId();
            
            // Update admission status
            $updateSql = "UPDATE admissions SET status = 'approved', approved_by = ?, approved_at = NOW(), student_id = ? WHERE id = ?";
            $updateStmt = $this->db->prepare($updateSql);
            $updateStmt->execute([$user['id'], $studentId, $input['admission_id']]);
            
            // Log activity
            $this->logActivity($user['id'], 'APPROVE_ADMISSION', 'admissions', $input['admission_id'], [
                'admission_no' => $admission['admission_no'],
                'student_name' => $admission['student_name'],
                'reg_no' => $regNo
            ]);
            
            Response::success([
                'student_id' => $studentId,
                'reg_no' => $regNo
            ], 'Admission approved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to approve admission: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Reject admission
     */
    public function reject() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['admission_id'])) {
                Response::error('Admission ID is required', 400);
                return;
            }
            
            if (!isset($input['reason'])) {
                Response::error('Rejection reason is required', 400);
                return;
            }
            
            // Get admission details
            $admissionSql = "SELECT * FROM admissions WHERE id = ?";
            $admissionStmt = $this->db->prepare($admissionSql);
            $admissionStmt->execute([$input['admission_id']]);
            $admission = $admissionStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$admission) {
                Response::error('Admission not found', 404);
                return;
            }
            
            if ($admission['status'] !== 'pending') {
                Response::error('Admission has already been processed', 400);
                return;
            }
            
            // Update admission status
            $sql = "UPDATE admissions SET status = 'rejected', rejection_reason = ?, rejected_by = ?, rejected_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$input['reason'], $user['id'], $input['admission_id']]);
            
            // Log activity
            $this->logActivity($user['id'], 'REJECT_ADMISSION', 'admissions', $input['admission_id'], [
                'admission_no' => $admission['admission_no'],
                'student_name' => $admission['student_name'],
                'reason' => $input['reason']
            ]);
            
            Response::success(null, 'Admission rejected successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to reject admission: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get admission statistics
     */
    public function getStatistics() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $params = $_GET;
            
            $sessionCondition = "";
            $bindings = [];
            
            if (!empty($params['session_id'])) {
                $sessionCondition = " AND session_id = ?";
                $bindings[] = $params['session_id'];
            }
            
            // Total admissions
            $totalSql = "SELECT COUNT(*) as total FROM admissions WHERE 1=1 $sessionCondition";
            $totalStmt = $this->db->prepare($totalSql);
            $totalStmt->execute($bindings);
            $stats['total_admissions'] = $totalStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // Admissions by status
            $statusSql = "SELECT status, COUNT(*) as count 
                         FROM admissions 
                         WHERE 1=1 $sessionCondition
                         GROUP BY status";
            $statusStmt = $this->db->prepare($statusSql);
            $statusStmt->execute($bindings);
            $stats['by_status'] = $statusStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Admissions by class
            $classSql = "SELECT c.name as class_name, COUNT(*) as count 
                        FROM admissions a
                        LEFT JOIN classes c ON a.class_applied = c.id
                        WHERE 1=1 $sessionCondition
                        GROUP BY a.class_applied, c.name
                        ORDER BY count DESC";
            $classStmt = $this->db->prepare($classSql);
            $classStmt->execute($bindings);
            $stats['by_class'] = $classStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Monthly admissions
            $monthlySql = "SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count 
                           FROM admissions 
                           WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
                           GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                           ORDER BY month DESC";
            $monthlyStmt = $this->db->prepare($monthlySql);
            $monthlyStmt->execute();
            $stats['monthly_admissions'] = $monthlyStmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($stats, 'Admission statistics retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve admission statistics: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Generate admission number
     */
    private function generateAdmissionNumber() {
        $year = date('Y');
        $prefix = 'ADM' . $year;
        
        $sql = "SELECT COUNT(*) as count FROM admissions WHERE admission_no LIKE ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$prefix . '%']);
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        return $prefix . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
    }
    
    /**
     * Generate registration number
     */
    private function generateRegistrationNumber($sessionId) {
        $sql = "SELECT prefix FROM sessions WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $prefix = $session['prefix'] ?? date('Y');
        
        $sql = "SELECT COUNT(*) as count FROM students WHERE reg_no LIKE ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$prefix . '%']);
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        return $prefix . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
    }
    
    /**
     * Get current term ID
     */
    private function getCurrentTermId() {
        $sql = "SELECT id FROM terms WHERE is_current = TRUE LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result['id'] ?? null;
    }
    
    /**
     * Validate admission data
     */
    private function validateAdmissionData($input) {
        $errors = [];
        
        if (!isset($input['student_name'])) {
            $errors['student_name'] = 'Student name is required';
        }
        
        if (isset($input['student_name']) && strlen(trim($input['student_name'])) < 2) {
            $errors['student_name'] = 'Student name must be at least 2 characters';
        }
        
        if (!isset($input['date_of_birth'])) {
            $errors['date_of_birth'] = 'Date of birth is required';
        }
        
        if (isset($input['date_of_birth'])) {
            $dob = DateTime::createFromFormat('Y-m-d', $input['date_of_birth']);
            if (!$dob || $dob > new DateTime()) {
                $errors['date_of_birth'] = 'Invalid date of birth';
            }
        }
        
        if (!isset($input['gender'])) {
            $errors['gender'] = 'Gender is required';
        }
        
        if (isset($input['gender']) && !in_array($input['gender'], ['male', 'female'])) {
            $errors['gender'] = 'Gender must be male or female';
        }
        
        if (!isset($input['parent_name'])) {
            $errors['parent_name'] = 'Parent name is required';
        }
        
        if (isset($input['parent_name']) && strlen(trim($input['parent_name'])) < 2) {
            $errors['parent_name'] = 'Parent name must be at least 2 characters';
        }
        
        if (!isset($input['parent_phone'])) {
            $errors['parent_phone'] = 'Parent phone is required';
        }
        
        if (isset($input['parent_phone']) && !preg_match('/^[+]?[\d\s\-()]+$/', $input['parent_phone'])) {
            $errors['parent_phone'] = 'Invalid phone number format';
        }
        
        if (isset($input['parent_email']) && !empty($input['parent_email']) && !filter_var($input['parent_email'], FILTER_VALIDATE_EMAIL)) {
            $errors['parent_email'] = 'Invalid email format';
        }
        
        if (!isset($input['address'])) {
            $errors['address'] = 'Address is required';
        }
        
        if (!isset($input['class_applied'])) {
            $errors['class_applied'] = 'Class applied for is required';
        }
        
        if (!isset($input['session_id'])) {
            $errors['session_id'] = 'Session is required';
        }
        
        return $errors;
    }
    
    /**
     * Log activity
     */
    private function logActivity($userId, $action, $tableName = null, $recordId = null, $details = null) {
        try {
            $sql = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address, user_agent) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $userId,
                $action,
                $tableName,
                $recordId,
                $details ? json_encode($details) : null,
                $_SERVER['REMOTE_ADDR'] ?? '',
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);
            
            return true;
            
        } catch (Exception $e) {
            error_log('Failed to log activity: ' . $e->getMessage());
            return false;
        }
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
