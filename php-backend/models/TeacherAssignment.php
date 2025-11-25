<?php

/**
 * Teacher Assignment Model
 * Manages teacher-subject-class assignments per term/session
 */

class TeacherAssignment {
    private $db;
    private $table = 'teacher_assignments';
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Create a teacher assignment
     */
    public function create($teacherId, $classId, $subjectId, $termId, $sessionId) {
        $sql = "INSERT INTO {$this->table} 
                (teacher_id, class_id, subject_id, term_id, session_id) 
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$teacherId, $classId, $subjectId, $termId, $sessionId]);
    }
    
    /**
     * Get assignments by filters
     */
    public function get($filters = []) {
        $sql = "SELECT ta.*, u.first_name, u.last_name, 
                       c.name as class_name, s.name as subject_name,
                       t.name as term_name, se.name as session_name
                FROM {$this->table} ta
                JOIN users u ON ta.teacher_id = u.id
                JOIN classes c ON ta.class_id = c.id
                JOIN subjects s ON ta.subject_id = s.id
                JOIN terms t ON ta.term_id = t.id
                JOIN sessions se ON ta.session_id = se.id
                WHERE 1=1";
        
        $bindings = [];
        
        if (!empty($filters['teacher_id'])) {
            $sql .= " AND ta.teacher_id = ?";
            $bindings[] = $filters['teacher_id'];
        }
        
        if (!empty($filters['class_id'])) {
            $sql .= " AND ta.class_id = ?";
            $bindings[] = $filters['class_id'];
        }
        
        if (!empty($filters['subject_id'])) {
            $sql .= " AND ta.subject_id = ?";
            $bindings[] = $filters['subject_id'];
        }
        
        if (!empty($filters['term_id'])) {
            $sql .= " AND ta.term_id = ?";
            $bindings[] = $filters['term_id'];
        }
        
        if (!empty($filters['session_id'])) {
            $sql .= " AND ta.session_id = ?";
            $bindings[] = $filters['session_id'];
        }
        
        $sql .= " ORDER BY ta.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($bindings);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Delete a teacher assignment
     */
    public function delete($id) {
        $sql = "DELETE FROM {$this->table} WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id]);
    }
    
    /**
     * Check if assignment exists
     */
    public function exists($teacherId, $classId, $subjectId, $termId, $sessionId) {
        $sql = "SELECT id FROM {$this->table} 
                WHERE teacher_id = ? AND class_id = ? AND subject_id = ? 
                  AND term_id = ? AND session_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$teacherId, $classId, $subjectId, $termId, $sessionId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
    }
    
    /**
     * Get assignments for a specific teacher in current term/session
     */
    public function getByTeacherForCurrentTerm($teacherId, $termId, $sessionId) {
        return $this->get([
            'teacher_id' => $teacherId,
            'term_id' => $termId,
            'session_id' => $sessionId
        ]);
    }
    
    /**
     * Get assignments for a specific class in current term/session
     */
    public function getByClassForCurrentTerm($classId, $termId, $sessionId) {
        return $this->get([
            'class_id' => $classId,
            'term_id' => $termId,
            'session_id' => $sessionId
        ]);
    }
}
