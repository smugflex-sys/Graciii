<?php

class ClassSubjectRegistration {
    private $db;
    private $table = 'class_subject_registrations';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($data) {
        $sql = "INSERT INTO {$this->table} 
                (class_id, subject_id, className, subjectName, subjectCode, term, 
                 academicYear, is_core, status, registeredBy, registeredDate) 
                VALUES (:class_id, :subject_id, :className, :subjectName, :subjectCode, :term, 
                        :academicYear, :is_core, :status, :registeredBy, :registeredDate)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'class_id' => $data['class_id'],
            'subject_id' => $data['subject_id'],
            'className' => $data['className'],
            'subjectName' => $data['subjectName'],
            'subjectCode' => $data['subjectCode'],
            'term' => $data['term'],
            'academicYear' => $data['academicYear'],
            'is_core' => $data['is_core'] ?? false,
            'status' => $data['status'] ?? 'Active',
            'registeredBy' => $data['registeredBy'],
            'registeredDate' => $data['registeredDate'] ?? date('Y-m-d H:i:s')
        ]);
    }

    public function createBulk($registrations) {
        $sql = "INSERT INTO {$this->table} 
                (class_id, subject_id, className, subjectName, subjectCode, term, 
                 academicYear, is_core, status, registeredBy, registeredDate) 
                VALUES (:class_id, :subject_id, :className, :subjectName, :subjectCode, :term, 
                        :academicYear, :is_core, :status, :registeredBy, :registeredDate)";
        
        $stmt = $this->db->prepare($sql);
        $success = true;
        
        foreach ($registrations as $registration) {
            $params = [
                'class_id' => $registration['class_id'],
                'subject_id' => $registration['subject_id'],
                'className' => $registration['className'],
                'subjectName' => $registration['subjectName'],
                'subjectCode' => $registration['subjectCode'],
                'term' => $registration['term'],
                'academicYear' => $registration['academicYear'],
                'is_core' => $registration['is_core'] ?? false,
                'status' => $registration['status'] ?? 'Active',
                'registeredBy' => $registration['registeredBy'],
                'registeredDate' => $registration['registeredDate'] ?? date('Y-m-d H:i:s')
            ];
            
            if (!$stmt->execute($params)) {
                $success = false;
                break;
            }
        }
        
        return $success;
    }

    public function findById($id) {
        $sql = "SELECT csr.*, c.name as class_name, c.level, s.name as subject_name, s.code as subject_code,
                       s.is_core as subject_is_core, u.name as registered_by_name
                FROM {$this->table} csr
                LEFT JOIN classes c ON csr.class_id = c.id
                LEFT JOIN subjects s ON csr.subject_id = s.id
                LEFT JOIN users u ON csr.registeredBy = u.id
                WHERE csr.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function getAll($options = []) {
        $sql = "SELECT csr.*, c.name as class_name, c.level, s.name as subject_name, s.code as subject_code,
                       s.is_core as subject_is_core, u.name as registered_by_name
                FROM {$this->table} csr
                LEFT JOIN classes c ON csr.class_id = c.id
                LEFT JOIN subjects s ON csr.subject_id = s.id
                LEFT JOIN users u ON csr.registeredBy = u.id";
        
        $params = [];
        $whereClauses = [];
        
        if (isset($options['class_id'])) {
            $whereClauses[] = "csr.class_id = :class_id";
            $params['class_id'] = $options['class_id'];
        }
        
        if (isset($options['subject_id'])) {
            $whereClauses[] = "csr.subject_id = :subject_id";
            $params['subject_id'] = $options['subject_id'];
        }
        
        if (isset($options['term'])) {
            $whereClauses[] = "csr.term = :term";
            $params['term'] = $options['term'];
        }
        
        if (isset($options['academicYear'])) {
            $whereClauses[] = "csr.academicYear = :academicYear";
            $params['academicYear'] = $options['academicYear'];
        }
        
        if (isset($options['status'])) {
            $whereClauses[] = "csr.status = :status";
            $params['status'] = $options['status'];
        }
        
        if (isset($options['is_core'])) {
            $whereClauses[] = "csr.is_core = :is_core";
            $params['is_core'] = $options['is_core'];
        }
        
        if (isset($options['registeredBy'])) {
            $whereClauses[] = "csr.registeredBy = :registeredBy";
            $params['registeredBy'] = $options['registeredBy'];
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $sql .= " ORDER BY csr.academicYear DESC, csr.term ASC, c.level ASC, c.name ASC, s.name ASC";
        
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

    public function getBySubject($subjectId, $options = []) {
        return $this->getAll(array_merge(['subject_id' => $subjectId], $options));
    }

    public function getByTerm($term, $options = []) {
        return $this->getAll(array_merge(['term' => $term], $options));
    }

    public function getByAcademicYear($academicYear, $options = []) {
        return $this->getAll(array_merge(['academicYear' => $academicYear], $options));
    }

    public function getByClassTermYear($classId, $term, $academicYear, $options = []) {
        return $this->getAll(array_merge([
            'class_id' => $classId,
            'term' => $term,
            'academicYear' => $academicYear
        ], $options));
    }

    public function getAvailableSubjectsForClass($classId, $term, $academicYear) {
        $sql = "SELECT s.*, s.is_core as subject_is_core
                FROM subjects s
                WHERE s.status = 'active'
                AND s.id NOT IN (
                    SELECT csr.subject_id 
                    FROM {$this->table} csr 
                    WHERE csr.class_id = :class_id 
                    AND csr.term = :term 
                    AND csr.academicYear = :academicYear 
                    AND csr.status = 'Active'
                )
                ORDER BY s.is_core DESC, s.name ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'class_id' => $classId,
            'term' => $term,
            'academicYear' => $academicYear
        ]);
        
        return $stmt->fetchAll();
    }

    public function update($id, $data) {
        $fields = [];
        $params = ['id' => $id];

        $allowedFields = ['className', 'subjectName', 'subjectCode', 'term', 'academicYear', 
                         'is_core', 'status', 'registeredBy'];
        
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

    public function deleteByClassTermYear($classId, $term, $academicYear) {
        $sql = "DELETE FROM {$this->table} 
                WHERE class_id = :class_id AND term = :term AND academicYear = :academicYear";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'class_id' => $classId,
            'term' => $term,
            'academicYear' => $academicYear
        ]);
    }

    public function search($query, $limit = 50) {
        $sql = "SELECT csr.*, c.name as class_name, c.level, s.name as subject_name, s.code as subject_code,
                       u.name as registered_by_name
                FROM {$this->table} csr
                LEFT JOIN classes c ON csr.class_id = c.id
                LEFT JOIN subjects s ON csr.subject_id = s.id
                LEFT JOIN users u ON csr.registeredBy = u.id
                WHERE (csr.className LIKE :query OR csr.subjectName LIKE :query OR 
                       csr.subjectCode LIKE :query OR c.name LIKE :query OR s.name LIKE :query OR
                       csr.term LIKE :query OR csr.academicYear LIKE :query)
                AND csr.status = 'Active'
                ORDER BY csr.academicYear DESC, csr.term ASC, c.level ASC, c.name ASC, s.name ASC
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'query' => "%$query%",
            'limit' => (int)$limit
        ]);
        
        return $stmt->fetchAll();
    }

    public function getTotalCount($filters = []) {
        $sql = "SELECT COUNT(*) as count FROM {$this->table}";
        $params = [];
        
        if (isset($filters['class_id'])) {
            $sql .= " WHERE class_id = :class_id";
            $params['class_id'] = $filters['class_id'];
        }
        
        if (isset($filters['term'])) {
            $sql .= $filters['class_id'] ? " AND term = :term" : " WHERE term = :term";
            $params['term'] = $filters['term'];
        }
        
        if (isset($filters['academicYear'])) {
            $sql .= (isset($filters['class_id']) || isset($filters['term'])) ? 
                    " AND academicYear = :academicYear" : " WHERE academicYear = :academicYear";
            $params['academicYear'] = $filters['academicYear'];
        }
        
        if (isset($filters['status'])) {
            $sql .= (isset($filters['class_id']) || isset($filters['term']) || isset($filters['academicYear'])) ? 
                    " AND status = :status" : " WHERE status = :status";
            $params['status'] = $filters['status'];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return (int)$result['count'];
    }

    public function getRegistrationStats($filters = []) {
        $sql = "SELECT 
                    COUNT(*) as total_registrations,
                    COUNT(CASE WHEN is_core = 1 THEN 1 END) as core_subjects,
                    COUNT(CASE WHEN is_core = 0 THEN 1 END) as elective_subjects,
                    COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_registrations,
                    COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_registrations,
                    COUNT(DISTINCT class_id) as classes_count,
                    COUNT(DISTINCT subject_id) as subjects_count
                FROM {$this->table}";
        
        $params = [];
        $whereClauses = [];
        
        if (isset($filters['term'])) {
            $whereClauses[] = "term = :term";
            $params['term'] = $filters['term'];
        }
        
        if (isset($filters['academicYear'])) {
            $whereClauses[] = "academicYear = :academicYear";
            $params['academicYear'] = $filters['academicYear'];
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }

    public function getSubjectsByClassAndTerm($classId, $term, $academicYear) {
        return $this->getByClassTermYear($classId, $term, $academicYear, ['status' => 'Active']);
    }

    public function isSubjectRegistered($classId, $subjectId, $term, $academicYear) {
        $sql = "SELECT COUNT(*) as count FROM {$this->table} 
                WHERE class_id = :class_id AND subject_id = :subject_id 
                AND term = :term AND academicYear = :academicYear AND status = 'Active'";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'class_id' => $classId,
            'subject_id' => $subjectId,
            'term' => $term,
            'academicYear' => $academicYear
        ]);
        
        $result = $stmt->fetch();
        return (int)$result['count'] > 0;
    }
}
