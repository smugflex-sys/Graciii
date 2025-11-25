<?php

class User {
    private $db;
    private $table = 'users';

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function findByEmail($email) {
        $sql = "SELECT id, role, name, email, phone, password_hash, status, created_at, updated_at,
                employee_id, qualification, specialization, is_class_teacher, class_teacher_id,
                student_ids, occupation, address, department, employee_level,
                photo_url, date_of_birth, gender, last_login
                FROM {$this->table} 
                WHERE email = :email AND deleted_at IS NULL 
                LIMIT 1";
        
        $result = $this->db->fetchOne($sql, ['email' => strtolower($email)], [
            'decodeJson' => true,
            'formatDates' => true,
            'camelCase' => true,
            'computedFields' => ['full_name', 'age', 'status_badge']
        ]);
        
        return $result;
    }

    public function findById($id) {
        $sql = "SELECT id, role, name, email, phone, status, created_at, updated_at,
                employee_id, qualification, specialization, is_class_teacher, class_teacher_id,
                student_ids, occupation, address, department, employee_level,
                photo_url, date_of_birth, gender, last_login
                FROM {$this->table} 
                WHERE id = :id AND deleted_at IS NULL 
                LIMIT 1";
        
        $result = $this->db->fetchOne($sql, ['id' => $id], [
            'decodeJson' => true,
            'formatDates' => true,
            'camelCase' => true,
            'computedFields' => ['full_name', 'age', 'status_badge']
        ]);
        
        return $result;
    }

    public function getAll($options = []) {
        $sql = "SELECT id, role, name, email, phone, status, created_at, updated_at,
                employee_id, qualification, specialization, is_class_teacher, class_teacher_id,
                student_ids, occupation, address, department, employee_level,
                photo_url, date_of_birth, gender, last_login
                FROM {$this->table} 
                WHERE deleted_at IS NULL";
        
        $params = [];
        $whereClauses = [];
        
        // Apply filters
        if (!empty($options['role'])) {
            $whereClauses[] = "role = :role";
            $params['role'] = $options['role'];
        }
        
        if (!empty($options['status'])) {
            $whereClauses[] = "status = :status";
            $params['status'] = $options['status'];
        }
        
        if (!empty($options['search'])) {
            $whereClauses[] = "(name LIKE :search OR email LIKE :search OR employee_id LIKE :search)";
            $params['search'] = '%' . $options['search'] . '%';
        }
        
        if (!empty($whereClauses)) {
            $sql .= " AND " . implode(" AND ", $whereClauses);
        }
        
        // Apply ordering
        $sql .= " ORDER BY created_at DESC";
        
        // Apply pagination
        if (!empty($options['limit'])) {
            $sql .= " LIMIT :limit";
            $params['limit'] = (int)$options['limit'];
            
            if (!empty($options['offset'])) {
                $sql .= " OFFSET :offset";
                $params['offset'] = (int)$options['offset'];
            }
        }
        
        $results = $this->db->fetchAll($sql, $params, [
            'decodeJson' => true,
            'formatDates' => true,
            'camelCase' => true,
            'computedFields' => ['full_name', 'age', 'status_badge']
        ]);
        
        return $results;
    }

    public function getByRole($role) {
        $sql = "SELECT id, role, name, email, phone, status, created_at, updated_at,
                employee_id, qualification, specialization, is_class_teacher, class_teacher_id,
                student_ids, occupation, address, department, employee_level,
                photo_url, date_of_birth, gender
                FROM {$this->table} 
                WHERE role = :role AND deleted_at IS NULL 
                ORDER BY name ASC";
        
        $results = $this->db->fetchAll($sql, ['role' => $role], [
            'decodeJson' => true,
            'formatDates' => true,
            'camelCase' => true,
            'computedFields' => ['full_name', 'age', 'status_badge']
        ]);
        
        return $results;
    }

    public function getClassTeachers() {
        $sql = "SELECT u.*, c.name as class_name, c.level as class_level
                FROM {$this->table} u
                LEFT JOIN classes c ON u.class_teacher_id = c.id
                WHERE u.role = 'teacher' AND u.is_class_teacher = 1 AND u.deleted_at IS NULL
                ORDER BY u.name ASC";
        
        $results = $this->db->fetchAll($sql, [], [
            'decodeJson' => true,
            'formatDates' => true,
            'camelCase' => true,
            'computedFields' => ['full_name', 'age', 'status_badge']
        ]);
        
        return $results;
    }

    public function getTeachersBySubject($subjectId) {
        $sql = "SELECT DISTINCT u.*, c.name as class_name
                FROM {$this->table} u
                INNER JOIN teacher_subject_assignments tsa ON u.id = tsa.teacher_id
                LEFT JOIN classes c ON tsa.class_id = c.id
                WHERE u.role = 'teacher' AND u.deleted_at IS NULL 
                AND tsa.subject_id = :subjectId AND tsa.status = 'active'
                ORDER BY u.name ASC";
        
        $results = $this->db->fetchAll($sql, ['subjectId' => $subjectId], [
            'decodeJson' => true,
            'formatDates' => true,
            'camelCase' => true,
            'computedFields' => ['full_name', 'age', 'status_badge']
        ]);
        
        return $results;
    }

    public function getParentsByStudent($studentId) {
        $sql = "SELECT u.*, s.full_name as student_name, s.reg_no as student_reg_no
                FROM {$this->table} u
                LEFT JOIN students s ON JSON_CONTAINS(u.student_ids, JSON_QUOTE(s.id))
                WHERE u.role = 'parent' AND u.deleted_at IS NULL 
                AND (s.id = :studentId OR JSON_CONTAINS(u.student_ids, JSON_QUOTE(:studentId)))
                ORDER BY u.name ASC";
        
        $results = $this->db->fetchAll($sql, ['studentId' => $studentId], [
            'decodeJson' => true,
            'formatDates' => true,
            'camelCase' => true,
            'computedFields' => ['full_name', 'age', 'status_badge']
        ]);
        
        return $results;
    }

    public function getStats() {
        $stats = [];
        
        // Total users by role
        $sql = "SELECT role, COUNT(*) as count FROM {$this->table} WHERE deleted_at IS NULL GROUP BY role";
        $roleStats = $this->db->fetchAll($sql);
        $stats['by_role'] = array_column($roleStats, 'count', 'role');
        
        // Total users by status
        $sql = "SELECT status, COUNT(*) as count FROM {$this->table} WHERE deleted_at IS NULL GROUP BY status";
        $statusStats = $this->db->fetchAll($sql);
        $stats['by_status'] = array_column($statusStats, 'count', 'status');
        
        // Recent registrations
        $sql = "SELECT COUNT(*) as count FROM {$this->table} 
                WHERE deleted_at IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        $result = $this->db->fetchOne($sql);
        $stats['recent_registrations'] = $result['count'] ?? 0;
        
        // Active users (logged in within last 30 days)
        $sql = "SELECT COUNT(*) as count FROM {$this->table} 
                WHERE deleted_at IS NULL AND last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        $result = $this->db->fetchOne($sql);
        $stats['active_users'] = $result['count'] ?? 0;
        
        return $stats;
    }

    public function create($data) {
        $sql = "INSERT INTO {$this->table} (role, name, email, phone, password_hash, status, 
                employee_id, qualification, specialization, is_class_teacher, class_teacher_id,
                student_ids, occupation, address, department, employee_level, 
                photo_url, date_of_birth, gender) 
                VALUES (:role, :name, :email, :phone, :password_hash, :status,
                :employee_id, :qualification, :specialization, :is_class_teacher, :class_teacher_id,
                :student_ids, :occupation, :address, :department, :employee_level,
                :photo_url, :date_of_birth, :gender)";
        
        $params = [
            'role' => $data['role'],
            'name' => $data['name'] ?? $data['fullName'] ?? '',
            'email' => strtolower(trim($data['email'])),
            'phone' => $data['phone'] ?? null,
            'password_hash' => $data['password_hash'] ?? (
                isset($data['password']) ? password_hash($data['password'], PASSWORD_DEFAULT) : null
            ),
            'status' => $data['status'] ?? 'active',
            'employee_id' => $data['employeeId'] ?? null,
            'qualification' => $data['qualification'] ?? null,
            'specialization' => isset($data['specialization']) ? json_encode($data['specialization']) : null,
            'is_class_teacher' => $data['isClassTeacher'] ?? 0,
            'class_teacher_id' => $data['classTeacherId'] ?? null,
            'student_ids' => isset($data['studentIds']) ? json_encode($data['studentIds']) : null,
            'occupation' => $data['occupation'] ?? null,
            'address' => $data['address'] ?? null,
            'department' => $data['department'] ?? null,
            'employee_level' => $data['employeeLevel'] ?? null,
            'photo_url' => $data['photoUrl'] ?? null,
            'date_of_birth' => $data['dateOfBirth'] ?? null,
            'gender' => $data['gender'] ?? null
        ];
        
        $this->db->query($sql, $params);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = ['id' => $id];

        $allowedFields = [
            'name', 'email', 'phone', 'password', 'password_hash', 'status',
            'employee_id', 'qualification', 'specialization', 'is_class_teacher', 
            'class_teacher_id', 'student_ids', 'occupation', 'address', 
            'department', 'employee_level', 'photo_url', 'date_of_birth', 'gender'
        ];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[$field] = $field === 'password' ? password_hash($data[$field], PASSWORD_DEFAULT) : 
                                 ($field === 'specialization' || $field === 'student_ids' ? 
                                  json_encode($data[$field]) : $data[$field]);
            }
        }

        if (empty($fields)) {
            return false;
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $fields) . " WHERE id = :id";
        return $this->db->query($sql, $params)->rowCount() > 0;
    }

    public function delete($id, $deletedBy = null) {
        $sql = "UPDATE {$this->table} SET deleted_at = NOW(), deleted_by = :deleted_by WHERE id = :id";
        return $this->db->query($sql, ['id' => $id, 'deleted_by' => $deletedBy])->rowCount() > 0;
    }

    public function verifyPassword($user, $password) {
        if (!$user || !isset($user['password_hash'])) {
            return false;
        }
        return password_verify($password, $user['password_hash']);
    }

    public function updateLastLogin($id) {
        $sql = "UPDATE {$this->table} SET last_login = NOW() WHERE id = :id";
        return $this->db->query($sql, ['id' => $id])->rowCount() > 0;
    }

    public function search($query, $limit = 50) {
        $sql = "SELECT id, role, name, email, phone, status, employee_id
                FROM {$this->table} 
                WHERE deleted_at IS NULL 
                AND (name LIKE :query OR email LIKE :query OR employee_id LIKE :query)
                ORDER BY name ASC 
                LIMIT :limit";
        
        return $this->db->fetchAll($sql, [
            'query' => "%$query%",
            'limit' => (int)$limit
        ], [
            'camelCase' => true,
            'computedFields' => ['full_name', 'age', 'status_badge']
        ]);
    }
}
