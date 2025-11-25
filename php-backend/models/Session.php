<?php

class Session {
    private $db;
    private $table = 'sessions';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($data) {
        // Normalize status to match frontend enum values
        $status = isset($data['status']) ? ucfirst(strtolower($data['status'])) : 'Active';
        
        $sql = "INSERT INTO {$this->table} (name, start_date, end_date, status) 
                VALUES (:name, :start_date, :end_date, :status)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'name' => $data['name'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'status' => $status
        ]);
        return $this->db->lastInsertId();
    }

    public function findById($id) {
        $sql = "SELECT * FROM {$this->table} WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function findByName($name) {
        $sql = "SELECT * FROM {$this->table} WHERE name = :name";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['name' => $name]);
        return $stmt->fetch();
    }

    public function getAll($options = []) {
        $sql = "SELECT * FROM {$this->table}";
        $params = [];
        
        if (isset($options['status'])) {
            $sql .= " WHERE status = :status";
            $params['status'] = $options['status'];
        }
        
        $sql .= " ORDER BY created_at DESC";
        
        if (isset($options['limit'])) {
            $sql .= " LIMIT :limit";
            $params['limit'] = (int)$options['limit'];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function update($id, $data) {
        $fields = [];
        $params = ['id' => $id];

        $allowedFields = ['name', 'start_date', 'end_date', 'status'];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                // Normalize status field to match frontend enum
                $params[$field] = ($field === 'status') ? ucfirst(strtolower($data[$field])) : $data[$field];
            }
        }

        if (empty($fields)) {
            return false;
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $sql = "DELETE FROM {$this->table} WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function getActiveSession() {
        $sql = "SELECT * FROM {$this->table} WHERE status = 'Active' LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function setActive($id, $active = true) {
        // First, deactivate all sessions
        $this->db->exec("UPDATE {$this->table} SET status = 'Inactive'");
        
        // Then activate the specified session
        $status = $active ? 'Active' : 'Inactive';
        $sql = "UPDATE {$this->table} SET status = :status WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id, 'status' => $status]);
    }

    public function getWithTerms($sessionId) {
        $sql = "SELECT s.*, 
                (SELECT COUNT(*) FROM terms WHERE session_id = s.id) as terms_count,
                (SELECT COUNT(*) FROM classes WHERE session_id = s.id) as classes_count
                FROM {$this->table} s 
                WHERE s.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $sessionId]);
        return $stmt->fetch();
    }

    public function search($query, $limit = 20) {
        $sql = "SELECT * FROM {$this->table} 
                WHERE name LIKE :query 
                ORDER BY created_at DESC 
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'query' => "%$query%",
            'limit' => (int)$limit
        ]);
        
        return $stmt->fetchAll();
    }

    public function getTotalCount() {
        $sql = "SELECT COUNT(*) as count FROM {$this->table}";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch();
        return (int)$result['count'];
    }

    public function getActiveCount() {
        $sql = "SELECT COUNT(*) as count FROM {$this->table} WHERE status = 'Active'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch();
        return (int)$result['count'];
    }
}
