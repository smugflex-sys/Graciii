<?php

class Teacher {
    private $db;
    private $table = 'teachers';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($data) {
        $sql = "INSERT INTO {$this->table} 
                (teacher_id, first_name, last_name, employee_id, email, phone, qualification, 
                 specialization, status, is_class_teacher, class_teacher_id, user_id) 
                VALUES (:teacher_id, :first_name, :last_name, :employee_id, :email, :phone, 
                        :qualification, :specialization, :status, :is_class_teacher, :class_teacher_id, :user_id)";
        
        $stmt = $this->db->prepare($sql);
        $specializationJson = isset($data['specialization']) ? json_encode($data['specialization']) : json_encode([]);
        
        $isClassTeacher = isset($data['isClassTeacher']) ? ($data['isClassTeacher'] ? 1 : 0) : 0;
        
        $result = $stmt->execute([
            'teacher_id' => $data['teacher_id'] ?? $data['teacherId'] ?? 'TCH' . time(),
            'first_name' => $data['first_name'] ?? $data['firstName'] ?? '',
            'last_name' => $data['last_name'] ?? $data['lastName'] ?? '',
            'employee_id' => $data['employee_id'] ?? $data['employeeId'] ?? 'EMP' . time(),
            'email' => $data['email'],
            'phone' => $data['phone'],
            'qualification' => $data['qualification'] ?? '',
            'specialization' => $specializationJson,
            'status' => $data['status'] ?? 'Active',
            'is_class_teacher' => $isClassTeacher,
            'class_teacher_id' => $data['class_teacher_id'] ?? $data['classTeacherId'] ?? null,
            'user_id' => $data['user_id'] ?? null
        ]);
        
        if ($result) {
            return $this->db->lastInsertId();
        }
        return false;
    }

    public function findById($id) {
        $sql = "SELECT t.*, c.name as class_name, c.level 
                FROM {$this->table} t 
                LEFT JOIN classes c ON t.class_teacher_id = c.id 
                WHERE t.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        
        if ($result && isset($result['specialization'])) {
            $result['specialization'] = json_decode($result['specialization'], true) ?: [];
        }
        
        return $result;
    }

    public function findByTeacherId($teacherId) {
        $sql = "SELECT t.*, c.name as class_name, c.level 
                FROM {$this->table} t 
                LEFT JOIN classes c ON t.classTeacherId = c.id 
                WHERE t.teacherId = :teacherId";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['teacherId' => $teacherId]);
        $result = $stmt->fetch();
        
        if ($result && isset($result['specialization'])) {
            $result['specialization'] = json_decode($result['specialization'], true) ?: [];
        }
        
        return $result;
    }

    public function findByEmployeeId($employeeId) {
        $sql = "SELECT t.*, c.name as class_name, c.level 
                FROM {$this->table} t 
                LEFT JOIN classes c ON t.classTeacherId = c.id 
                WHERE t.employeeId = :employeeId";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['employeeId' => $employeeId]);
        $result = $stmt->fetch();
        
        if ($result && isset($result['specialization'])) {
            $result['specialization'] = json_decode($result['specialization'], true) ?: [];
        }
        
        return $result;
    }

    public function getAll($options = []) {
        $sql = "SELECT t.*, c.name as class_name, c.level 
                FROM {$this->table} t 
                LEFT JOIN classes c ON t.classTeacherId = c.id";
        
        $params = [];
        $whereClauses = [];
        
        if (isset($options['status'])) {
            $whereClauses[] = "t.status = :status";
            $params['status'] = $options['status'];
        }
        
        if (isset($options['isClassTeacher'])) {
            $whereClauses[] = "t.isClassTeacher = :isClassTeacher";
            $params['isClassTeacher'] = $options['isClassTeacher'];
        }
        
        if (isset($options['classTeacherId'])) {
            $whereClauses[] = "t.classTeacherId = :classTeacherId";
            $params['classTeacherId'] = $options['classTeacherId'];
        }
        
        if (isset($options['specialization'])) {
            $whereClauses[] = "JSON_CONTAINS(t.specialization, :specialization)";
            $params['specialization'] = json_encode([$options['specialization']]);
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $sql .= " ORDER BY t.lastName ASC, t.firstName ASC";
        
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
        
        // Decode specialization for each result
        foreach ($results as &$result) {
            if (isset($result['specialization'])) {
                $result['specialization'] = json_decode($result['specialization'], true) ?: [];
            }
        }
        
        return $results;
    }

    public function update($id, $data) {
        $fields = [];
        $params = ['id' => $id];

        $allowedFields = [
            'teacherId', 'firstName', 'lastName', 'employeeId', 'email', 'phone', 
            'qualification', 'specialization', 'status', 'isClassTeacher', 'classTeacherId'
        ];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                if ($field === 'specialization') {
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

    public function delete($id) {
        $sql = "DELETE FROM {$this->table} WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function search($query, $limit = 50) {
        $sql = "SELECT t.*, c.name as class_name, c.level 
                FROM {$this->table} t 
                LEFT JOIN classes c ON t.classTeacherId = c.id 
                WHERE (t.firstName LIKE :query OR t.lastName LIKE :query OR 
                       t.email LIKE :query OR t.employeeId LIKE :query OR 
                       t.phone LIKE :query) 
                AND t.status = 'Active'
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'query' => "%$query%",
            'limit' => (int)$limit
        ]);
        
        $results = $stmt->fetchAll();
        
        // Decode specialization for each result
        foreach ($results as &$result) {
            if (isset($result['specialization'])) {
                $result['specialization'] = json_decode($result['specialization'], true) ?: [];
            }
        }
        
        return $results;
    }

    public function getBySpecialization($specialization, $options = []) {
        return $this->getAll(array_merge(['specialization' => $specialization], $options));
    }

    public function getClassTeachers($options = []) {
        return $this->getAll(array_merge(['isClassTeacher' => true], $options));
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

    public function getAssignments($teacherId) {
        $sql = "SELECT sa.*, s.name as subject_name, c.name as class_name, c.level as class_level
                FROM teacher_subject_assignments sa
                LEFT JOIN subjects s ON sa.subject_id = s.id
                LEFT JOIN classes c ON sa.class_id = c.id
                WHERE sa.teacher_id = :teacher_id AND sa.status = 'active'
                ORDER BY c.name ASC, s.name ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['teacher_id' => $teacherId]);
        return $stmt->fetchAll();
    }
}
