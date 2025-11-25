<?php

class Payment {
    private $db;
    private $table = 'payments';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($data) {
        $sql = "INSERT INTO {$this->table} 
                (student_id, fee_id, amount_paid, payment_method, payment_date, 
                 transaction_id, status, notes, created_at) 
                VALUES (:student_id, :fee_id, :amount_paid, :payment_method, :payment_date, 
                        :transaction_id, :status, :notes, NOW())";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'student_id' => $data['student_id'],
            'fee_id' => $data['fee_id'],
            'amount_paid' => $data['amount_paid'],
            'payment_method' => $data['payment_method'] ?? null,
            'payment_date' => $data['payment_date'] ?? date('Y-m-d'),
            'transaction_id' => $data['transaction_id'] ?? null,
            'status' => $data['status'] ?? 'pending',
            'notes' => $data['notes'] ?? null
        ]);
    }

    public function findById($id) {
        $sql = "SELECT p.*, s.full_name, s.reg_no,
                       f.name as fee_name, f.amount as fee_amount,
                       c.name as class_name, c.level, t.name as term_name, sess.name as session_name,
                       u1.name as verified_by_name
                FROM {$this->table} p
                LEFT JOIN students s ON p.student_id = s.id
                LEFT JOIN fees f ON p.fee_id = f.id
                LEFT JOIN classes c ON s.class_id = c.id
                LEFT JOIN terms t ON f.term_id = t.id
                LEFT JOIN sessions sess ON f.session_id = sess.id
                LEFT JOIN users u1 ON p.verified_by = u1.id
                WHERE p.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function getAll($options = []) {
        $sql = "SELECT p.*, s.firstName, s.lastName, s.admissionNumber, s.className,
                       f.fee_type, f.amount as fee_amount, f.description as fee_description,
                       c.name as class_name, c.level, t.name as term_name, sess.name as session_name,
                       u1.name as created_by_name, u2.name as verified_by_name
                FROM {$this->table} p
                LEFT JOIN students s ON p.student_id = s.id
                LEFT JOIN fees f ON p.fee_id = f.id
                LEFT JOIN classes c ON s.classId = c.id
                LEFT JOIN terms t ON f.term_id = t.id
                LEFT JOIN sessions sess ON f.session_id = sess.id
                LEFT JOIN users u1 ON p.created_by = u1.id
                LEFT JOIN users u2 ON p.verified_by = u2.id";
        
        $params = [];
        $whereClauses = [];
        
        if (isset($options['student_id'])) {
            $whereClauses[] = "p.student_id = :student_id";
            $params['student_id'] = $options['student_id'];
        }
        
        if (isset($options['fee_id'])) {
            $whereClauses[] = "p.fee_id = :fee_id";
            $params['fee_id'] = $options['fee_id'];
        }
        
        if (isset($options['status'])) {
            $whereClauses[] = "p.status = :status";
            $params['status'] = $options['status'];
        }
        
        if (isset($options['payment_method'])) {
            $whereClauses[] = "p.payment_method = :payment_method";
            $params['payment_method'] = $options['payment_method'];
        }
        
        if (isset($options['class_id'])) {
            $whereClauses[] = "s.classId = :class_id";
            $params['class_id'] = $options['class_id'];
        }
        
        if (isset($options['term_id'])) {
            $whereClauses[] = "f.term_id = :term_id";
            $params['term_id'] = $options['term_id'];
        }
        
        if (isset($options['session_id'])) {
            $whereClauses[] = "f.session_id = :session_id";
            $params['session_id'] = $options['session_id'];
        }
        
        if (isset($options['created_by'])) {
            $whereClauses[] = "p.created_by = :created_by";
            $params['created_by'] = $options['created_by'];
        }
        
        if (isset($options['verified_by'])) {
            $whereClauses[] = "p.verified_by = :verified_by";
            $params['verified_by'] = $options['verified_by'];
        }
        
        if (isset($options['date_from'])) {
            $whereClauses[] = "p.payment_date >= :date_from";
            $params['date_from'] = $options['date_from'];
        }
        
        if (isset($options['date_to'])) {
            $whereClauses[] = "p.payment_date <= :date_to";
            $params['date_to'] = $options['date_to'];
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $sql .= " ORDER BY p.payment_date DESC, p.created_at DESC";
        
        if (isset($options['limit'])) {
            $sql .= " LIMIT :limit";
            $params['limit'] = (int)$options['limit'];
        }
        
        if (isset($options['offset'])) {
            $sql .= " OFFSET :offset";
            $params['offset'] = (int)$options['offset'];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getByStudent($studentId, $options = []) {
        return $this->getAll(array_merge(['student_id' => $studentId], $options));
    }

    public function getByFee($feeId, $options = []) {
        return $this->getAll(array_merge(['fee_id' => $feeId], $options));
    }

    public function getByStatus($status, $options = []) {
        return $this->getAll(array_merge(['status' => $status], $options));
    }

    public function update($id, $data) {
        $fields = [];
        $params = ['id' => $id];

        $allowedFields = ['amount_paid', 'payment_method', 'payment_date', 'transaction_id', 'status', 'proof_file'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
            }
        }

        // Handle verification fields
        if (isset($data['verified_by'])) {
            $fields[] = "verified_by = :verified_by";
            $params['verified_by'] = $data['verified_by'];
        }
        
        if (isset($data['verified_at'])) {
            $fields[] = "verified_at = :verified_at";
            $params['verified_at'] = $data['verified_at'];
        }

        if (empty($fields)) {
            return false;
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function verify($id, $verifiedBy, $status = 'verified') {
        return $this->update($id, [
            'status' => $status,
            'verified_by' => $verifiedBy,
            'verified_at' => date('Y-m-d H:i:s')
        ]);
    }

    public function reject($id, $verifiedBy, $rejectionReason = null) {
        $this->db->beginTransaction();
        try {
            // Update payment status
            $success = $this->update($id, [
                'status' => 'rejected',
                'verified_by' => $verifiedBy,
                'verified_at' => date('Y-m-d H:i:s')
            ]);
            
            if ($success && $rejectionReason) {
                // Add rejection reason to payment record (you might need to add a rejection_reason column)
                $sql = "UPDATE {$this->table} SET transaction_id = CONCAT(IFNULL(transaction_id, ''), ' - Rejected: :reason') WHERE id = :id";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    'reason' => $rejectionReason,
                    'id' => $id
                ]);
            }
            
            $this->db->commit();
            return $success;
        } catch (Exception $e) {
            $this->db->rollback();
            return false;
        }
    }

    public function delete($id) {
        $sql = "DELETE FROM {$this->table} WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function search($query, $limit = 50) {
        $sql = "SELECT p.*, s.firstName, s.lastName, s.admissionNumber, s.className,
                       f.fee_type, f.amount as fee_amount, c.name as class_name, c.level
                FROM {$this->table} p
                LEFT JOIN students s ON p.student_id = s.id
                LEFT JOIN fees f ON p.fee_id = f.id
                LEFT JOIN classes c ON s.classId = c.id
                WHERE (p.transaction_id LIKE :query OR s.firstName LIKE :query OR s.lastName LIKE :query OR 
                       s.admissionNumber LIKE :query OR f.fee_type LIKE :query OR c.name LIKE :query)
                ORDER BY p.payment_date DESC
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'query' => "%$query%",
            'limit' => (int)$limit
        ]);
        
        return $stmt->fetchAll();
    }

    public function getTotalPaid($filters = []) {
        $sql = "SELECT SUM(amount_paid) as total FROM {$this->table} WHERE status = 'verified'";
        $params = [];
        
        if (isset($filters['student_id'])) {
            $sql .= " AND student_id = :student_id";
            $params['student_id'] = $filters['student_id'];
        }
        
        if (isset($filters['fee_id'])) {
            $sql .= " AND fee_id = :fee_id";
            $params['fee_id'] = $filters['fee_id'];
        }
        
        if (isset($filters['class_id'])) {
            $sql .= " AND student_id IN (SELECT id FROM students WHERE classId = :class_id)";
            $params['class_id'] = $filters['class_id'];
        }
        
        if (isset($filters['date_from'])) {
            $sql .= " AND payment_date >= :date_from";
            $params['date_from'] = $filters['date_from'];
        }
        
        if (isset($filters['date_to'])) {
            $sql .= " AND payment_date <= :date_to";
            $params['date_to'] = $filters['date_to'];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return (float)$result['total'];
    }

    public function getPendingPayments($options = []) {
        return $this->getAll(array_merge(['status' => 'pending'], $options));
    }

    public function getVerifiedPayments($options = []) {
        return $this->getAll(array_merge(['status' => 'verified'], $options));
    }

    public function getRejectedPayments($options = []) {
        return $this->getAll(array_merge(['status' => 'rejected'], $options));
    }

    public function getPaymentStats($filters = []) {
        $sql = "SELECT 
                    COUNT(*) as total_payments,
                    SUM(CASE WHEN status = 'verified' THEN amount_paid ELSE 0 END) as verified_total,
                    SUM(CASE WHEN status = 'pending' THEN amount_paid ELSE 0 END) as pending_total,
                    SUM(CASE WHEN status = 'rejected' THEN amount_paid ELSE 0 END) as rejected_total,
                    COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_count,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
                FROM {$this->table}";
        
        $params = [];
        $whereClauses = [];
        
        if (isset($filters['student_id'])) {
            $whereClauses[] = "student_id = :student_id";
            $params['student_id'] = $filters['student_id'];
        }
        
        if (isset($filters['class_id'])) {
            $whereClauses[] = "student_id IN (SELECT id FROM students WHERE classId = :class_id)";
            $params['class_id'] = $filters['class_id'];
        }
        
        if (isset($filters['date_from'])) {
            $whereClauses[] = "payment_date >= :date_from";
            $params['date_from'] = $filters['date_from'];
        }
        
        if (isset($filters['date_to'])) {
            $whereClauses[] = "payment_date <= :date_to";
            $params['date_to'] = $filters['date_to'];
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }

    public function getTotalCount($status = null) {
        $sql = "SELECT COUNT(*) as count FROM {$this->table}";
        $params = [];
        
        if ($status) {
            $sql .= " WHERE status = :status";
            $params['status'] = $status;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return (int)$result['count'];
    }
}
