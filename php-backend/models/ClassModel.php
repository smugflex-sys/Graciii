<?php

class ClassModel {
    private $db;
    private $table = 'classes';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($data) {
        // Normalize status to match frontend enum values
        $status = isset($data['status']) ? ucfirst(strtolower($data['status'])) : 'Active';
        
        $sql = "INSERT INTO {$this->table} 
                (name, level, class_teacher_id, capacity, status) 
                VALUES (:name, :level, :class_teacher_id, :capacity, :status)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'name' => $data['name'],
            'level' => $data['level'],
            'class_teacher_id' => $data['class_teacher_id'] ?? null,
            'capacity' => $data['capacity'] ?? 40,
            'status' => $status
        ]);
        
        return $this->db->lastInsertId();
    }

    public function findById($id) {
        $sql = "SELECT c.*, u.name as class_teacher_name, u.email as class_teacher_email 
                FROM {$this->table} c 
                LEFT JOIN users u ON c.class_teacher_id = u.id 
                WHERE c.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function getAllWithStudents($options = []) {
        $sql = "SELECT c.*, u.name as class_teacher_name, u.email as class_teacher_email,
                COUNT(s.id) as student_count,
                GROUP_CONCAT(
                    CASE WHEN s.id IS NOT NULL 
                    THEN JSON_OBJECT(
                        'id', s.id,
                        'reg_no', s.reg_no,
                        'full_name', s.full_name,
                        'gender', s.gender,
                        'status', s.status,
                        'phone', s.phone,
                        'student_id', s.student_id,
                        'level', s.level,
                        'academic_year', s.academic_year
                    )
                    END
                ) as students
                FROM {$this->table} c 
                LEFT JOIN users u ON c.class_teacher_id = u.id 
                LEFT JOIN students s ON c.id = s.class_id AND s.status IN ('Active', 'Graduated')";
        
        $params = [];
        $whereClauses = [];
        
        if (isset($options['status'])) {
            $whereClauses[] = "c.status = :status";
            $params['status'] = $options['status'];
        }
        
        if (isset($options['level'])) {
            $whereClauses[] = "c.level = :level";
            $params['level'] = $options['level'];
        }
        
        if (isset($options['class_teacher_id'])) {
            $whereClauses[] = "c.class_teacher_id = :class_teacher_id";
            $params['class_teacher_id'] = $options['class_teacher_id'];
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $sql .= " GROUP BY c.id ORDER BY c.level, c.name";
        
        if (isset($options['limit'])) {
            $sql .= " LIMIT :limit";
            $params['limit'] = (int)$options['limit'];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll();
        
        // Parse students JSON and convert to array
        foreach ($results as &$result) {
            if ($result['students']) {
                $studentsJson = '[' . str_replace('},{', '},{', $result['students']) . ']';
                $result['students'] = json_decode($studentsJson, true) ?: [];
            } else {
                $result['students'] = [];
            }
        }
        
        return $results;
    }

    public function getAll($options = []) {
        $sql = "SELECT c.*, u.name as class_teacher_name, u.email as class_teacher_email,
                COUNT(s.id) as student_count
                FROM {$this->table} c 
                LEFT JOIN users u ON c.class_teacher_id = u.id 
                LEFT JOIN students s ON c.id = s.class_id AND s.status = 'Active'";
        
        $params = [];
        $whereClauses = [];
        
        if (isset($options['status'])) {
            $whereClauses[] = "c.status = :status";
            $params['status'] = $options['status'];
        }
        
        if (isset($options['level'])) {
            $whereClauses[] = "c.level = :level";
            $params['level'] = $options['level'];
        }
        
        if (isset($options['class_teacher_id'])) {
            $whereClauses[] = "c.class_teacher_id = :class_teacher_id";
            $params['class_teacher_id'] = $options['class_teacher_id'];
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $sql .= " GROUP BY c.id ORDER BY c.level, c.name";
        
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

        $allowedFields = ['name', 'level', 'class_teacher_id', 'capacity', 'status'];
        
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

    public function getByLevel($level) {
        return $this->getAll(['level' => $level]);
    }

    public function getByTeacher($teacherId) {
        return $this->getAll(['class_teacher_id' => $teacherId]);
    }

    public function search($query, $limit = 50) {
        $sql = "SELECT c.*, u.name as class_teacher_name, 
                COUNT(s.id) as student_count
                FROM {$this->table} c 
                LEFT JOIN users u ON c.class_teacher_id = u.id 
                LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
                WHERE (c.name LIKE :query OR c.level LIKE :query) 
                GROUP BY c.id 
                ORDER BY c.level, c.name 
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'query' => "%$query%",
            'limit' => (int)$limit
        ]);
        
        return $stmt->fetchAll();
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

    public function getWithStudents($classId) {
        $sql = "SELECT c.*, u.name as class_teacher_name,
                s.id as student_id, s.reg_no, s.full_name, s.gender, s.status as student_status
                FROM {$this->table} c 
                LEFT JOIN users u ON c.class_teacher_id = u.id 
                LEFT JOIN students s ON c.id = s.class_id 
                WHERE c.id = :class_id 
                ORDER BY s.full_name";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['class_id' => $classId]);
        
        $result = $stmt->fetchAll();
        
        if (empty($result)) {
            return null;
        }
        
        // Group students by class
        $class = [
            'id' => $result[0]['id'],
            'name' => $result[0]['name'],
            'level' => $result[0]['level'],
            'class_teacher_id' => $result[0]['class_teacher_id'],
            'class_teacher_name' => $result[0]['class_teacher_name'],
            'capacity' => $result[0]['capacity'],
            'status' => $result[0]['status'],
            'students' => []
        ];
        
        foreach ($result as $row) {
            if ($row['student_id']) {
                $class['students'][] = [
                    'id' => $row['student_id'],
                    'reg_no' => $row['reg_no'],
                    'full_name' => $row['full_name'],
                    'gender' => $row['gender'],
                    'status' => $row['student_status']
                ];
            }
        }
        
        return $class;
    }

    public function getWithSubjects($classId) {
        $sql = "SELECT c.*, s.id as subject_id, s.name as subject_name, s.code as subject_code, s.is_core
                FROM {$this->table} c 
                LEFT JOIN class_subjects cs ON c.id = cs.class_id 
                LEFT JOIN subjects s ON cs.subject_id = s.id 
                WHERE c.id = :class_id AND s.status = 'active'
                ORDER BY s.name";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['class_id' => $classId]);
        
        $result = $stmt->fetchAll();
        
        if (empty($result)) {
            return null;
        }
        
        // Group subjects by class
        $class = [
            'id' => $result[0]['id'],
            'name' => $result[0]['name'],
            'level' => $result[0]['level'],
            'capacity' => $result[0]['capacity'],
            'status' => $result[0]['status'],
            'subjects' => []
        ];
        
        foreach ($result as $row) {
            if ($row['subject_id']) {
                $class['subjects'][] = [
                    'id' => $row['subject_id'],
                    'name' => $row['subject_name'],
                    'code' => $row['subject_code'],
                    'is_core' => (bool)$row['is_core']
                ];
            }
        }
        
        return $class;
    }

    public function assignSubject($classId, $subjectId) {
        $sql = "INSERT IGNORE INTO class_subjects (class_id, subject_id) VALUES (:class_id, :subject_id)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['class_id' => $classId, 'subject_id' => $subjectId]);
    }

    public function removeSubject($classId, $subjectId) {
        $sql = "DELETE FROM class_subjects WHERE class_id = :class_id AND subject_id = :subject_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['class_id' => $classId, 'subject_id' => $subjectId]);
    }

    public function getLevels() {
        $sql = "SELECT DISTINCT level FROM {$this->table} WHERE status = 'active' ORDER BY level";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
}
