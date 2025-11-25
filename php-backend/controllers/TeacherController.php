<?php

/**
 * Teacher Controller
 * Handles teacher management operations
 */

class TeacherController {
    private $teacherModel;
    
    public function __construct() {
        $this->teacherModel = new Teacher();
    }
    
    /**
     * Get all teachers
     */
    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $options = [];
            
            // Parse query parameters
            if (isset($_GET['status'])) {
                $options['status'] = $_GET['status'];
            }
            
            if (isset($_GET['isClassTeacher'])) {
                $options['isClassTeacher'] = $_GET['isClassTeacher'] === 'true';
            }
            
            if (isset($_GET['specialization'])) {
                $options['specialization'] = $_GET['specialization'];
            }
            
            if (isset($_GET['limit'])) {
                $options['limit'] = (int)$_GET['limit'];
            }
            
            if (isset($_GET['offset'])) {
                $options['offset'] = (int)$_GET['offset'];
            }
            
            $teachers = $this->teacherModel->getAll($options);
            Response::success($teachers, 'Teachers retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve teachers: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Create a new teacher
     */
    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validateTeacherData($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            // Create teacher record
            $teacherData = [
                'firstName' => $input['firstName'],
                'lastName' => $input['lastName'],
                'email' => $input['email'],
                'phone' => $input['phone'] ?? null,
                'qualification' => $input['qualification'] ?? '',
                'specialization' => $input['specialization'] ?? [],
                'isClassTeacher' => $input['isClassTeacher'] ?? false,
                'classTeacherId' => $input['classTeacherId'] ?? null,
                'status' => $input['status'] ?? 'Active'
            ];
            
            $teacherId = $this->teacherModel->create($teacherData);
            
            // Also create user account for login
            if (isset($input['createUserAccount']) && $input['createUserAccount']) {
                $userData = [
                    'role' => 'teacher',
                    'fullName' => $input['firstName'] . ' ' . $input['lastName'],
                    'email' => $input['email'],
                    'phone' => $input['phone'] ?? null,
                    'password' => $input['password'] ?? $this->generatePassword(),
                    'status' => $input['status'] ?? 'Active'
                ];
                
                $userModel = new User();
                $userId = $userModel->create($userData);
                
                Response::success([
                    'teacherId' => $teacherId,
                    'userId' => $userId,
                    'password' => $userData['password'] ?? null
                ], 'Teacher created successfully');
            } else {
                Response::success(['teacherId' => $teacherId], 'Teacher created successfully');
            }
            
        } catch (Exception $e) {
            Response::error('Failed to create teacher: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update teacher
     */
    public function update() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                Response::error('Teacher ID is required', 400);
                return;
            }
            
            // Teachers can only update their own profile
            if ($user['role'] === 'teacher' && $input['id'] != $user['id']) {
                Response::error('You can only update your own profile', 403);
                return;
            }
            
            // Validation
            $errors = $this->validateTeacherData($input, true);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            $updateData = [];
            $bindings = [];
            
            if (isset($input['name'])) {
                $updateData[] = 'name = ?';
                $bindings[] = $input['name'];
            }
            
            if (isset($input['phone'])) {
                $updateData[] = 'phone = ?';
                $bindings[] = $input['phone'];
            }
            
            if (isset($input['email'])) {
                // Check if email already exists for another user
                $checkSql = "SELECT id FROM users WHERE email = ? AND id != ?";
                $checkStmt = $this->db->prepare($checkSql);
                $checkStmt->execute([$input['email'], $input['id']]);
                if ($checkStmt->fetch(PDO::FETCH_ASSOC)) {
                    Response::error('Email already exists', 400);
                    return;
                }
                $updateData[] = 'email = ?';
                $bindings[] = $input['email'];
            }
            
            if (isset($input['password']) && !empty($input['password'])) {
                $updateData[] = 'password_hash = ?';
                $bindings[] = password_hash($input['password'], PASSWORD_DEFAULT);
            }
            
            if (isset($input['status']) && $user['role'] === 'admin') {
                $updateData[] = 'status = ?';
                $bindings[] = $input['status'];
            }
            
            if (empty($updateData)) {
                Response::error('No valid fields to update', 400);
                return;
            }
            
            $updateData[] = 'updated_at = NOW()';
            $bindings[] = $input['id'];
            
            $sql = "UPDATE users SET " . implode(', ', $updateData) . " WHERE id = ? AND role = 'teacher'";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($bindings);
            
            if ($stmt->rowCount() === 0) {
                Response::error('Teacher not found or no changes made', 404);
                return;
            }
            
            Response::success(null, 'Teacher updated successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to update teacher: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Delete teacher
     */
    public function delete() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission('admin', $user);
            
            $teacherId = $_GET['id'] ?? null;
            
            if (!$teacherId) {
                Response::error('Teacher ID is required', 400);
                return;
            }
            
            // Check if teacher is assigned to a class
            $checkSql = "SELECT COUNT(*) as class_count FROM classes WHERE teacher_id = ?";
            $checkStmt = $this->db->prepare($checkSql);
            $checkStmt->execute([$teacherId]);
            $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['class_count'] > 0) {
                Response::error('Cannot delete teacher assigned to a class', 400);
                return;
            }
            
            // Delete teacher
            $sql = "DELETE FROM users WHERE id = ? AND role = 'teacher'";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$teacherId]);
            
            if ($stmt->rowCount() === 0) {
                Response::error('Teacher not found', 404);
                return;
            }
            
            Response::success(null, 'Teacher deleted successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to delete teacher: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get classes assigned to teacher
     */
    public function getClasses() {
        try {
            $user = JWTHandler::getCurrentUser();
            
            $teacherId = $_GET['teacher_id'] ?? $user['id'];
            
            // Teachers can only view their own classes
            if ($user['role'] === 'teacher' && $teacherId != $user['id']) {
                Response::error('You can only view your own classes', 403);
                return;
            }
            
            $sql = "SELECT c.*, s.name as session_name, t.name as term_name,
                   COUNT(st.id) as student_count
                   FROM classes c
                   LEFT JOIN sessions s ON c.session_id = s.id
                   LEFT JOIN terms t ON c.term_id = t.id
                   LEFT JOIN students st ON c.id = st.class_id AND st.status = 'active'
                   WHERE c.teacher_id = ?
                   GROUP BY c.id
                   ORDER BY c.name";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$teacherId]);
            $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($classes, 'Teacher classes retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve teacher classes: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Validate teacher data
     */
    private function validateTeacherData($input, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate && !isset($input['name'])) {
            $errors['name'] = 'Name is required';
        }
        
        if (isset($input['name']) && strlen(trim($input['name'])) < 2) {
            $errors['name'] = 'Name must be at least 2 characters';
        }
        
        if (!$isUpdate && !isset($input['email'])) {
            $errors['email'] = 'Email is required';
        }
        
        if (isset($input['email']) && !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Valid email is required';
        }
        
        if (isset($input['phone']) && !empty($input['phone']) && !preg_match('/^[+]?[\d\s\-()]+$/', $input['phone'])) {
            $errors['phone'] = 'Invalid phone number format';
        }
        
        if (isset($input['password']) && !empty($input['password']) && strlen($input['password']) < 6) {
            $errors['password'] = 'Password must be at least 6 characters';
        }
        
        return $errors;
    }
    
    /**
     * Generate random password
     */
    private function generatePassword() {
        return substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 8);
    }
    
    /**
     * Check user permission
     */
    private function checkPermission($allowedRoles, $user) {
        if (!in_array($user['role'], $allowedRoles)) {
            Response::error('Insufficient permissions', 403);
            exit;
        }
    }
}
