<?php

/**
 * Parent Controller
 * Handles parent management operations
 */

class ParentController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Get all parents
     */
    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $params = $_GET;
            
            $sql = "SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
                   COUNT(s.id) as children_count
                   FROM users u
                   LEFT JOIN students s ON u.id = s.parent_id
                   WHERE u.role = 'parent'";
            
            $bindings = [];
            
            if (!empty($params['status'])) {
                $sql .= " AND u.status = ?";
                $bindings[] = $params['status'];
            }
            
            if (!empty($params['search'])) {
                $sql .= " AND (u.name LIKE ? OR u.email LIKE ?)";
                $searchTerm = '%' . $params['search'] . '%';
                $bindings[] = $searchTerm;
                $bindings[] = $searchTerm;
            }
            
            $sql .= " GROUP BY u.id ORDER BY u.name";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($bindings);
            $parents = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($parents, 'Parents retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve parents: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Create a new parent
     */
    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission('admin', $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validateParentData($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            // Check if email already exists
            $checkSql = "SELECT id FROM users WHERE email = ?";
            $checkStmt = $this->db->prepare($checkSql);
            $checkStmt->execute([$input['email']]);
            if ($checkStmt->fetch(PDO::FETCH_ASSOC)) {
                Response::error('Email already exists', 400);
                return;
            }
            
            // Create parent
            $sql = "INSERT INTO users (role, name, email, phone, password_hash, status, created_at) 
                    VALUES ('parent', ?, ?, ?, ?, 'active', NOW())";
            
            $password = $input['password'] ?? $this->generatePassword();
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $input['name'],
                $input['email'],
                $input['phone'] ?? null,
                $passwordHash
            ]);
            
            $parentId = $this->db->lastInsertId();
            
            // Link to students if provided
            if (!empty($input['student_ids']) && is_array($input['student_ids'])) {
                $updateSql = "UPDATE students SET parent_id = ? WHERE id IN (" . 
                            str_repeat('?,', count($input['student_ids']) - 1) . "?)";
                $updateStmt = $this->db->prepare($updateSql);
                $updateStmt->execute(array_merge([$parentId], $input['student_ids']));
            }
            
            Response::success([
                'id' => $parentId,
                'password' => $password
            ], 'Parent created successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to create parent: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update parent
     */
    public function update() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'parent'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                Response::error('Parent ID is required', 400);
                return;
            }
            
            // Parents can only update their own profile
            if ($user['role'] === 'parent' && $input['id'] != $user['id']) {
                Response::error('You can only update your own profile', 403);
                return;
            }
            
            // Validation
            $errors = $this->validateParentData($input, true);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            $updateData = [];
            $bindings = [];
            
            if (isset($input['name'])) {
                $updateData[] = 'name = ?';
                $bindings[] = $input['name'];
            }
            
            if (isset($input['phone'])) {
                $updateData[] = 'phone = ?';
                $bindings[] = $input['phone'];
            }
            
            if (isset($input['email'])) {
                // Check if email already exists for another user
                $checkSql = "SELECT id FROM users WHERE email = ? AND id != ?";
                $checkStmt = $this->db->prepare($checkSql);
                $checkStmt->execute([$input['email'], $input['id']]);
                if ($checkStmt->fetch(PDO::FETCH_ASSOC)) {
                    Response::error('Email already exists', 400);
                    return;
                }
                $updateData[] = 'email = ?';
                $bindings[] = $input['email'];
            }
            
            if (isset($input['password']) && !empty($input['password'])) {
                $updateData[] = 'password_hash = ?';
                $bindings[] = password_hash($input['password'], PASSWORD_DEFAULT);
            }
            
            if (isset($input['status']) && $user['role'] === 'admin') {
                $updateData[] = 'status = ?';
                $bindings[] = $input['status'];
            }
            
            if (empty($updateData)) {
                Response::error('No valid fields to update', 400);
                return;
            }
            
            $updateData[] = 'updated_at = NOW()';
            $bindings[] = $input['id'];
            
            $sql = "UPDATE users SET " . implode(', ', $updateData) . " WHERE id = ? AND role = 'parent'";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($bindings);
            
            if ($stmt->rowCount() === 0) {
                Response::error('Parent not found or no changes made', 404);
                return;
            }
            
            Response::success(null, 'Parent updated successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to update parent: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Delete parent
     */
    public function delete() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission('admin', $user);
            
            $parentId = $_GET['id'] ?? null;
            
            if (!$parentId) {
                Response::error('Parent ID is required', 400);
                return;
            }
            
            // Check if parent has children
            $checkSql = "SELECT COUNT(*) as children_count FROM students WHERE parent_id = ?";
            $checkStmt = $this->db->prepare($checkSql);
            $checkStmt->execute([$parentId]);
            $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['children_count'] > 0) {
                Response::error('Cannot delete parent with assigned children', 400);
                return;
            }
            
            // Delete parent
            $sql = "DELETE FROM users WHERE id = ? AND role = 'parent'";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$parentId]);
            
            if ($stmt->rowCount() === 0) {
                Response::error('Parent not found', 404);
                return;
            }
            
            Response::success(null, 'Parent deleted successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to delete parent: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get children of a parent
     */
    public function getChildren() {
        try {
            $user = JWTHandler::getCurrentUser();
            
            $parentId = $_GET['parent_id'] ?? $user['id'];
            
            // Parents can only view their own children
            if ($user['role'] === 'parent' && $parentId != $user['id']) {
                Response::error('You can only view your own children', 403);
                return;
            }
            
            $sql = "SELECT s.*, c.name as class_name, se.name as session_name, t.name as term_name
                   FROM students s
                   LEFT JOIN classes c ON s.class_id = c.id
                   LEFT JOIN sessions se ON s.session_id = se.id
                   LEFT JOIN terms t ON s.term_id = t.id
                   WHERE s.parent_id = ? AND s.status = 'active'
                   ORDER BY s.full_name";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$parentId]);
            $children = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get recent results for each child
            foreach ($children as &$child) {
                $resultSql = "SELECT cr.*, cl.name as class_name, tm.name as term_name, sn.name as session_name
                             FROM compiled_results cr
                             LEFT JOIN classes cl ON cr.class_id = cl.id
                             LEFT JOIN terms tm ON cr.term_id = tm.id
                             LEFT JOIN sessions sn ON cr.session_id = sn.id
                             WHERE cr.student_id = ? AND cr.status = 'approved'
                             ORDER BY cr.created_at DESC
                             LIMIT 3";
                
                $resultStmt = $this->db->prepare($resultSql);
                $resultStmt->execute([$child['id']]);
                $child['recent_results'] = $resultStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Get pending fees
                $feeSql = "SELECT f.*, p.status as payment_status, p.amount_paid
                          FROM fees f
                          LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ? AND p.status = 'verified'
                          WHERE f.class_id = ? AND f.status = 'active'
                          ORDER BY f.due_date";
                
                $feeStmt = $this->db->prepare($feeSql);
                $feeStmt->execute([$child['id'], $child['class_id']]);
                $child['fees'] = $feeStmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            Response::success($children, 'Parent children retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve parent children: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Validate parent data
     */
    private function validateParentData($input, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate && !isset($input['name'])) {
            $errors['name'] = 'Name is required';
        }
        
        if (isset($input['name']) && strlen(trim($input['name'])) < 2) {
            $errors['name'] = 'Name must be at least 2 characters';
        }
        
        if (!$isUpdate && !isset($input['email'])) {
            $errors['email'] = 'Email is required';
        }
        
        if (isset($input['email']) && !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Valid email is required';
        }
        
        if (isset($input['phone']) && !empty($input['phone']) && !preg_match('/^[+]?[\d\s\-()]+$/', $input['phone'])) {
            $errors['phone'] = 'Invalid phone number format';
        }
        
        if (isset($input['password']) && !empty($input['password']) && strlen($input['password']) < 6) {
            $errors['password'] = 'Password must be at least 6 characters';
        }
        
        return $errors;
    }
    
    /**
     * Generate random password
     */
    private function generatePassword() {
        return substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 8);
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
