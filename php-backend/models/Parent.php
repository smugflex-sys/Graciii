<?php

class ParentModel {
    private $db;
    private $table = 'parents';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($data) {
        $sql = "INSERT INTO {$this->table} 
                (firstName, lastName, email, phone, studentIds, status) 
                VALUES (:firstName, :lastName, :email, :phone, :studentIds, :status)";
        
        $stmt = $this->db->prepare($sql);
        $studentIdsJson = isset($data['studentIds']) ? 
            (is_array($data['studentIds']) ? json_encode($data['studentIds']) : $data['studentIds']) 
            : json_encode([]);
        
        return $stmt->execute([
            'firstName' => $data['firstName'],
            'lastName' => $data['lastName'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'],
            'studentIds' => $studentIdsJson,
            'status' => $data['status'] ?? 'Active'
        ]);
    }

    public function findById($id) {
        $sql = "SELECT p.*, 
                       (SELECT GROUP_CONCAT(CONCAT(s.firstName, ' ', s.lastName, ' (', s.admissionNumber, ')') 
                         SEPARATOR '; ') 
                        FROM students s 
                        WHERE JSON_CONTAINS(p.studentIds, CAST(s.id AS JSON))) as student_names
                FROM {$this->table} p 
                WHERE p.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        
        if ($result && isset($result['studentIds'])) {
            $result['studentIds'] = json_decode($result['studentIds'], true) ?: [];
        }
        
        return $result;
    }

    public function findByPhone($phone) {
        $sql = "SELECT p.*, 
                       (SELECT GROUP_CONCAT(CONCAT(s.firstName, ' ', s.lastName, ' (', s.admissionNumber, ')') 
                         SEPARATOR '; ') 
                        FROM students s 
                        WHERE JSON_CONTAINS(p.studentIds, CAST(s.id AS JSON))) as student_names
                FROM {$this->table} p 
                WHERE p.phone = :phone";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['phone' => $phone]);
        $result = $stmt->fetch();
        
        if ($result && isset($result['studentIds'])) {
            $result['studentIds'] = json_decode($result['studentIds'], true) ?: [];
        }
        
        return $result;
    }

    public function findByEmail($email) {
        $sql = "SELECT p.*, 
                       (SELECT GROUP_CONCAT(CONCAT(s.firstName, ' ', s.lastName, ' (', s.admissionNumber, ')') 
                         SEPARATOR '; ') 
                        FROM students s 
                        WHERE JSON_CONTAINS(p.studentIds, CAST(s.id AS JSON))) as student_names
                FROM {$this->table} p 
                WHERE p.email = :email";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['email' => $email]);
        $result = $stmt->fetch();
        
        if ($result && isset($result['studentIds'])) {
            $result['studentIds'] = json_decode($result['studentIds'], true) ?: [];
        }
        
        return $result;
    }

    public function getAll($options = []) {
        $sql = "SELECT p.*, 
                       (SELECT GROUP_CONCAT(CONCAT(s.firstName, ' ', s.lastName, ' (', s.admissionNumber, ')') 
                         SEPARATOR '; ') 
                        FROM students s 
                        WHERE JSON_CONTAINS(p.studentIds, CAST(s.id AS JSON))) as student_names
                FROM {$this->table} p";
        
        $params = [];
        $whereClauses = [];
        
        if (isset($options['status'])) {
            $whereClauses[] = "p.status = :status";
            $params['status'] = $options['status'];
        }
        
        if (isset($options['phone'])) {
            $whereClauses[] = "p.phone = :phone";
            $params['phone'] = $options['phone'];
        }
        
        if (isset($options['email'])) {
            $whereClauses[] = "p.email = :email";
            $params['email'] = $options['email'];
        }
        
        if (isset($options['studentId'])) {
            $whereClauses[] = "JSON_CONTAINS(p.studentIds, :studentId)";
            $params['studentId'] = json_encode([$options['studentId']]);
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $sql .= " ORDER BY p.lastName ASC, p.firstName ASC";
        
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
        $results = $stmt->fetchAll();
        
        // Decode studentIds for each result
        foreach ($results as &$result) {
            if (isset($result['studentIds'])) {
                $result['studentIds'] = json_decode($result['studentIds'], true) ?: [];
            }
        }
        
        return $results;
    }

    public function update($id, $data) {
        $fields = [];
        $params = ['id' => $id];

        $allowedFields = ['firstName', 'lastName', 'email', 'phone', 'studentIds', 'status'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                if ($field === 'studentIds') {
                    $fields[] = "$field = :$field";
                    $params[$field] = is_array($data[$field]) ? json_encode($data[$field]) : $data[$field];
                } else {
                    $fields[] = "$field = :$field";
                    $params[$field] = $data[$field];
                }
            }
        }

        if (empty($fields)) {
            return false;
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function addStudent($parentId, $studentId) {
        $parent = $this->findById($parentId);
        if (!$parent) {
            return false;
        }
        
        $studentIds = $parent['studentIds'] ?? [];
        if (!in_array($studentId, $studentIds)) {
            $studentIds[] = $studentId;
            return $this->update($parentId, ['studentIds' => $studentIds]);
        }
        
        return true; // Student already associated
    }

    public function removeStudent($parentId, $studentId) {
        $parent = $this->findById($parentId);
        if (!$parent) {
            return false;
        }
        
        $studentIds = $parent['studentIds'] ?? [];
        $key = array_search($studentId, $studentIds);
        if ($key !== false) {
            unset($studentIds[$key]);
            $studentIds = array_values($studentIds); // Re-index array
            return $this->update($parentId, ['studentIds' => $studentIds]);
        }
        
        return true; // Student not found in list
    }

    public function delete($id) {
        $sql = "DELETE FROM {$this->table} WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function search($query, $limit = 50) {
        $sql = "SELECT p.*, 
                       (SELECT GROUP_CONCAT(CONCAT(s.firstName, ' ', s.lastName, ' (', s.admissionNumber, ')') 
                         SEPARATOR '; ') 
                        FROM students s 
                        WHERE JSON_CONTAINS(p.studentIds, CAST(s.id AS JSON))) as student_names
                FROM {$this->table} p 
                WHERE (p.firstName LIKE :query OR p.lastName LIKE :query OR 
                       p.email LIKE :query OR p.phone LIKE :query) 
                AND p.status = 'Active'
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'query' => "%$query%",
            'limit' => (int)$limit
        ]);
        
        $results = $stmt->fetchAll();
        
        // Decode studentIds for each result
        foreach ($results as &$result) {
            if (isset($result['studentIds'])) {
                $result['studentIds'] = json_decode($result['studentIds'], true) ?: [];
            }
        }
        
        return $results;
    }

    public function getByStudent($studentId, $options = []) {
        return $this->getAll(array_merge(['studentId' => $studentId], $options));
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

    public function getStudentsByParent($parentId) {
        $parent = $this->findById($parentId);
        if (!$parent || empty($parent['studentIds'])) {
            return [];
        }
        
        $studentIds = $parent['studentIds'];
        if (empty($studentIds)) {
            return [];
        }
        
        $placeholders = str_repeat('?,', count($studentIds) - 1) . '?';
        $sql = "SELECT s.*, c.name as className, c.level 
                FROM students s 
                LEFT JOIN classes c ON s.classId = c.id 
                WHERE s.id IN ($placeholders) 
                ORDER BY s.lastName ASC, s.firstName ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($studentIds);
        return $stmt->fetchAll();
    }
}
