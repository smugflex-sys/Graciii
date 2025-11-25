<?php

class Score {
    private $db;
    private $table = 'scores';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($data) {
        // Support both normalized (term_id, session_id) and denormalized (term, academicYear) schemas
        // Prefer normalized IDs if provided, otherwise use string names
        $termId = $data['term_id'] ?? null;
        $sessionId = $data['session_id'] ?? null;
        $classId = $data['class_id'] ?? $data['classId'] ?? null;
        
        // If using normalized schema with IDs
        if ($termId && $sessionId && $classId) {
            $studentId = $data['student_id'] ?? $data['studentId'];
            $subjectId = $data['subject_id'] ?? $data['subjectAssignmentId'] ?? null;

            // Ensure only one row per student/subject/class/term/session
            $deleteSql = "DELETE FROM {$this->table} 
                          WHERE student_id = :student_id 
                          AND subject_id = :subject_id 
                          AND class_id = :class_id 
                          AND term_id = :term_id 
                          AND session_id = :session_id";
            $deleteStmt = $this->db->prepare($deleteSql);
            $deleteStmt->execute([
                'student_id' => $studentId,
                'subject_id' => $subjectId,
                'class_id' => $classId,
                'term_id' => $termId,
                'session_id' => $sessionId
            ]);

            $sql = "INSERT INTO {$this->table} 
                    (student_id, subject_id, class_id, term_id, session_id, assessment_type, score, 
                     teacher_id, status) 
                    VALUES (:student_id, :subject_id, :class_id, :term_id, :session_id, :assessment_type, :score, 
                            :teacher_id, :status)";
            
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                'student_id' => $studentId,
                'subject_id' => $subjectId,
                'class_id' => $classId,
                'term_id' => $termId,
                'session_id' => $sessionId,
                'assessment_type' => $data['assessment_type'] ?? 'exam',
                'score' => $data['score'] ?? ($data['exam'] ?? $data['exam_score'] ?? 0),
                'teacher_id' => $data['teacher_id'] ?? $data['enteredBy'] ?? null,
                'status' => $data['status'] ?? 'Draft'
            ]);
        }
        
        // Fallback to denormalized schema for backward compatibility
        $sql = "INSERT INTO {$this->table} 
                (studentId, subjectAssignmentId, subjectName, ca1, ca2, exam, total, 
                 classAverage, classMin, classMax, grade, remark, subjectTeacher, 
                 enteredBy, enteredDate, term, academicYear, status) 
                VALUES (:studentId, :subjectAssignmentId, :subjectName, :ca1, :ca2, :exam, :total, 
                        :classAverage, :classMin, :classMax, :grade, :remark, :subjectTeacher, 
                        :enteredBy, :enteredDate, :term, :academicYear, :status)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'studentId' => $data['studentId'] ?? $data['student_id'],
            'subjectAssignmentId' => $data['subjectAssignmentId'] ?? $data['subject_id'] ?? null,
            'subjectName' => $data['subjectName'] ?? $data['subject_name'] ?? '',
            'ca1' => $data['ca1'] ?? $data['ca_score'] ?? 0,
            'ca2' => $data['ca2'] ?? 0,
            'exam' => $data['exam'] ?? $data['exam_score'] ?? 0,
            'total' => $data['total'] ?? ($data['ca1'] ?? 0) + ($data['ca2'] ?? 0) + ($data['exam'] ?? 0),
            'classAverage' => $data['classAverage'] ?? 0,
            'classMin' => $data['classMin'] ?? 0,
            'classMax' => $data['classMax'] ?? 0,
            'grade' => $data['grade'] ?? null,
            'remark' => $data['remark'] ?? $data['remarks'] ?? null,
            'subjectTeacher' => $data['subjectTeacher'] ?? $data['teacher_name'] ?? null,
            'enteredBy' => $data['enteredBy'] ?? $data['teacher_id'] ?? null,
            'enteredDate' => $data['enteredDate'] ?? date('Y-m-d H:i:s'),
            'term' => $data['term'] ?? $data['term_name'] ?? '',
            'academicYear' => $data['academicYear'] ?? $data['session_name'] ?? '2024/2025',
            'status' => $data['status'] ?? 'Draft'
        ]);
    }

    public function createBulk($scores) {
        $success = true;
        
        foreach ($scores as $score) {
            // Check if using normalized schema
            $termId = $score['term_id'] ?? null;
            $sessionId = $score['session_id'] ?? null;
            $classId = $score['class_id'] ?? $score['classId'] ?? null;
            
            if ($termId && $sessionId && $classId) {
                // Normalized schema
                $sql = "INSERT INTO {$this->table} 
                        (student_id, subject_id, class_id, term_id, session_id, assessment_type, score, 
                         teacher_id, status) 
                        VALUES (:student_id, :subject_id, :class_id, :term_id, :session_id, :assessment_type, :score, 
                                :teacher_id, :status)";
                
                $stmt = $this->db->prepare($sql);
                $params = [
                    'student_id' => $score['student_id'] ?? $score['studentId'],
                    'subject_id' => $score['subject_id'] ?? $score['subjectAssignmentId'] ?? null,
                    'class_id' => $classId,
                    'term_id' => $termId,
                    'session_id' => $sessionId,
                    'assessment_type' => $score['assessment_type'] ?? 'exam',
                    'score' => $score['score'] ?? ($score['exam'] ?? $score['exam_score'] ?? 0),
                    'teacher_id' => $score['teacher_id'] ?? $score['enteredBy'] ?? null,
                    'status' => $score['status'] ?? 'Draft'
                ];
            } else {
                // Denormalized schema (backward compatibility)
                $sql = "INSERT INTO {$this->table} 
                        (studentId, subjectAssignmentId, subjectName, ca1, ca2, exam, total, 
                         classAverage, classMin, classMax, grade, remark, subjectTeacher, 
                         enteredBy, enteredDate, term, academicYear, status) 
                        VALUES (:studentId, :subjectAssignmentId, :subjectName, :ca1, :ca2, :exam, :total, 
                                :classAverage, :classMin, :classMax, :grade, :remark, :subjectTeacher, 
                                :enteredBy, :enteredDate, :term, :academicYear, :status)";
                
                $stmt = $this->db->prepare($sql);
                $params = [
                    'studentId' => $score['studentId'] ?? $score['student_id'],
                    'subjectAssignmentId' => $score['subjectAssignmentId'] ?? $score['subject_id'] ?? null,
                    'subjectName' => $score['subjectName'] ?? $score['subject_name'] ?? '',
                    'ca1' => $score['ca1'] ?? $score['ca_score'] ?? 0,
                    'ca2' => $score['ca2'] ?? 0,
                    'exam' => $score['exam'] ?? $score['exam_score'] ?? 0,
                    'total' => $score['total'] ?? ($score['ca1'] ?? 0) + ($score['ca2'] ?? 0) + ($score['exam'] ?? 0),
                    'classAverage' => $score['classAverage'] ?? 0,
                    'classMin' => $score['classMin'] ?? 0,
                    'classMax' => $score['classMax'] ?? 0,
                    'grade' => $score['grade'] ?? null,
                    'remark' => $score['remark'] ?? $score['remarks'] ?? null,
                    'subjectTeacher' => $score['subjectTeacher'] ?? $score['teacher_name'] ?? null,
                    'enteredBy' => $score['enteredBy'] ?? $score['teacher_id'] ?? null,
                    'enteredDate' => $score['enteredDate'] ?? date('Y-m-d H:i:s'),
                    'term' => $score['term'] ?? $score['term_name'] ?? '',
                    'academicYear' => $score['academicYear'] ?? $score['session_name'] ?? '2024/2025',
                    'status' => $score['status'] ?? 'Draft'
                ];
            }
            
            if (!$stmt->execute($params)) {
                $success = false;
                break;
            }
        }
        
        return $success;
    }

    public function findById($id) {
        $sql = "SELECT sc.*, s.firstName, s.lastName, s.admissionNumber, s.className, 
                c.name as class_name, t.name as term_name, sess.name as session_name,
                u.name as teacher_name
                FROM {$this->table} sc
                LEFT JOIN students s ON sc.studentId = s.id
                LEFT JOIN classes c ON s.classId = c.id
                LEFT JOIN terms t ON sc.term = t.name
                LEFT JOIN sessions sess ON sc.academicYear = sess.name
                LEFT JOIN users u ON sc.enteredBy = u.id
                WHERE sc.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function getAll($options = []) {
        $sql = "SELECT sc.*, s.firstName, s.lastName, s.admissionNumber, s.className, 
                c.name as class_name, t.name as term_name, sess.name as session_name
                FROM {$this->table} sc
                LEFT JOIN students s ON sc.studentId = s.id
                LEFT JOIN classes c ON s.classId = c.id
                LEFT JOIN terms t ON sc.term = t.name
                LEFT JOIN sessions sess ON sc.academicYear = sess.name";
        
        $params = [];
        $whereClauses = [];
        
        if (isset($options['studentId']) || isset($options['student_id'])) {
            $studentId = $options['studentId'] ?? $options['student_id'];
            $whereClauses[] = "sc.studentId = :studentId";
            $params['studentId'] = $studentId;
        }
        
        if (isset($options['subjectAssignmentId']) || isset($options['subject_id'])) {
            $subjectId = $options['subjectAssignmentId'] ?? $options['subject_id'];
            $whereClauses[] = "sc.subjectAssignmentId = :subjectAssignmentId";
            $params['subjectAssignmentId'] = $subjectId;
        }
        
        if (isset($options['subjectName'])) {
            $whereClauses[] = "sc.subjectName = :subjectName";
            $params['subjectName'] = $options['subjectName'];
        }
        
        if (isset($options['term'])) {
            $whereClauses[] = "sc.term = :term";
            $params['term'] = $options['term'];
        }
        
        if (isset($options['academicYear'])) {
            $whereClauses[] = "sc.academicYear = :academicYear";
            $params['academicYear'] = $options['academicYear'];
        }
        
        if (isset($options['classId']) || isset($options['class_id'])) {
            $classId = $options['classId'] ?? $options['class_id'];
            $whereClauses[] = "s.classId = :classId";
            $params['classId'] = $classId;
        }
        
        if (isset($options['status'])) {
            $whereClauses[] = "sc.status = :status";
            $params['status'] = $options['status'];
        }
        
        if (isset($options['enteredBy']) || isset($options['teacher_id'])) {
            $teacherId = $options['enteredBy'] ?? $options['teacher_id'];
            $whereClauses[] = "sc.enteredBy = :enteredBy";
            $params['enteredBy'] = $teacherId;
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $sql .= " ORDER BY sess.name DESC, t.name ASC, sc.subjectName ASC, s.lastName ASC, s.firstName ASC";
        
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

    public function update($id, $data) {
        $fields = [];
        $params = ['id' => $id];

        $allowedFields = [
            'studentId', 'subjectAssignmentId', 'subjectName', 'ca1', 'ca2', 'exam', 'total',
            'classAverage', 'classMin', 'classMax', 'grade', 'remark', 'subjectTeacher',
            'enteredBy', 'enteredDate', 'term', 'academicYear', 'status'
        ];
        
        // Auto-calculate total if ca1, ca2, or exam is updated
        if (isset($data['ca1']) || isset($data['ca2']) || isset($data['exam'])) {
            $current = $this->findById($id);
            if ($current) {
                $ca1 = $data['ca1'] ?? $current['ca1'];
                $ca2 = $data['ca2'] ?? $current['ca2'];
                $exam = $data['exam'] ?? $current['exam'];
                $data['total'] = $ca1 + $ca2 + $exam;
            }
        }
        
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

    public function getByStudent($studentId, $academicYear = null, $term = null) {
        $options = ['studentId' => $studentId];
        if ($academicYear) $options['academicYear'] = $academicYear;
        if ($term) $options['term'] = $term;
        
        return $this->getAll($options);
    }

    public function getBySubject($subjectAssignmentId, $academicYear = null, $term = null) {
        $options = ['subjectAssignmentId' => $subjectAssignmentId];
        if ($academicYear) $options['academicYear'] = $academicYear;
        if ($term) $options['term'] = $term;
        
        return $this->getAll($options);
    }

    public function getByClass($classId, $academicYear = null, $term = null) {
        $options = ['classId' => $classId];
        if ($academicYear) $options['academicYear'] = $academicYear;
        if ($term) $options['term'] = $term;
        
        return $this->getAll($options);
    }

    public function getByTeacher($teacherId, $academicYear = null, $term = null) {
        $options = ['enteredBy' => $teacherId];
        if ($academicYear) $options['academicYear'] = $academicYear;
        if ($term) $options['term'] = $term;
        
        return $this->getAll($options);
    }

    public function getClassStatistics($classId, $subjectAssignmentId, $academicYear, $term) {
        $sql = "SELECT 
                    COUNT(*) as total_students,
                    AVG(sc.total) as average_score,
                    MAX(sc.total) as highest_score,
                    MIN(sc.total) as lowest_score,
                    SUM(CASE WHEN sc.grade = 'A' THEN 1 ELSE 0 END) as a_count,
                    SUM(CASE WHEN sc.grade = 'B' THEN 1 ELSE 0 END) as b_count,
                    SUM(CASE WHEN sc.grade = 'C' THEN 1 ELSE 0 END) as c_count,
                    SUM(CASE WHEN sc.grade = 'D' THEN 1 ELSE 0 END) as d_count,
                    SUM(CASE WHEN sc.grade = 'E' THEN 1 ELSE 0 END) as e_count,
                    SUM(CASE WHEN sc.grade = 'F' THEN 1 ELSE 0 END) as f_count
                FROM {$this->table} sc
                JOIN students s ON sc.studentId = s.id
                WHERE s.classId = :classId 
                AND sc.subjectAssignmentId = :subjectAssignmentId
                AND sc.academicYear = :academicYear
                AND sc.term = :term
                AND sc.status = 'Submitted'";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'classId' => $classId,
            'subjectAssignmentId' => $subjectAssignmentId,
            'academicYear' => $academicYear,
            'term' => $term
        ]);
        
        return $stmt->fetch();
    }

    public function submitScores($scoreIds, $submittedBy) {
        $placeholders = str_repeat('?,', count($scoreIds) - 1) . '?';
        $sql = "UPDATE {$this->table} 
                SET status = 'Submitted', enteredBy = ? 
                WHERE id IN ($placeholders)";
        
        $params = array_merge([$submittedBy], $scoreIds);
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function approveScores($scoreIds, $approvedBy) {
        $placeholders = str_repeat('?,', count($scoreIds) - 1) . '?';
        $sql = "UPDATE {$this->table} 
                SET status = 'Approved' 
                WHERE id IN ($placeholders)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($scoreIds);
    }

    public function getStudentSubjectScores($studentId, $academicYear, $term) {
        $sql = "SELECT sc.*, s.name as subject_name, s.code as subject_code,
                       u.name as teacher_name
                FROM {$this->table} sc
                LEFT JOIN subjects s ON JSON_EXTRACT(sc.subjectName, '$') = s.name
                LEFT JOIN users u ON sc.enteredBy = u.id
                WHERE sc.studentId = :studentId 
                AND sc.academicYear = :academicYear
                AND sc.term = :term
                AND sc.status IN ('Submitted', 'Approved')
                ORDER BY s.name ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'studentId' => $studentId,
            'academicYear' => $academicYear,
            'term' => $term
        ]);
        
        return $stmt->fetchAll();
    }

    public function getStudentSubjectScore($studentId, $subjectAssignmentId, $academicYear, $term) {
        $sql = "SELECT * FROM {$this->table} 
                WHERE studentId = :studentId 
                AND subjectAssignmentId = :subjectAssignmentId 
                AND academicYear = :academicYear 
                AND term = :term";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'studentId' => $studentId,
            'subjectAssignmentId' => $subjectAssignmentId,
            'academicYear' => $academicYear,
            'term' => $term
        ]);
        
        return $stmt->fetch();
    }

    public function getTotalCount($filters = []) {
        $sql = "SELECT COUNT(*) as count FROM {$this->table}";
        $params = [];
        $whereClauses = [];
        
        if (isset($filters['studentId'])) {
            $whereClauses[] = "studentId = :studentId";
            $params['studentId'] = $filters['studentId'];
        }
        
        if (isset($filters['subjectAssignmentId'])) {
            $whereClauses[] = "subjectAssignmentId = :subjectAssignmentId";
            $params['subjectAssignmentId'] = $filters['subjectAssignmentId'];
        }
        
        if (isset($filters['academicYear'])) {
            $whereClauses[] = "academicYear = :academicYear";
            $params['academicYear'] = $filters['academicYear'];
        }
        
        if (isset($filters['term'])) {
            $whereClauses[] = "term = :term";
            $params['term'] = $filters['term'];
        }
        
        if (isset($filters['status'])) {
            $whereClauses[] = "status = :status";
            $params['status'] = $filters['status'];
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return (int)$result['count'];
    }

    public function calculateGrade($totalScore) {
        if ($totalScore >= 70) return 'A';
        if ($totalScore >= 60) return 'B';
        if ($totalScore >= 50) return 'C';
        if ($totalScore >= 45) return 'D';
        if ($totalScore >= 40) return 'E';
        return 'F';
    }

    public function calculateRemarks($grade) {
        switch ($grade) {
            case 'A': return 'Excellent';
            case 'B': return 'Very Good';
            case 'C': return 'Good';
            case 'D': return 'Fair';
            case 'E': return 'Poor';
            case 'F': return 'Very Poor';
            default: return '';
        }
    }

    public function updateClassStatistics($classId, $subjectAssignmentId, $academicYear, $term) {
        $sql = "UPDATE {$this->table} sc
                SET classAverage = (
                    SELECT AVG(total) 
                    FROM {$this->table} sc2 
                    JOIN students s ON sc2.studentId = s.id
                    WHERE s.classId = :classId 
                    AND sc2.subjectAssignmentId = :subjectAssignmentId
                    AND sc2.academicYear = :academicYear
                    AND sc2.term = :term
                    AND sc2.status IN ('Submitted', 'Approved')
                ),
                classMin = (
                    SELECT MIN(total) 
                    FROM {$this->table} sc2 
                    JOIN students s ON sc2.studentId = s.id
                    WHERE s.classId = :classId 
                    AND sc2.subjectAssignmentId = :subjectAssignmentId
                    AND sc2.academicYear = :academicYear
                    AND sc2.term = :term
                    AND sc2.status IN ('Submitted', 'Approved')
                ),
                classMax = (
                    SELECT MAX(total) 
                    FROM {$this->table} sc2 
                    JOIN students s ON sc2.studentId = s.id
                    WHERE s.classId = :classId 
                    AND sc2.subjectAssignmentId = :subjectAssignmentId
                    AND sc2.academicYear = :academicYear
                    AND sc2.term = :term
                    AND sc2.status IN ('Submitted', 'Approved')
                )
                WHERE studentId IN (
                    SELECT id FROM students WHERE classId = :classId
                ) AND subjectAssignmentId = :subjectAssignmentId
                AND academicYear = :academicYear AND term = :term";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'classId' => $classId,
            'subjectAssignmentId' => $subjectAssignmentId,
            'academicYear' => $academicYear,
            'term' => $term
        ]);
    }
}
