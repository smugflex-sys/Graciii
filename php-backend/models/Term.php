<?php

class Term {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getAll($options = []) {
        $sql = "SELECT t.*, s.name as session_name 
                FROM terms t 
                LEFT JOIN sessions s ON t.session_id = s.id 
                WHERE 1=1";
        
        $params = [];
        
        if (isset($options['session_id'])) {
            $sql .= " AND t.session_id = ?";
            $params[] = $options['session_id'];
        }
        
        if (isset($options['status'])) {
            $sql .= " AND t.status = ?";
            $params[] = $options['status'];
        }
        
        $sql .= " ORDER BY t.session_id DESC, t.name ASC";
        
        if (isset($options['limit'])) {
            $sql .= " LIMIT ?";
            $params[] = $options['limit'];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById($id) {
        $sql = "SELECT t.*, s.name as session_name 
                FROM terms t 
                LEFT JOIN sessions s ON t.session_id = s.id 
                WHERE t.id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getActive() {
        $sql = "SELECT t.*, s.name as session_name 
                FROM terms t 
                LEFT JOIN sessions s ON t.session_id = s.id 
                WHERE t.status = 'Active'";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getActiveBySession($sessionId) {
        $sql = "SELECT t.*, s.name as session_name 
                FROM terms t 
                LEFT JOIN sessions s ON t.session_id = s.id 
                WHERE t.session_id = ? AND t.status = 'Active'";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$sessionId]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getBySession($sessionId) {
        $sql = "SELECT t.*, s.name as session_name 
                FROM terms t 
                LEFT JOIN sessions s ON t.session_id = s.id 
                WHERE t.session_id = ? 
                ORDER BY t.name ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$sessionId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create($data) {
        // Normalize status to match frontend enum values
        $status = isset($data['status']) ? ucfirst(strtolower($data['status'])) : 'Active';
        
        $sql = "INSERT INTO terms (name, session_id, start_date, end_date, status) 
                VALUES (?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['session_id'],
            $data['start_date'] ?? null,
            $data['end_date'] ?? null,
            $status
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        
        $allowedFields = ['name', 'session_id', 'start_date', 'end_date', 'status'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                // Normalize status field to match frontend enum
                $params[] = ($field === 'status') ? ucfirst(strtolower($data[$field])) : $data[$field];
            }
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $params[] = $id;
        $sql = "UPDATE terms SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $sql = "DELETE FROM terms WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id]);
    }

    public function setActive($id) {
        // First, deactivate all terms in the same session
        $sessionSql = "SELECT session_id FROM terms WHERE id = ?";
        $sessionStmt = $this->db->prepare($sessionSql);
        $sessionStmt->execute([$id]);
        $session = $sessionStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$session) {
            return false;
        }
        
        $deactivateSql = "UPDATE terms SET status = 'Inactive' WHERE session_id = ?";
        $deactivateStmt = $this->db->prepare($deactivateSql);
        $deactivateStmt->execute([$session['session_id']]);
        
        // Then activate the specified term
        $activateSql = "UPDATE terms SET status = 'Active' WHERE id = ?";
        $activateStmt = $this->db->prepare($activateSql);
        return $activateStmt->execute([$id]);
    }

    public function getTotalCount($sessionId = null) {
        $sql = "SELECT COUNT(*) as total FROM terms";
        
        if ($sessionId) {
            $sql .= " WHERE session_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$sessionId]);
        } else {
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
        }
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['total'];
    }

    public function getStats() {
        $sql = "SELECT 
                    COUNT(*) as total_terms,
                    SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_terms,
                    SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as enabled_terms,
                    COUNT(DISTINCT session_id) as sessions_with_terms
                FROM terms";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function search($query, $limit = 50) {
        $sql = "SELECT t.*, s.name as session_name 
                FROM terms t 
                LEFT JOIN sessions s ON t.session_id = s.id 
                WHERE t.name LIKE ? OR s.name LIKE ?
                ORDER BY t.session_id DESC, t.name ASC
                LIMIT ?";
        
        $searchTerm = "%$query%";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$searchTerm, $searchTerm, $limit]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getWithScores($id) {
        $sql = "SELECT t.*, s.name as session_name,
                COUNT(DISTINCT sc.id) as score_count
                FROM terms t 
                LEFT JOIN sessions s ON t.session_id = s.id
                LEFT JOIN scores sc ON t.id = sc.term_id
                WHERE t.id = ?
                GROUP BY t.id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getCurrentTerm() {
        $sql = "SELECT t.*, s.name as session_name 
                FROM terms t 
                LEFT JOIN sessions s ON t.session_id = s.id 
                WHERE t.status = 'Active' AND s.status = 'Active'
                LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function validateTermDates($data) {
        $errors = [];
        
        if (isset($data['start_date']) && isset($data['end_date'])) {
            if ($data['start_date'] >= $data['end_date']) {
                $errors[] = 'Start date must be before end date';
            }
        }
        
        if (isset($data['end_date']) && isset($data['next_term_begins'])) {
            if ($data['end_date'] >= $data['next_term_begins']) {
                $errors[] = 'End date must be before next term begins date';
            }
        }
        
        return $errors;
    }
}
