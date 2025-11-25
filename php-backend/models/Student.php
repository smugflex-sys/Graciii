<?php

class Student {
    private $db;
    private $table = 'students';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($data) {
        $sql = "INSERT INTO {$this->table} 
                (reg_no, full_name, class_id, parent_id, gender, dob, phone, photo_path, status, student_id, level, academic_year) 
                VALUES (:reg_no, :full_name, :class_id, :parent_id, :gender, :dob, :phone, :photo_path, :status, :student_id, :level, :academic_year)";
        
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            'reg_no' => $data['reg_no'] ?? $data['admissionNumber'] ?? 'REG' . time(),
            'full_name' => $data['full_name'] ?? (
                isset($data['firstName']) && isset($data['lastName']) 
                ? $data['firstName'] . ' ' . $data['lastName'] 
                : ($data['fullName'] ?? 'Unknown Student')
            ),
            'class_id' => $data['class_id'] ?? $data['classId'] ?? null,
            'parent_id' => $data['parent_id'] ?? $data['parentId'] ?? null,
            'gender' => $data['gender'] ?? null,
            'dob' => $data['dob'] ?? $data['dateOfBirth'] ?? null,
            'phone' => $data['phone'] ?? null,
            'photo_path' => $data['photo_path'] ?? $data['photoUrl'] ?? null,
            'status' => $data['status'] ?? 'Active',
            'student_id' => $data['student_id'] ?? $data['studentId'] ?? 'STU' . time(),
            'level' => $data['level'] ?? null,
            'academic_year' => $data['academic_year'] ?? $data['academicYear'] ?? date('Y') . '/' . (date('Y') + 1)
        ]);
        
        return $result ? $this->db->lastInsertId() : false;
    }

    public function findById($id) {
        $sql = "SELECT s.*, c.name as class_name, c.level, u.name as parent_name, u.email as parent_email 
                FROM {$this->table} s 
                LEFT JOIN classes c ON s.class_id = c.id 
                LEFT JOIN users u ON s.parent_id = u.id 
                WHERE s.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Format dates and add computed fields
        if ($result) {
            $this->formatStudentData($result);
        }
        
        return $result;
    }

    public function findByStudentId($studentId) {
        $sql = "SELECT s.*, c.name as className, c.level, u.name as parent_name, u.email as parent_email 
                FROM {$this->table} s 
                LEFT JOIN classes c ON s.class_id = c.id 
                LEFT JOIN users u ON s.parent_id = u.id 
                WHERE s.student_id = :studentId";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['studentId' => $studentId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Format dates and add computed fields
        if ($result) {
            $this->formatStudentData($result);
        }
        
        return $result;
    }

    public function findByAdmissionNumber($admissionNumber) {
        $sql = "SELECT s.*, c.name as className, c.level, u.name as parent_name, u.email as parent_email 
                FROM {$this->table} s 
                LEFT JOIN classes c ON s.class_id = c.id 
                LEFT JOIN users u ON s.parent_id = u.id 
                WHERE s.reg_no = :admissionNumber";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['admissionNumber' => $admissionNumber]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Format dates and add computed fields
        if ($result) {
            $this->formatStudentData($result);
        }
        
        return $result;
    }

    public function findByRegNo($regNo) {
        $sql = "SELECT s.*, c.name as class_name, c.level, u.name as parent_name, u.email as parent_email 
                FROM {$this->table} s 
                LEFT JOIN classes c ON s.class_id = c.id 
                LEFT JOIN users u ON s.parent_id = u.id 
                WHERE s.reg_no = :reg_no";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['reg_no' => $regNo]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Format dates and add computed fields
        if ($result) {
            $this->formatStudentData($result);
        }
        
        return $result;
    }

    public function getAll($options = []) {
        $sql = "SELECT s.*, c.name as class_name, c.level, u.name as parent_name, u.email as parent_email
                FROM {$this->table} s 
                LEFT JOIN classes c ON s.class_id = c.id 
                LEFT JOIN users u ON s.parent_id = u.id 
                WHERE 1=1";
        
        $params = [];
        $whereClauses = [];
        
        // Apply filters
        if (!empty($options['class_id']) || !empty($options['classId'])) {
            $whereClauses[] = "s.class_id = :class_id";
            $params['class_id'] = $options['class_id'] ?? $options['classId'];
        }
        
        // Handle multiple class IDs for teacher assignments
        if (!empty($options['class_ids']) && is_array($options['class_ids'])) {
            $placeholders = implode(',', array_fill(0, count($options['class_ids']), '?'));
            $whereClauses[] = "s.class_id IN ($placeholders)";
            // Add class IDs directly to params for positional binding
            foreach ($options['class_ids'] as $classId) {
                $params[] = $classId;
            }
        }
        
        if (!empty($options['parent_id'])) {
            $whereClauses[] = "s.parent_id = :parent_id";
            $params['parent_id'] = $options['parent_id'];
        }
        
        if (!empty($options['status'])) {
            $whereClauses[] = "s.status = :status";
            $params['status'] = $options['status'];
        }
        
        if (!empty($options['gender'])) {
            $whereClauses[] = "s.gender = :gender";
            $params['gender'] = $options['gender'];
        }
        
        if (!empty($options['academicYear'])) {
            $whereClauses[] = "s.academic_year = :academic_year";
            $params['academic_year'] = $options['academicYear'];
        }
        
        if (!empty($options['search'])) {
            $whereClauses[] = "(s.full_name LIKE :search OR s.reg_no LIKE :search OR s.student_id LIKE :search)";
            $params['search'] = '%' . $options['search'] . '%';
        }
        
        if (!empty($whereClauses)) {
            $sql .= " AND " . implode(" AND ", $whereClauses);
        }
        
        // Apply ordering
        $sql .= " ORDER BY s.full_name ASC";
        
        // Apply pagination
        if (!empty($options['limit'])) {
            $sql .= " LIMIT :limit";
            $params['limit'] = (int)$options['limit'];
            
            if (!empty($options['offset'])) {
                $sql .= " OFFSET :offset";
                $params['offset'] = (int)$options['offset'];
            }
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format dates and add computed fields for all results
        foreach ($results as &$result) {
            $this->formatStudentData($result);
        }
        
        return $results;
    }

    public function getByClass($classId) {
        $sql = "SELECT s.*, c.name as class_name, c.level, u.name as parent_name, u.email as parent_email
                FROM {$this->table} s 
                LEFT JOIN classes c ON s.class_id = c.id 
                LEFT JOIN users u ON s.parent_id = u.id 
                WHERE s.class_id = :class_id 
                ORDER BY s.full_name ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['class_id' => $classId]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format dates and add computed fields for all results
        foreach ($results as &$result) {
            $this->formatStudentData($result);
        }
        
        return $results;
    }

    public function getByParent($parentId) {
        $sql = "SELECT s.*, c.name as class_name, c.level, u.name as parent_name, u.email as parent_email
                FROM {$this->table} s 
                LEFT JOIN classes c ON s.class_id = c.id 
                LEFT JOIN users u ON s.parent_id = u.id 
                WHERE s.parent_id = :parent_id 
                ORDER BY s.full_name ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['parent_id' => $parentId]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format dates and add computed fields for all results
        foreach ($results as &$result) {
            $this->formatStudentData($result);
        }
        
        return $results;
    }

    public function getStats() {
        $stats = [];
        
        // Total students by status
        $sql = "SELECT status, COUNT(*) as count FROM {$this->table} GROUP BY status";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $statusStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stats['by_status'] = array_column($statusStats, 'count', 'status');
        
        // Total students by class
        $sql = "SELECT c.name as class_name, COUNT(*) as count 
                FROM {$this->table} s 
                LEFT JOIN classes c ON s.class_id = c.id 
                GROUP BY s.class_id, c.name 
                ORDER BY count DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $classStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stats['by_class'] = array_column($classStats, 'count', 'class_name');
        
        // Total students by gender
        $sql = "SELECT gender, COUNT(*) as count FROM {$this->table} GROUP BY gender";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $genderStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stats['by_gender'] = array_column($genderStats, 'count', 'gender');
        
        // Total students
        $sql = "SELECT COUNT(*) as count FROM {$this->table}";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['total'] = $result['count'];
        
        // Recent admissions
        $sql = "SELECT COUNT(*) as count FROM {$this->table} 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['recent_admissions'] = $result['count'];
        
        return $stats;
    }

    public function search($query, $options = []) {
        $sql = "SELECT s.*, c.name as class_name, c.level, u.name as parent_name, u.email as parent_email
                FROM {$this->table} s 
                LEFT JOIN classes c ON s.class_id = c.id 
                LEFT JOIN users u ON s.parent_id = u.id 
                WHERE (s.full_name LIKE :query OR s.reg_no LIKE :query OR s.student_id LIKE :query)";
        
        $params = ['query' => '%' . $query . '%'];
        
        // Add additional filters
        if (!empty($options['class_id'])) {
            $sql .= " AND s.class_id = :class_id";
            $params['class_id'] = $options['class_id'];
        }
        
        if (!empty($options['status'])) {
            $sql .= " AND s.status = :status";
            $params['status'] = $options['status'];
        }
        
        $sql .= " ORDER BY s.full_name ASC";
        
        // Limit results
        if (!empty($options['limit'])) {
            $sql .= " LIMIT :limit";
            $params['limit'] = (int)$options['limit'];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format dates and add computed fields for all results
        foreach ($results as &$result) {
            $this->formatStudentData($result);
        }
        
        return $results;
    }

    public function update($id, $data) {
        $sql = "UPDATE {$this->table} SET 
                full_name = :full_name, 
                class_id = :class_id, 
                parent_id = :parent_id, 
                gender = :gender, 
                dob = :dob, 
                phone = :phone, 
                photo_path = :photo_path, 
                status = :status, 
                student_id = :student_id, 
                level = :level, 
                academic_year = :academic_year
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'full_name' => $data['full_name'] ?? (
                isset($data['firstName']) && isset($data['lastName']) 
                ? $data['firstName'] . ' ' . $data['lastName'] 
                : ($data['fullName'] ?? null)
            ),
            'class_id' => $data['class_id'] ?? $data['classId'] ?? null,
            'parent_id' => $data['parent_id'] ?? $data['parentId'] ?? null,
            'gender' => $data['gender'] ?? null,
            'dob' => $data['dob'] ?? $data['dateOfBirth'] ?? null,
            'phone' => $data['phone'] ?? null,
            'photo_path' => $data['photo_path'] ?? $data['photoUrl'] ?? null,
            'status' => $data['status'] ?? 'Active',
            'student_id' => $data['student_id'] ?? $data['studentId'] ?? null,
            'level' => $data['level'] ?? null,
            'academic_year' => $data['academic_year'] ?? $data['academicYear'] ?? null,
            'id' => $id
        ]);
    }

    public function delete($id) {
        $sql = "UPDATE {$this->table} SET status = 'Inactive' WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function promote($id, $newClassId, $newLevel) {
        $sql = "UPDATE {$this->table} SET 
                class_id = :class_id, 
                level = :level, 
                academic_year = :academic_year
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'class_id' => $newClassId,
            'level' => $newLevel,
            'academic_year' => date('Y') . '/' . (date('Y') + 1),
            'id' => $id
        ]);
    }

    public function updateStatus($id, $status) {
        $sql = "UPDATE {$this->table} SET status = :status WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['status' => $status, 'id' => $id]);
    }
    
    /**
     * Format student data and add computed fields
     */
    private function formatStudentData(&$student) {
        // Convert full_name to firstName and lastName for frontend compatibility
        if (isset($student['full_name'])) {
            $nameParts = explode(' ', $student['full_name'], 2);
            $student['firstName'] = $nameParts[0] ?? '';
            $student['lastName'] = $nameParts[1] ?? '';
        }
        
        // Map field names for frontend compatibility
        $student['admissionNumber'] = $student['reg_no'] ?? null;
        $student['dateOfBirth'] = $student['dob'] ?? null;
        $student['photoUrl'] = $student['photo_path'] ?? null;
        $student['studentId'] = $student['student_id'] ?? null;
        $student['classId'] = $student['class_id'] ?? null;
        $student['parentId'] = $student['parent_id'] ?? null;
        $student['className'] = $student['class_name'] ?? null;
        $student['academicYear'] = $student['academic_year'] ?? null;
        
        // Format dates
        if (!empty($student['dob'])) {
            $student['dob'] = date('Y-m-d', strtotime($student['dob']));
        }
        if (!empty($student['dateOfBirth'])) {
            $student['dateOfBirth'] = date('Y-m-d', strtotime($student['dateOfBirth']));
        }
        
        // Calculate age if date of birth exists
        if (!empty($student['dob'])) {
            $dob = new DateTime($student['dob']);
            $today = new DateTime();
            $age = $today->diff($dob)->y;
            $student['age'] = $age;
        }
        
        // Add status badge for UI
        $statusColors = [
            'Active' => 'success',
            'Inactive' => 'secondary',
            'Graduated' => 'primary'
        ];
        $student['status_badge'] = $statusColors[$student['status']] ?? 'secondary';
    }
}
