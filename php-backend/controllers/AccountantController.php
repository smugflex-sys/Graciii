<?php

/**
 * Accountant Controller
 * Handles accountant management operations
 */

class AccountantController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Get all accountants
     */
    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission('admin', $user);
            
            $params = $_GET;
            
            $sql = "SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at
                   FROM users u
                   WHERE u.role = 'accountant'";
            
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
            
            $sql .= " ORDER BY u.name";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($bindings);
            $accountants = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($accountants, 'Accountants retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve accountants: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Create a new accountant
     */
    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission('admin', $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validateAccountantData($input);
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
            
            // Create accountant
            $sql = "INSERT INTO users (role, name, email, phone, password_hash, status, created_at) 
                    VALUES ('accountant', ?, ?, ?, ?, 'active', NOW())";
            
            $password = $input['password'] ?? $this->generatePassword();
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $input['name'],
                $input['email'],
                $input['phone'] ?? null,
                $passwordHash
            ]);
            
            $accountantId = $this->db->lastInsertId();
            
            Response::success([
                'id' => $accountantId,
                'password' => $password
            ], 'Accountant created successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to create accountant: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update accountant
     */
    public function update() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'accountant'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                Response::error('Accountant ID is required', 400);
                return;
            }
            
            // Accountants can only update their own profile
            if ($user['role'] === 'accountant' && $input['id'] != $user['id']) {
                Response::error('You can only update your own profile', 403);
                return;
            }
            
            // Validation
            $errors = $this->validateAccountantData($input, true);
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
            
            $sql = "UPDATE users SET " . implode(', ', $updateData) . " WHERE id = ? AND role = 'accountant'";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($bindings);
            
            if ($stmt->rowCount() === 0) {
                Response::error('Accountant not found or no changes made', 404);
                return;
            }
            
            Response::success(null, 'Accountant updated successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to update accountant: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Delete accountant
     */
    public function delete() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission('admin', $user);
            
            $accountantId = $_GET['id'] ?? null;
            
            if (!$accountantId) {
                Response::error('Accountant ID is required', 400);
                return;
            }
            
            // Delete accountant
            $sql = "DELETE FROM users WHERE id = ? AND role = 'accountant'";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$accountantId]);
            
            if ($stmt->rowCount() === 0) {
                Response::error('Accountant not found', 404);
                return;
            }
            
            Response::success(null, 'Accountant deleted successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to delete accountant: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get financial dashboard data
     */
    public function getDashboard() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'accountant'], $user);
            
            $data = [];
            
            // Total fees expected
            $totalFeesSql = "SELECT SUM(f.amount) as total 
                           FROM fees f 
                           WHERE f.status = 'active'";
            $totalFeesStmt = $this->db->prepare($totalFeesSql);
            $totalFeesStmt->execute();
            $data['total_fees_expected'] = $totalFeesStmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;
            
            // Total payments received
            $totalPaymentsSql = "SELECT SUM(p.amount_paid) as total 
                                FROM payments p 
                                WHERE p.status = 'verified'";
            $totalPaymentsStmt = $this->db->prepare($totalPaymentsSql);
            $totalPaymentsStmt->execute();
            $data['total_payments_received'] = $totalPaymentsStmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;
            
            // Pending payments
            $pendingSql = "SELECT COUNT(*) as count, SUM(p.amount_paid) as amount 
                         FROM payments p 
                         WHERE p.status = 'pending'";
            $pendingStmt = $this->db->prepare($pendingSql);
            $pendingStmt->execute();
            $pending = $pendingStmt->fetch(PDO::FETCH_ASSOC);
            $data['pending_payments'] = [
                'count' => $pending['count'] ?? 0,
                'amount' => $pending['amount'] ?? 0
            ];
            
            // Recent payments
            $recentSql = "SELECT p.*, s.full_name as student_name, s.reg_no,
                         f.name AS fee_type, c.name as class_name
                         FROM payments p
                         LEFT JOIN students s ON p.student_id = s.id
                         LEFT JOIN fees f ON p.fee_id = f.id
                         LEFT JOIN classes c ON s.class_id = c.id
                         ORDER BY p.created_at DESC
                         LIMIT 10";
            $recentStmt = $this->db->prepare($recentSql);
            $recentStmt->execute();
            $data['recent_payments'] = $recentStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Payment statistics by month
            $statsSql = "SELECT DATE_FORMAT(p.payment_date, '%Y-%m') as month,
                        COUNT(*) as count, SUM(p.amount_paid) as total
                        FROM payments p
                        WHERE p.status = 'verified' AND p.payment_date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
                        GROUP BY DATE_FORMAT(p.payment_date, '%Y-%m')
                        ORDER BY month DESC";
            $statsStmt = $this->db->prepare($statsSql);
            $statsStmt->execute();
            $data['payment_stats'] = $statsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($data, 'Financial dashboard data retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve dashboard data: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Validate accountant data
     */
    private function validateAccountantData($input, $isUpdate = false) {
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
