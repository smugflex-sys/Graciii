<?php

/**
 * Payment Controller
 * Handles payment processing and management
 */

class PaymentController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    
    /**
     * Create a new payment
     */
    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validatePaymentData($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            // Get fee details
            $feeSql = "SELECT * FROM fees WHERE id = ?";
            $feeStmt = $this->db->prepare($feeSql);
            $feeStmt->execute([$input['fee_id']]);
            $fee = $feeStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$fee) {
                Response::error('Fee not found', 404);
                return;
            }
            
            // Check for existing payment
            $existingSql = "SELECT * FROM payments WHERE student_id = ? AND fee_id = ? AND status != 'rejected'";
            $existingStmt = $this->db->prepare($existingSql);
            $existingStmt->execute([$input['student_id'], $input['fee_id']]);
            $existingPayment = $existingStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingPayment) {
                Response::error('Payment already exists for this student and fee', 400);
                return;
            }
            
            // Insert payment
            $sql = "INSERT INTO payments (student_id, fee_id, amount_paid, payment_method, 
                    payment_date, transaction_id, status, proof_file, created_by) 
                    VALUES (?, ?, ?, ?, NOW(), ?, 'pending', ?, ?)";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $input['student_id'],
                $input['fee_id'],
                $input['amount_paid'],
                $input['payment_method'],
                $input['transaction_id'] ?? null,
                $input['proof_file'] ?? null,
                $user['id']
            ]);
            
            $paymentId = $this->db->lastInsertId();
            
            Response::success(['id' => $paymentId], 'Payment created successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to create payment: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Manual payment entry (for accountants)
     */
    public function manual() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'accountant'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validateManualPaymentData($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            // Insert manual payment as verified
            $sql = "INSERT INTO payments (student_id, fee_id, amount_paid, payment_method, 
                    payment_date, transaction_id, status, verified_by, verified_at, created_by) 
                    VALUES (?, ?, ?, ?, ?, ?, 'verified', ?, NOW(), ?)";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $input['student_id'],
                $input['fee_id'],
                $input['amount_paid'],
                $input['payment_method'],
                $input['payment_date'] ?? date('Y-m-d'),
                $input['transaction_id'] ?? null,
                $user['id'],
                $user['id']
            ]);
            
            $paymentId = $this->db->lastInsertId();
            
            Response::success(['id' => $paymentId], 'Manual payment recorded successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to record manual payment: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Verify a payment
     */
    public function verify() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'accountant'], $user);
            
            $paymentId = $_GET['id'] ?? null;
            
            if (!$paymentId) {
                Response::error('Payment ID is required', 400);
                return;
            }
            
            // Update payment status
            $sql = "UPDATE payments SET status = 'verified', verified_by = ?, verified_at = NOW() 
                    WHERE id = ? AND status = 'pending'";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$user['id'], $paymentId]);
            
            if ($stmt->rowCount() === 0) {
                Response::error('Payment not found or already processed', 404);
                return;
            }
            
            Response::success(null, 'Payment verified successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to verify payment: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get all payments
     */
    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'accountant'], $user);

            $params = $_GET;
            $conditions = [];
            $bindings = [];

            if (!empty($params['status'])) {
                $conditions[] = 'p.status = ?';
                $bindings[] = $params['status'];
            }

            if (!empty($params['student_id'])) {
                $conditions[] = 'p.student_id = ?';
                $bindings[] = $params['student_id'];
            }

            $sql = "SELECT p.*, s.full_name as student_name, s.reg_no, 
                    f.fee_type, f.amount as fee_amount, c.name as class_name,
                    u.name as created_by_name
                    FROM payments p
                    LEFT JOIN students s ON p.student_id = s.id
                    LEFT JOIN fees f ON p.fee_id = f.id
                    LEFT JOIN classes c ON s.class_id = c.id
                    LEFT JOIN users u ON p.created_by = u.id";

            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(' AND ', $conditions);
            }

            $sql .= " ORDER BY p.created_at DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($bindings);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::success($payments, 'Payments retrieved successfully');

        } catch (Exception $e) {
            Response::error('Failed to retrieve payments: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get pending payments
     */
    public function getPending() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'accountant'], $user);
            
            $sql = "SELECT p.*, s.full_name as student_name, s.reg_no, 
                    f.fee_type, f.amount as fee_amount, c.name as class_name,
                    u.name as created_by_name
                    FROM payments p
                    LEFT JOIN students s ON p.student_id = s.id
                    LEFT JOIN fees f ON p.fee_id = f.id
                    LEFT JOIN classes c ON s.class_id = c.id
                    LEFT JOIN users u ON p.created_by = u.id
                    WHERE p.status = 'pending'
                    ORDER BY p.created_at DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($payments, 'Pending payments retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve pending payments: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Upload payment proof
     */
    public function uploadProof() {
        try {
            $user = JWTHandler::getCurrentUser();
            
            if (!isset($_FILES['proof'])) {
                Response::error('Proof file is required', 400);
                return;
            }
            
            $file = $_FILES['proof'];
            
            // Validate file
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
            if (!in_array($file['type'], $allowedTypes)) {
                Response::error('Invalid file type. Only images and PDF allowed', 400);
                return;
            }
            
            if ($file['size'] > 5 * 1024 * 1024) { // 5MB limit
                Response::error('File too large. Maximum size is 5MB', 400);
                return;
            }
            
            // Generate unique filename
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'payment_' . time() . '_' . uniqid() . '.' . $extension;
            $uploadPath = __DIR__ . '/../../uploads/proofs/' . $filename;
            
            // Create directory if it doesn't exist
            if (!is_dir(dirname($uploadPath))) {
                mkdir(dirname($uploadPath), 0755, true);
            }
            
            // Move file
            if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                Response::error('Failed to upload file', 500);
                return;
            }
            
            Response::success(['filename' => $filename], 'Proof uploaded successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to upload proof: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get payments by student
     */
    public function getByStudent() {
        try {
            $user = JWTHandler::getCurrentUser();
            $studentId = $_GET['student_id'] ?? null;
            
            if (!$studentId) {
                Response::error('Student ID is required', 400);
                return;
            }
            
            // Parents can only view their own children's payments
            if ($user['role'] === 'parent') {
                $sql = "SELECT COUNT(*) as count FROM students WHERE id = ? AND parent_id = ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$studentId, $user['id']]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($result['count'] == 0) {
                    Response::error('Access denied', 403);
                    return;
                }
            }
            
            $sql = "SELECT p.*, f.fee_type, f.amount as fee_amount, f.due_date,
                    CASE WHEN p.status = 'verified' THEN 'Paid' 
                         WHEN p.status = 'pending' THEN 'Pending Verification'
                         ELSE 'Rejected' END as status_text
                    FROM payments p
                    LEFT JOIN fees f ON p.fee_id = f.id
                    WHERE p.student_id = ?
                    ORDER BY p.created_at DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$studentId]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($payments, 'Payments retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve payments: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Validate payment data
     */
    private function validatePaymentData($input) {
        $errors = [];
        
        if (!isset($input['student_id'])) {
            $errors['student_id'] = 'Student ID is required';
        }
        
        if (!isset($input['fee_id'])) {
            $errors['fee_id'] = 'Fee ID is required';
        }
        
        if (!isset($input['amount_paid']) || !is_numeric($input['amount_paid']) || $input['amount_paid'] <= 0) {
            $errors['amount_paid'] = 'Valid amount is required';
        }
        
        if (!isset($input['payment_method'])) {
            $errors['payment_method'] = 'Payment method is required';
        }
        
        return $errors;
    }
    
    /**
     * Validate manual payment data
     */
    private function validateManualPaymentData($input) {
        $errors = $this->validatePaymentData($input);
        
        if (isset($input['payment_date']) && !empty($input['payment_date'])) {
            if (!DateTime::createFromFormat('Y-m-d', $input['payment_date'])) {
                $errors['payment_date'] = 'Invalid payment date format (YYYY-MM-DD)';
            }
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
}
