<?php

class Fees {
    private $db;
    private $table = 'fees';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($data) {
        $sql = "INSERT INTO {$this->table} 
                (class_id, term_id, session_id, name, amount, description, due_date, status, created_by) 
                VALUES (:class_id, :term_id, :session_id, :name, :amount, :description, :due_date, :status, :created_by)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'class_id' => $data['class_id'],
            'term_id' => $data['term_id'],
            'session_id' => $data['session_id'],
            'name' => $data['name'] ?? ($data['fee_type'] ?? null),
            'amount' => $data['amount'],
            'description' => $data['description'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'status' => $data['status'] ?? 'active',
            'created_by' => $data['created_by']
        ]);
    }

    public function findById($id) {
        $sql = "SELECT f.*, c.name as class_name, c.level, t.name as term_name, s.name as session_name,
                       u.name as created_by_name
                FROM {$this->table} f
                LEFT JOIN classes c ON f.class_id = c.id
                LEFT JOIN terms t ON f.term_id = t.id
                LEFT JOIN sessions s ON f.session_id = s.id
                LEFT JOIN users u ON f.created_by = u.id
                WHERE f.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function getAll($options = []) {
        $sql = "SELECT f.*, c.name as class_name, c.level, t.name as term_name, s.name as session_name,
                       u.name as created_by_name
                FROM {$this->table} f
                LEFT JOIN classes c ON f.class_id = c.id
                LEFT JOIN terms t ON f.term_id = t.id
                LEFT JOIN sessions s ON f.session_id = s.id
                LEFT JOIN users u ON f.created_by = u.id";
        
        $params = [];
        $whereClauses = [];
        
        if (isset($options['class_id'])) {
            $whereClauses[] = "f.class_id = :class_id";
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
        
        if (isset($options['fee_type'])) {
            $whereClauses[] = "f.name = :fee_type";
            $params['fee_type'] = $options['fee_type'];
        }
        
        if (isset($options['status'])) {
            $whereClauses[] = "f.status = :status";
            $params['status'] = $options['status'];
        }
        
        if (isset($options['created_by'])) {
            $whereClauses[] = "f.created_by = :created_by";
            $params['created_by'] = $options['created_by'];
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $sql .= " ORDER BY s.name DESC, t.name ASC, c.level ASC, c.name ASC, f.name ASC";
        
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

    public function getByClass($classId, $options = []) {
        return $this->getAll(array_merge(['class_id' => $classId], $options));
    }

    public function getByTerm($termId, $options = []) {
        return $this->getAll(array_merge(['term_id' => $termId], $options));
    }

    public function getBySession($sessionId, $options = []) {
        return $this->getAll(array_merge(['session_id' => $sessionId], $options));
    }

    public function getByClassTermSession($classId, $termId, $sessionId, $options = []) {
        return $this->getAll(array_merge([
            'class_id' => $classId,
            'term_id' => $termId,
            'session_id' => $sessionId
        ], $options));
    }

    public function update($id, $data) {
        $fields = [];
        $params = ['id' => $id];

        $allowedFields = ['class_id', 'term_id', 'session_id', 'name', 'amount', 'description', 'due_date', 'status'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
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

    public function search($query, $limit = 50) {
        $sql = "SELECT f.*, c.name as class_name, c.level, t.name as term_name, s.name as session_name
                FROM {$this->table} f
                LEFT JOIN classes c ON f.class_id = c.id
                LEFT JOIN terms t ON f.term_id = t.id
                LEFT JOIN sessions s ON f.session_id = s.id
                WHERE (f.name LIKE :query OR f.description LIKE :query OR 
                       c.name LIKE :query OR t.name LIKE :query OR s.name LIKE :query)
                AND f.status = 'active'
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'query' => "%$query%",
            'limit' => (int)$limit
        ]);
        
        return $stmt->fetchAll();
    }

    public function getTotalAmount($filters = []) {
        $sql = "SELECT SUM(amount) as total FROM {$this->table} WHERE status = 'active'";
        $params = [];
        
        if (isset($filters['class_id'])) {
            $sql .= " AND class_id = :class_id";
            $params['class_id'] = $filters['class_id'];
        }
        
        if (isset($filters['term_id'])) {
            $sql .= " AND term_id = :term_id";
            $params['term_id'] = $filters['term_id'];
        }
        
        if (isset($filters['session_id'])) {
            $sql .= " AND session_id = :session_id";
            $params['session_id'] = $filters['session_id'];
        }
        
        if (isset($filters['fee_type'])) {
            $sql .= " AND name = :fee_type";
            $params['fee_type'] = $filters['fee_type'];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return (float)$result['total'];
    }

    public function getFeeTypes($options = []) {
        $sql = "SELECT DISTINCT name AS fee_type FROM {$this->table} WHERE status = 'active'";
        $params = [];
        
        if (isset($options['class_id'])) {
            $sql .= " AND class_id = :class_id";
            $params['class_id'] = $options['class_id'];
        }
        
        $sql .= " ORDER BY fee_type ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll();
        
        return array_column($results, 'fee_type');
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

    public function getActiveFeesForClass($classId, $termId, $sessionId) {
        return $this->getByClassTermSession($classId, $termId, $sessionId, ['status' => 'active']);
    }

    public function getOverdueFees() {
        $sql = "SELECT f.*, c.name as class_name, c.level, t.name as term_name, s.name as session_name
                FROM {$this->table} f
                LEFT JOIN classes c ON f.class_id = c.id
                LEFT JOIN terms t ON f.term_id = t.id
                LEFT JOIN sessions s ON f.session_id = s.id
                WHERE f.status = 'active' 
                AND f.due_date < CURDATE()
                ORDER BY f.due_date ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
