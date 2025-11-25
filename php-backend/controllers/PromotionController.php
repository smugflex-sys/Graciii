<?php

/**
 * Promotion Controller
 * Handles student promotion operations
 */

class PromotionController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Create bulk promotions
     */
    public function createBulk() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['promotions']) || !is_array($input['promotions'])) {
                Response::error('Promotions array is required', 400);
                return;
            }
            
            $promotions = $input['promotions'];
            $successCount = 0;
            $errors = [];
            
            foreach ($promotions as $index => $promotionData) {
                try {
                    // Validate each promotion
                    $validationErrors = $this->validatePromotionData($promotionData);
                    if (!empty($validationErrors)) {
                        $errors[] = "Promotion " . ($index + 1) . ": " . implode(', ', $validationErrors);
                        continue;
                    }
                    
                    // Check if student exists and is active
                    $studentSql = "SELECT s.*, c.name as current_class_name, c.session_id as current_session_id
                                  FROM students s
                                  LEFT JOIN classes c ON s.class_id = c.id
                                  WHERE s.id = ? AND s.status = 'active'";
                    $studentStmt = $this->db->prepare($studentSql);
                    $studentStmt->execute([$promotionData['student_id']]);
                    $student = $studentStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if (!$student) {
                        $errors[] = "Promotion " . ($index + 1) . ": Student not found or not active";
                        continue;
                    }
                    
                    // Check if student is already promoted
                    $checkSql = "SELECT COUNT(*) as count FROM promotions WHERE student_id = ? AND status = 'approved'";
                    $checkStmt = $this->db->prepare($checkSql);
                    $checkStmt->execute([$promotionData['student_id']]);
                    if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                        $errors[] = "Promotion " . ($index + 1) . ": Student has already been promoted";
                        continue;
                    }
                    
                    // Create promotion record
                    $sql = "INSERT INTO promotions (
                        student_id, from_class_id, to_class_id, from_session_id, to_session_id,
                        promotion_type, academic_performance, conduct, attendance_rate,
                        promotion_date, status, created_by, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
                    
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute([
                        $promotionData['student_id'],
                        $student['class_id'],
                        $promotionData['to_class_id'],
                        $student['session_id'],
                        $promotionData['to_session_id'],
                        $promotionData['promotion_type'] ?? 'regular',
                        $promotionData['academic_performance'] ?? null,
                        $promotionData['conduct'] ?? null,
                        $promotionData['attendance_rate'] ?? null,
                        $promotionData['promotion_date'] ?? date('Y-m-d'),
                        'pending',
                        $user['id']
                    ]);
                    
                    $successCount++;
                    
                } catch (Exception $e) {
                    $errors[] = "Promotion " . ($index + 1) . ": " . $e->getMessage();
                }
            }
            
            // Log bulk promotion activity
            $this->logActivity($user['id'], 'CREATE_BULK_PROMOTION', 'promotions', null, [
                'total_promotions' => count($promotions),
                'success_count' => $successCount,
                'error_count' => count($errors)
            ]);
            
            Response::success([
                'total_promotions' => count($promotions),
                'success_count' => $successCount,
                'error_count' => count($errors),
                'errors' => $errors
            ], 'Bulk promotion processed successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to process bulk promotion: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Create promotion
     */
    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validatePromotionData($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            // Check if student exists and is active
            $studentSql = "SELECT s.*, c.name as current_class_name, c.session_id as current_session_id
                          FROM students s
                          LEFT JOIN classes c ON s.class_id = c.id
                          WHERE s.id = ? AND s.status = 'active'";
            $studentStmt = $this->db->prepare($studentSql);
            $studentStmt->execute([$input['student_id']]);
            $student = $studentStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$student) {
                Response::error('Student not found or not active', 404);
                return;
            }
            
            // Check if student is already promoted
            $checkSql = "SELECT COUNT(*) as count FROM promotions WHERE student_id = ? AND status = 'approved'";
            $checkStmt = $this->db->prepare($checkSql);
            $checkStmt->execute([$input['student_id']]);
            if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                Response::error('Student has already been promoted', 400);
                return;
            }
            
            // Create promotion record
            $sql = "INSERT INTO promotions (
                student_id, from_class_id, to_class_id, from_session_id, to_session_id,
                promotion_type, academic_performance, conduct, attendance_rate,
                promotion_date, status, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $input['student_id'],
                $student['class_id'],
                $input['to_class_id'],
                $student['session_id'],
                $input['to_session_id'],
                $input['promotion_type'] ?? 'regular',
                $input['academic_performance'] ?? null,
                $input['conduct'] ?? null,
                $input['attendance_rate'] ?? null,
                $input['promotion_date'] ?? date('Y-m-d'),
                'pending',
                $user['id']
            ]);
            
            $promotionId = $this->db->lastInsertId();
            
            // Log activity
            $this->logActivity($user['id'], 'CREATE_PROMOTION', 'promotions', $promotionId, [
                'student_id' => $input['student_id'],
                'student_name' => $student['full_name'],
                'from_class' => $student['current_class_name'],
                'to_class_id' => $input['to_class_id']
            ]);
            
            Response::success([
                'id' => $promotionId,
                'student_name' => $student['full_name'],
                'from_class' => $student['current_class_name']
            ], 'Promotion created successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to create promotion: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get all promotions
     */
    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $params = $_GET;
            
            $sql = "SELECT p.*, s.full_name as student_name, s.reg_no,
                   fc.name as from_class_name, tc.name as to_class_name,
                   fs.name as from_session_name, ts.name as to_session_name,
                   u.name as created_by_name
                   FROM promotions p
                   LEFT JOIN students s ON p.student_id = s.id
                   LEFT JOIN classes fc ON p.from_class_id = fc.id
                   LEFT JOIN classes tc ON p.to_class_id = tc.id
                   LEFT JOIN sessions fs ON p.from_session_id = fs.id
                   LEFT JOIN sessions ts ON p.to_session_id = ts.id
                   LEFT JOIN users u ON p.created_by = u.id
                   WHERE 1=1";
            
            $bindings = [];
            
            if (!empty($params['status'])) {
                $sql .= " AND p.status = ?";
                $bindings[] = $params['status'];
            }
            
            if (!empty($params['from_session_id'])) {
                $sql .= " AND p.from_session_id = ?";
                $bindings[] = $params['from_session_id'];
            }
            
            if (!empty($params['to_session_id'])) {
                $sql .= " AND p.to_session_id = ?";
                $bindings[] = $params['to_session_id'];
            }
            
            if (!empty($params['from_class_id'])) {
                $sql .= " AND p.from_class_id = ?";
                $bindings[] = $params['from_class_id'];
            }
            
            if (!empty($params['to_class_id'])) {
                $sql .= " AND p.to_class_id = ?";
                $bindings[] = $params['to_class_id'];
            }
            
            if (!empty($params['search'])) {
                $sql .= " AND (s.full_name LIKE ? OR s.reg_no LIKE ?)";
                $searchTerm = '%' . $params['search'] . '%';
                $bindings[] = $searchTerm;
                $bindings[] = $searchTerm;
            }
            
            $sql .= " ORDER BY p.created_at DESC";
            
            // Pagination
            $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
            $offset = isset($params['offset']) ? (int)$params['offset'] : 0;
            
            $sql .= " LIMIT ? OFFSET ?";
            $bindings[] = $limit;
            $bindings[] = $offset;
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($bindings);
            $promotions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($promotions, 'Promotions retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve promotions: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Approve promotion
     */
    public function approve() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['promotion_id'])) {
                Response::error('Promotion ID is required', 400);
                return;
            }
            
            // Get promotion details
            $promotionSql = "SELECT p.*, s.full_name as student_name
                            FROM promotions p
                            LEFT JOIN students s ON p.student_id = s.id
                            WHERE p.id = ?";
            $promotionStmt = $this->db->prepare($promotionSql);
            $promotionStmt->execute([$input['promotion_id']]);
            $promotion = $promotionStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$promotion) {
                Response::error('Promotion not found', 404);
                return;
            }
            
            if ($promotion['status'] !== 'pending') {
                Response::error('Promotion has already been processed', 400);
                return;
            }
            
            // Update student class and session
            $updateStudentSql = "UPDATE students SET class_id = ?, session_id = ?, updated_at = NOW() WHERE id = ?";
            $updateStudentStmt = $this->db->prepare($updateStudentSql);
            $updateStudentStmt->execute([
                $promotion['to_class_id'],
                $promotion['to_session_id'],
                $promotion['student_id']
            ]);
            
            // Update promotion status
            $updatePromotionSql = "UPDATE promotions SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?";
            $updatePromotionStmt = $this->db->prepare($updatePromotionSql);
            $updatePromotionStmt->execute([$user['id'], $input['promotion_id']]);
            
            // Get new class name for response
            $classSql = "SELECT name FROM classes WHERE id = ?";
            $classStmt = $this->db->prepare($classSql);
            $classStmt->execute([$promotion['to_class_id']]);
            $newClass = $classStmt->fetch(PDO::FETCH_ASSOC);
            
            // Log activity
            $this->logActivity($user['id'], 'APPROVE_PROMOTION', 'promotions', $input['promotion_id'], [
                'student_id' => $promotion['student_id'],
                'student_name' => $promotion['student_name'],
                'to_class' => $newClass['name']
            ]);
            
            Response::success([
                'student_name' => $promotion['student_name'],
                'new_class' => $newClass['name']
            ], 'Promotion approved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to approve promotion: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Reject promotion
     */
    public function reject() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['promotion_id'])) {
                Response::error('Promotion ID is required', 400);
                return;
            }
            
            if (!isset($input['reason'])) {
                Response::error('Rejection reason is required', 400);
                return;
            }
            
            // Get promotion details
            $promotionSql = "SELECT p.*, s.full_name as student_name
                            FROM promotions p
                            LEFT JOIN students s ON p.student_id = s.id
                            WHERE p.id = ?";
            $promotionStmt = $this->db->prepare($promotionSql);
            $promotionStmt->execute([$input['promotion_id']]);
            $promotion = $promotionStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$promotion) {
                Response::error('Promotion not found', 404);
                return;
            }
            
            if ($promotion['status'] !== 'pending') {
                Response::error('Promotion has already been processed', 400);
                return;
            }
            
            // Update promotion status
            $sql = "UPDATE promotions SET status = 'rejected', rejection_reason = ?, rejected_by = ?, rejected_at = NOW() WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$input['reason'], $user['id'], $input['promotion_id']]);
            
            // Log activity
            $this->logActivity($user['id'], 'REJECT_PROMOTION', 'promotions', $input['promotion_id'], [
                'student_id' => $promotion['student_id'],
                'student_name' => $promotion['student_name'],
                'reason' => $input['reason']
            ]);
            
            Response::success(null, 'Promotion rejected successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to reject promotion: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get promotion statistics
     */
    public function getStatistics() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $params = $_GET;
            
            $sessionCondition = "";
            $bindings = [];
            
            if (!empty($params['session_id'])) {
                $sessionCondition = " AND (from_session_id = ? OR to_session_id = ?)";
                $bindings[] = $params['session_id'];
                $bindings[] = $params['session_id'];
            }
            
            // Total promotions
            $totalSql = "SELECT COUNT(*) as total FROM promotions WHERE 1=1 $sessionCondition";
            $totalStmt = $this->db->prepare($totalSql);
            $totalStmt->execute($bindings);
            $stats['total_promotions'] = $totalStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // Promotions by status
            $statusSql = "SELECT status, COUNT(*) as count 
                         FROM promotions 
                         WHERE 1=1 $sessionCondition
                         GROUP BY status";
            $statusStmt = $this->db->prepare($statusSql);
            $statusStmt->execute($bindings);
            $stats['by_status'] = $statusStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Promotions by type
            $typeSql = "SELECT promotion_type, COUNT(*) as count 
                       FROM promotions 
                       WHERE 1=1 $sessionCondition
                       GROUP BY promotion_type";
            $typeStmt = $this->db->prepare($typeSql);
            $typeStmt->execute($bindings);
            $stats['by_type'] = $typeStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Promotions by from class
            $fromClassSql = "SELECT fc.name as from_class_name, COUNT(*) as count 
                            FROM promotions p
                            LEFT JOIN classes fc ON p.from_class_id = fc.id
                            WHERE 1=1 $sessionCondition
                            GROUP BY p.from_class_id, fc.name
                            ORDER BY count DESC";
            $fromClassStmt = $this->db->prepare($fromClassSql);
            $fromClassStmt->execute($bindings);
            $stats['by_from_class'] = $fromClassStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Promotions by to class
            $toClassSql = "SELECT tc.name as to_class_name, COUNT(*) as count 
                          FROM promotions p
                          LEFT JOIN classes tc ON p.to_class_id = tc.id
                          WHERE 1=1 $sessionCondition
                          GROUP BY p.to_class_id, tc.name
                          ORDER BY count DESC";
            $toClassStmt = $this->db->prepare($toClassSql);
            $toClassStmt->execute($bindings);
            $stats['by_to_class'] = $toClassStmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($stats, 'Promotion statistics retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve promotion statistics: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get students eligible for promotion
     */
    public function getEligibleStudents() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $params = $_GET;
            
            if (!isset($params['from_session_id']) || !isset($params['to_session_id'])) {
                Response::error('From session and to session are required', 400);
                return;
            }
            
            $sql = "SELECT s.*, c.name as class_name, c.name as class_name,
                   COUNT(p.id) as promotion_count
                   FROM students s
                   LEFT JOIN classes c ON s.class_id = c.id
                   LEFT JOIN promotions p ON s.id = p.student_id AND p.status = 'approved'
                   WHERE s.session_id = ? AND s.status = 'active'
                   GROUP BY s.id
                   HAVING promotion_count = 0
                   ORDER BY c.name, s.full_name";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$params['from_session_id']]);
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($students, 'Eligible students retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve eligible students: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Validate promotion data
     */
    private function validatePromotionData($input) {
        $errors = [];
        
        if (!isset($input['student_id'])) {
            $errors['student_id'] = 'Student ID is required';
        }
        
        if (!isset($input['to_class_id'])) {
            $errors['to_class_id'] = 'Target class is required';
        }
        
        if (!isset($input['to_session_id'])) {
            $errors['to_session_id'] = 'Target session is required';
        }
        
        if (isset($input['attendance_rate']) && ($input['attendance_rate'] < 0 || $input['attendance_rate'] > 100)) {
            $errors['attendance_rate'] = 'Attendance rate must be between 0 and 100';
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
