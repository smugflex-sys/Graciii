<?php

class Subject {
    private $db;
    private $table = 'subjects';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($data) {
        // Normalize status to match frontend enum values
        $status = isset($data['status']) ? ucfirst(strtolower($data['status'])) : 'Active';
        
        $sql = "INSERT INTO {$this->table} (name, code, department, credit_units, description, is_core, status) 
                VALUES (:name, :code, :department, :credit_units, :description, :is_core, :status)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'department' => $data['department'] ?? 'General',
            'credit_units' => $data['credit_units'] ?? 1,
            'description' => $data['description'] ?? null,
            'is_core' => $data['is_core'] ?? true,
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

    public function findByCode($code) {
        $sql = "SELECT * FROM {$this->table} WHERE code = :code";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['code' => $code]);
        return $stmt->fetch();
    }

    public function getAll($options = []) {
        $sql = "SELECT * FROM {$this->table}";
        $params = [];
        $whereClauses = [];
        
        if (isset($options['status'])) {
            $whereClauses[] = "status = :status";
            $params['status'] = $options['status'];
        }
        
        if (isset($options['is_core'])) {
            $whereClauses[] = "is_core = :is_core";
            $params['is_core'] = $options['is_core'];
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $sql .= " ORDER BY name ASC";
        
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

        $allowedFields = ['name', 'code', 'department', 'credit_units', 'description', 'is_core', 'status'];
        
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

    public function getCoreSubjects() {
        return $this->getAll(['is_core' => true, 'status' => 'Active']);
    }

    public function getElectiveSubjects() {
        return $this->getAll(['is_core' => false, 'status' => 'Active']);
    }

    public function search($query, $limit = 50) {
        $sql = "SELECT * FROM {$this->table} 
                WHERE (name LIKE :query OR code LIKE :query) 
                ORDER BY name ASC 
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

    public function getWithClasses($subjectId) {
        $sql = "SELECT s.*, c.id as class_id, c.name as class_name, c.level
                FROM {$this->table} s 
                LEFT JOIN class_subjects cs ON s.id = cs.subject_id 
                LEFT JOIN classes c ON cs.class_id = c.id 
                WHERE s.id = :subject_id AND c.status = 'Active'
                ORDER BY c.level, c.name";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['subject_id' => $subjectId]);
        
        $result = $stmt->fetchAll();
        
        if (empty($result)) {
            return null;
        }
        
        // Group classes by subject
        $subject = [
            'id' => $result[0]['id'],
            'name' => $result[0]['name'],
            'code' => $result[0]['code'],
            'is_core' => (bool)$result[0]['is_core'],
            'status' => $result[0]['status'],
            'classes' => []
        ];
        
        foreach ($result as $row) {
            if ($row['class_id']) {
                $subject['classes'][] = [
                    'id' => $row['class_id'],
                    'name' => $row['class_name'],
                    'level' => $row['level']
                ];
            }
        }
        
        return $subject;
    }

    public function assignToClass($subjectId, $classId) {
        $sql = "INSERT IGNORE INTO class_subjects (class_id, subject_id) VALUES (:class_id, :subject_id)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['class_id' => $classId, 'subject_id' => $subjectId]);
    }

    public function removeFromClass($subjectId, $classId) {
        $sql = "DELETE FROM class_subjects WHERE class_id = :class_id AND subject_id = :subject_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['class_id' => $classId, 'subject_id' => $subjectId]);
    }

    public function getSubjectsNotInClass($classId) {
        $sql = "SELECT s.* FROM {$this->table} s 
                WHERE s.status = 'Active' AND s.id NOT IN (
                    SELECT subject_id FROM class_subjects WHERE class_id = :class_id
                ) ORDER BY s.name";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['class_id' => $classId]);
        return $stmt->fetchAll();
    }

    public function getStats() {
        $sql = "SELECT 
                    COUNT(*) as total_subjects,
                    SUM(CASE WHEN is_core = TRUE THEN 1 ELSE 0 END) as core_subjects,
                    SUM(CASE WHEN is_core = FALSE THEN 1 ELSE 0 END) as elective_subjects,
                    SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_subjects
                FROM {$this->table}";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetch();
    }

    // Teacher Assignment Methods
    
    public function assignToTeacher($subjectId, $teacherId, $classId = null, $options = []) {
        $sql = "INSERT INTO teacher_subject_assignments 
                (teacher_id, subject_id, class_id, academic_year, term, is_primary_teacher, status) 
                VALUES (:teacher_id, :subject_id, :class_id, :academic_year, :term, :is_primary_teacher, :status)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'teacher_id' => $teacherId,
            'subject_id' => $subjectId,
            'class_id' => $classId,
            'academic_year' => $options['academic_year'] ?? null,
            'term' => $options['term'] ?? null,
            'is_primary_teacher' => $options['is_primary_teacher'] ?? false,
            'status' => 'Active'
        ]);
    }

    public function removeTeacherAssignment($subjectId, $teacherId, $classId = null) {
        $sql = "DELETE FROM teacher_subject_assignments 
                WHERE subject_id = :subject_id AND teacher_id = :teacher_id AND (class_id = :class_id OR class_id IS NULL)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'subject_id' => $subjectId,
            'teacher_id' => $teacherId,
            'class_id' => $classId
        ]);
    }

    public function getWithTeachers($subjectId, $classId = null) {
        $sql = "SELECT s.*, 
                       u.id as teacher_id, u.name as teacher_name, u.email as teacher_email,
                       tsa.class_id, tsa.is_primary_teacher, tsa.status as assignment_status
                FROM {$this->table} s 
                LEFT JOIN teacher_subject_assignments tsa ON s.id = tsa.subject_id 
                LEFT JOIN users u ON tsa.teacher_id = u.id AND u.role = 'teacher'
                WHERE s.id = :subject_id 
                AND (tsa.class_id = :class_id OR tsa.class_id IS NULL OR :class_id IS NULL)
                AND tsa.status = 'Active'
                ORDER BY u.name";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'subject_id' => $subjectId,
            'class_id' => $classId
        ]);
        
        $result = $stmt->fetchAll();
        
        if (empty($result)) {
            return null;
        }
        
        // Group teachers by subject
        $subject = [
            'id' => $result[0]['id'],
            'name' => $result[0]['name'],
            'code' => $result[0]['code'],
            'department' => $result[0]['department'],
            'credit_units' => $result[0]['credit_units'],
            'description' => $result[0]['description'],
            'is_core' => (bool)$result[0]['is_core'],
            'status' => $result[0]['status'],
            'teachers' => []
        ];
        
        foreach ($result as $row) {
            if ($row['teacher_id']) {
                $subject['teachers'][] = [
                    'id' => $row['teacher_id'],
                    'name' => $row['teacher_name'],
                    'email' => $row['teacher_email'],
                    'class_id' => $row['class_id'],
                    'is_primary_teacher' => (bool)$row['is_primary_teacher'],
                    'assignment_status' => $row['assignment_status']
                ];
            }
        }
        
        return $subject;
    }

    public function getTeacherSubjects($teacherId, $options = []) {
        $sql = "SELECT s.*, tsa.class_id, tsa.is_primary_teacher, c.name as class_name, c.level
                FROM {$this->table} s 
                INNER JOIN teacher_subject_assignments tsa ON s.id = tsa.subject_id 
                LEFT JOIN classes c ON tsa.class_id = c.id
                WHERE tsa.teacher_id = :teacher_id AND tsa.status = 'Active'";
        
        $params = ['teacher_id' => $teacherId];
        
        if (isset($options['class_id'])) {
            $sql .= " AND (tsa.class_id = :class_id OR tsa.class_id IS NULL)";
            $params['class_id'] = $options['class_id'];
        }
        
        if (isset($options['academic_year'])) {
            $sql .= " AND (tsa.academic_year = :academic_year OR tsa.academic_year IS NULL)";
            $params['academic_year'] = $options['academic_year'];
        }
        
        if (isset($options['term'])) {
            $sql .= " AND (tsa.term = :term OR tsa.term IS NULL)";
            $params['term'] = $options['term'];
        }
        
        $sql .= " ORDER BY s.name";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getSubjectsByDepartment($department) {
        $sql = "SELECT * FROM {$this->table} 
                WHERE department = :department AND status = 'Active'
                ORDER BY name";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['department' => $department]);
        return $stmt->fetchAll();
    }

    public function getDepartmentStats() {
        $sql = "SELECT 
                    department,
                    COUNT(*) as total_subjects,
                    SUM(CASE WHEN is_core = TRUE THEN 1 ELSE 0 END) as core_subjects,
                    SUM(CASE WHEN is_core = FALSE THEN 1 ELSE 0 END) as elective_subjects,
                    SUM(credit_units) as total_credit_units
                FROM {$this->table}
                WHERE status = 'Active'
                GROUP BY department
                ORDER BY department";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
