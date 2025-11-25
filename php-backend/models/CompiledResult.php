<?php

class CompiledResult {
    private $db;
    private $table = 'compiled_results';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($data) {
        $sql = "INSERT INTO {$this->table} 
                (student_id, class_id, term, academic_year, session_id, scores, affective, psychomotor,
                 total_score, average_score, class_average, position, total_students, grade,
                 times_present, times_absent, total_attendance_days, term_begin, term_end,
                 next_term_begin, class_teacher_name, class_teacher_comment, principal_name,
                 principal_comment, principal_signature, compiled_by, compiled_date, status)
                VALUES (:student_id, :class_id, :term, :academic_year, :session_id, :scores, :affective, :psychomotor,
                        :total_score, :average_score, :class_average, :position, :total_students, :grade,
                        :times_present, :times_absent, :total_attendance_days, :term_begin, :term_end,
                        :next_term_begin, :class_teacher_name, :class_teacher_comment, :principal_name,
                        :principal_comment, :principal_signature, :compiled_by, :compiled_date, :status)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'student_id' => $data['student_id'],
            'class_id' => $data['class_id'],
            'term' => $data['term'],
            'academic_year' => $data['academic_year'],
            'session_id' => $data['session_id'],
            'scores' => json_encode($data['scores'] ?? []),
            'affective' => json_encode($data['affective'] ?? []),
            'psychomotor' => json_encode($data['psychomotor'] ?? []),
            'total_score' => $data['total_score'],
            'average_score' => $data['average_score'],
            'class_average' => $data['class_average'],
            'position' => $data['position'],
            'total_students' => $data['total_students'],
            'grade' => $data['grade'],
            'times_present' => $data['times_present'] ?? 0,
            'times_absent' => $data['times_absent'] ?? 0,
            'total_attendance_days' => $data['total_attendance_days'] ?? 0,
            'term_begin' => $data['term_begin'] ?? null,
            'term_end' => $data['term_end'] ?? null,
            'next_term_begin' => $data['next_term_begin'] ?? null,
            'class_teacher_name' => $data['class_teacher_name'] ?? null,
            'class_teacher_comment' => $data['class_teacher_comment'] ?? null,
            'principal_name' => $data['principal_name'] ?? null,
            'principal_comment' => $data['principal_comment'] ?? null,
            'principal_signature' => $data['principal_signature'] ?? null,
            'compiled_by' => $data['compiled_by'],
            'compiled_date' => $data['compiled_date'] ?? date('Y-m-d H:i:s'),
            'status' => $data['status'] ?? 'Draft'
        ]);
    }

    public function createBulk($results) {
        $success = true;
        $errors = [];
        
        // Begin transaction
        $this->db->beginTransaction();
        
        try {
            foreach ($results as $result) {
                if (!$this->create($result)) {
                    $success = false;
                    $errors[] = "Failed to create result for student {$result['student_id']}";
                    break;
                }
            }
            
            if ($success) {
                $this->db->commit();
            } else {
                $this->db->rollback();
            }
        } catch (Exception $e) {
            $this->db->rollback();
            $success = false;
            $errors[] = $e->getMessage();
        }
        
        return [
            'success' => $success,
            'errors' => $errors
        ];
    }

    public function getAll($options = []) {
        $sql = "SELECT cr.*, s.full_name, s.reg_no, c.name as class_name,
                       u.name as compiled_by_name, u2.name as approved_by_name
                FROM {$this->table} cr
                LEFT JOIN students s ON cr.student_id = s.id
                LEFT JOIN classes c ON cr.class_id = c.id
                LEFT JOIN users u ON cr.compiled_by = u.id
                LEFT JOIN users u2 ON cr.approved_by = u2.id
                WHERE 1=1";
        
        $params = [];
        
        if (isset($options['student_id'])) {
            $sql .= " AND cr.student_id = :student_id";
            $params['student_id'] = $options['student_id'];
        }
        
        if (isset($options['class_id'])) {
            $sql .= " AND cr.class_id = :class_id";
            $params['class_id'] = $options['class_id'];
        }
        
        if (isset($options['term'])) {
            $sql .= " AND cr.term = :term";
            $params['term'] = $options['term'];
        }
        
        if (isset($options['academic_year'])) {
            $sql .= " AND cr.academic_year = :academic_year";
            $params['academic_year'] = $options['academic_year'];
        }
        
        if (isset($options['session_id'])) {
            $sql .= " AND cr.session_id = :session_id";
            $params['session_id'] = $options['session_id'];
        }
        
        if (isset($options['status'])) {
            $sql .= " AND cr.status = :status";
            $params['status'] = $options['status'];
        }
        
        // Order by position
        $sql .= " ORDER BY cr.position ASC";
        
        if (isset($options['limit'])) {
            $sql .= " LIMIT :limit";
            $params['limit'] = $options['limit'];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decode JSON fields
        foreach ($results as &$result) {
            $result['scores'] = json_decode($result['scores'] ?? '[]', true);
            $result['affective'] = json_decode($result['affective'] ?? '[]', true);
            $result['psychomotor'] = json_decode($result['psychomotor'] ?? '[]', true);
        }
        
        return $results;
    }

    public function findById($id) {
        $sql = "SELECT cr.*, s.full_name, s.reg_no, c.name as class_name,
                       u.name as compiled_by_name, u2.name as approved_by_name
                FROM {$this->table} cr
                LEFT JOIN students s ON cr.student_id = s.id
                LEFT JOIN classes c ON cr.class_id = c.id
                LEFT JOIN users u ON cr.compiled_by = u.id
                LEFT JOIN users u2 ON cr.approved_by = u2.id
                WHERE cr.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            $result['scores'] = json_decode($result['scores'] ?? '[]', true);
            $result['affective'] = json_decode($result['affective'] ?? '[]', true);
            $result['psychomotor'] = json_decode($result['psychomotor'] ?? '[]', true);
        }
        
        return $result;
    }

    public function update($id, $data) {
        $fields = [];
        $params = ['id' => $id];
        
        $updatableFields = [
            'total_score', 'average_score', 'class_average', 'position', 'total_students',
            'grade', 'times_present', 'times_absent', 'total_attendance_days',
            'term_begin', 'term_end', 'next_term_begin', 'class_teacher_name',
            'class_teacher_comment', 'principal_name', 'principal_comment',
            'principal_signature', 'status', 'approved_by', 'approved_date',
            'rejection_reason'
        ];
        
        foreach ($updatableFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
            }
        }
        
        if (isset($data['scores'])) {
            $fields[] = "scores = :scores";
            $params['scores'] = json_encode($data['scores']);
        }
        
        if (isset($data['affective'])) {
            $fields[] = "affective = :affective";
            $params['affective'] = json_encode($data['affective']);
        }
        
        if (isset($data['psychomotor'])) {
            $fields[] = "psychomotor = :psychomotor";
            $params['psychomotor'] = json_encode($data['psychomotor']);
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $sql = "UPDATE {$this->table} SET " . implode(', ', $fields) . " WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function approve($id, $approvedBy) {
        $sql = "UPDATE {$this->table} 
                SET status = 'Approved', approved_by = :approved_by, approved_date = NOW()
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'id' => $id,
            'approved_by' => $approvedBy
        ]);
    }

    public function reject($id, $reason) {
        $sql = "UPDATE {$this->table} 
                SET status = 'Rejected', rejection_reason = :reason
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'id' => $id,
            'reason' => $reason
        ]);
    }

    public function submit($id) {
        $sql = "UPDATE {$this->table} 
                SET status = 'Submitted'
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function delete($id) {
        $sql = "DELETE FROM {$this->table} WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function checkExists($studentId, $classId, $term, $academicYear, $sessionId) {
        $sql = "SELECT id FROM {$this->table} 
                WHERE student_id = :student_id AND class_id = :class_id 
                AND term = :term AND academic_year = :academic_year AND session_id = :session_id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'student_id' => $studentId,
            'class_id' => $classId,
            'term' => $term,
            'academic_year' => $academicYear,
            'session_id' => $sessionId
        ]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getPendingApprovals() {
        $sql = "SELECT cr.*, s.full_name, s.reg_no, c.name as class_name,
                       u.name as compiled_by_name
                FROM {$this->table} cr
                LEFT JOIN students s ON cr.student_id = s.id
                LEFT JOIN classes c ON cr.class_id = c.id
                LEFT JOIN users u ON cr.compiled_by = u.id
                WHERE cr.status = 'Submitted'
                ORDER BY cr.compiled_date DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($results as &$result) {
            $result['scores'] = json_decode($result['scores'] ?? '[]', true);
            $result['affective'] = json_decode($result['affective'] ?? '[]', true);
            $result['psychomotor'] = json_decode($result['psychomotor'] ?? '[]', true);
        }
        
        return $results;
    }

    public function getStats($filters = []) {
        $sql = "SELECT 
                    COUNT(*) as total_results,
                    SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft_count,
                    SUM(CASE WHEN status = 'Submitted' THEN 1 ELSE 0 END) as submitted_count,
                    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
                    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected_count,
                    AVG(total_score) as avg_total_score,
                    AVG(average_score) as avg_average_score
                FROM {$this->table}
                WHERE 1=1";
        
        $params = [];
        
        if (isset($filters['class_id'])) {
            $sql .= " AND class_id = :class_id";
            $params['class_id'] = $filters['class_id'];
        }
        
        if (isset($filters['term'])) {
            $sql .= " AND term = :term";
            $params['term'] = $filters['term'];
        }
        
        if (isset($filters['academic_year'])) {
            $sql .= " AND academic_year = :academic_year";
            $params['academic_year'] = $filters['academic_year'];
        }
        
        if (isset($filters['session_id'])) {
            $sql .= " AND session_id = :session_id";
            $params['session_id'] = $filters['session_id'];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function calculateGrade($score) {
        if ($score >= 70) return 'A';
        if ($score >= 60) return 'B';
        if ($score >= 50) return 'C';
        if ($score >= 45) return 'D';
        if ($score >= 40) return 'E';
        return 'F';
    }

    public function validateResult($data) {
        $errors = [];
        
        if (!isset($data['student_id']) || !is_numeric($data['student_id'])) {
            $errors['student_id'] = 'Valid student ID is required';
        }
        
        if (!isset($data['class_id']) || !is_numeric($data['class_id'])) {
            $errors['class_id'] = 'Valid class ID is required';
        }
        
        if (!isset($data['term']) || empty(trim($data['term']))) {
            $errors['term'] = 'Term is required';
        }
        
        if (!isset($data['academic_year']) || empty(trim($data['academic_year']))) {
            $errors['academic_year'] = 'Academic year is required';
        }
        
        if (!isset($data['session_id']) || !is_numeric($data['session_id'])) {
            $errors['session_id'] = 'Valid session ID is required';
        }
        
        if (!isset($data['total_score']) || !is_numeric($data['total_score']) || $data['total_score'] < 0 || $data['total_score'] > 1000) {
            $errors['total_score'] = 'Total score must be between 0 and 1000';
        }
        
        if (!isset($data['average_score']) || !is_numeric($data['average_score']) || $data['average_score'] < 0 || $data['average_score'] > 100) {
            $errors['average_score'] = 'Average score must be between 0 and 100';
        }
        
        if (!isset($data['position']) || !is_numeric($data['position']) || $data['position'] < 1) {
            $errors['position'] = 'Position must be a positive integer';
        }
        
        if (!isset($data['total_students']) || !is_numeric($data['total_students']) || $data['total_students'] < 1) {
            $errors['total_students'] = 'Total students must be a positive integer';
        }
        
        if (!isset($data['grade']) || !in_array($data['grade'], ['A', 'B', 'C', 'D', 'E', 'F'])) {
            $errors['grade'] = 'Grade must be one of: A, B, C, D, E, F';
        }
        
        if (isset($data['status']) && !in_array($data['status'], ['Draft', 'Submitted', 'Approved', 'Rejected'])) {
            $errors['status'] = 'Status must be one of: Draft, Submitted, Approved, Rejected';
        }
        
        return $errors;
    }
}
