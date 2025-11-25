<?php

/**
 * Fees Controller
 * Handles fee management operations
 */

class FeeController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Create a new fee
     */
    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission('admin', $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validateFeeData($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            // Map incoming name/fee_type to DB column `name`
            $feeName = $input['name'] ?? ($input['fee_type'] ?? null);
            if (!$feeName) {
                Response::validation(['name' => 'Fee name is required']);
                return;
            }

            // Insert fee
            $sql = "INSERT INTO fees (class_id, term_id, session_id, name, amount, description, due_date, status, created_by) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $input['class_id'],
                $input['term_id'],
                $input['session_id'],
                $feeName,
                $input['amount'],
                $input['description'] ?? null,
                $input['due_date'] ?? null,
                $user['id']
            ]);
            
            $feeId = $this->db->lastInsertId();
            
            Response::success(['id' => $feeId], 'Fee created successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to create fee: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get all fees
     */
    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $params = $_GET;
            
            $sql = "SELECT f.*, c.name as class_name, t.name as term_name, s.name as session_name,
                    u.name as created_by_name
                    FROM fees f
                    LEFT JOIN classes c ON f.class_id = c.id
                    LEFT JOIN terms t ON f.term_id = t.id
                    LEFT JOIN sessions s ON f.session_id = s.id
                    LEFT JOIN users u ON f.created_by = u.id
                    WHERE 1=1";
            
            $bindings = [];
            
            if (!empty($params['class'])) {
                $sql .= " AND f.class_id = ?";
                $bindings[] = $params['class'];
            }
            
            if (!empty($params['term'])) {
                $sql .= " AND f.term_id = ?";
                $bindings[] = $params['term'];
            }
            
            if (!empty($params['session'])) {
                $sql .= " AND f.session_id = ?";
                $bindings[] = $params['session'];
            }
            
            $sql .= " ORDER BY f.created_at DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($bindings);
            $fees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($fees, 'Fees retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve fees: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update a fee
     */
    public function update() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission('admin', $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                Response::error('Fee ID is required', 400);
                return;
            }
            
            // Validation
            $errors = $this->validateFeeData($input, true);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            // Map incoming name/fee_type to DB column `name`
            $feeName = $input['name'] ?? ($input['fee_type'] ?? null);

            // Update fee
            $sql = "UPDATE fees SET class_id = ?, term_id = ?, session_id = ?, name = ?, 
                    amount = ?, description = ?, due_date = ?, updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $input['class_id'],
                $input['term_id'],
                $input['session_id'],
                $feeName,
                $input['amount'],
                $input['description'] ?? null,
                $input['due_date'] ?? null,
                $input['id']
            ]);
            
            Response::success(null, 'Fee updated successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to update fee: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Delete a fee
     */
    public function delete() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission('admin', $user);
            
            $feeId = $_GET['id'] ?? null;
            
            if (!$feeId) {
                Response::error('Fee ID is required', 400);
                return;
            }
            
            // Check if fee has payments
            $sql = "SELECT COUNT(*) as payment_count FROM payments WHERE fee_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$feeId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['payment_count'] > 0) {
                Response::error('Cannot delete fee with existing payments', 400);
                return;
            }
            
            // Delete fee
            $sql = "DELETE FROM fees WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$feeId]);
            
            Response::success(null, 'Fee deleted successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to delete fee: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Validate fee data
     */
    private function validateFeeData($input, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate && !isset($input['class_id'])) {
            $errors['class_id'] = 'Class is required';
        }
        
        if (!$isUpdate && !isset($input['term_id'])) {
            $errors['term_id'] = 'Term is required';
        }
        
        if (!$isUpdate && !isset($input['session_id'])) {
            $errors['session_id'] = 'Session is required';
        }
        
        if (!isset($input['name']) && !isset($input['fee_type'])) {
            $errors['name'] = 'Fee name is required';
        }
        
        if (!isset($input['amount']) || !is_numeric($input['amount']) || $input['amount'] <= 0) {
            $errors['amount'] = 'Valid amount is required';
        }
        
        if (isset($input['due_date']) && !empty($input['due_date'])) {
            if (!DateTime::createFromFormat('Y-m-d', $input['due_date'])) {
                $errors['due_date'] = 'Invalid due date format (YYYY-MM-DD)';
            }
        }
        
        return $errors;
    }
    
    /**
     * Check user permission
     */
    private function checkPermission($requiredRole, $user) {
        if ($user['role'] !== $requiredRole && $user['role'] !== 'admin') {
            Response::error('Insufficient permissions', 403);
            exit;
        }
    }
}
