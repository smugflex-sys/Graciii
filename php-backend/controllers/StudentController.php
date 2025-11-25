<?php

class StudentController {
    private $studentModel;

    public function __construct() {
        $this->studentModel = new Student();
    }

    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher', 'parent'], $user);
            
            $options = [];
            
            // Parse query parameters - support both old and new field names
            if (isset($_GET['class_id']) || isset($_GET['classId'])) {
                $options['class_id'] = (int)($_GET['classId'] ?? $_GET['class_id']);
            }
            
            if (isset($_GET['status'])) {
                $options['status'] = $_GET['status'];
            }
            
            if (isset($_GET['parent_id'])) {
                $options['parent_id'] = (int)$_GET['parent_id'];
            }
            
            if (isset($_GET['gender'])) {
                $options['gender'] = $_GET['gender'];
            }
            
            if (isset($_GET['academicYear'])) {
                $options['academic_year'] = $_GET['academicYear'];
            }
            
            if (isset($_GET['search'])) {
                $options['search'] = $_GET['search'];
            }
            
            if (isset($_GET['limit'])) {
                $options['limit'] = (int)$_GET['limit'];
            }
            
            if (isset($_GET['offset'])) {
                $options['offset'] = (int)$_GET['offset'];
            }
            
            // Parents can only see their own children
            if ($user['role'] === 'parent') {
                // Use authenticated user's id as parent_id link
                $options['parent_id'] = $user['id'];
            }
            
            // Teachers can only see students from their assigned classes
            if ($user['role'] === 'teacher') {
                // Get teacher's assigned classes
                $teacherModel = new Teacher();
                $assignments = $teacherModel->getAssignments($user['linkedId']);
                
                if (!empty($assignments)) {
                    // Extract unique class IDs from assignments
                    $assignedClassIds = array_unique(array_column($assignments, 'class_id'));
                    
                    // Filter by assigned classes
                    if (!empty($assignedClassIds)) {
                        $options['class_ids'] = $assignedClassIds;
                    } else {
                        // Teacher has no class assignments
                        Response::success([], 'No students assigned - no class assignments found');
                        return;
                    }
                } else {
                    // Teacher has no assignments at all
                    Response::success([], 'No students assigned - no assignments found');
                    return;
                }
            }
            
            // Handle class_ids parameter from frontend (comma-separated)
            if (isset($_GET['class_ids']) && !empty($_GET['class_ids'])) {
                $classIdsString = $_GET['class_ids'];
                $classIds = array_map('intval', explode(',', $classIdsString));
                $classIds = array_filter($classIds, function($id) { return $id > 0; });
                
                if (!empty($classIds)) {
                    $options['class_ids'] = $classIds;
                }
            }
            
            $students = $this->studentModel->getAll($options);
            $total = Database::getInstance()->getCount('students', $this->buildWhereClause($options), $this->buildParams($options));
            
            // Return paginated response if pagination is used
            if (isset($options['limit'])) {
                $pagination = [
                    'total' => $total,
                    'count' => count($students),
                    'limit' => $options['limit'],
                    'offset' => $options['offset'] ?? 0,
                    'pages' => ceil($total / $options['limit'])
                ];
                Response::paginated($students, $pagination, 'Students retrieved successfully');
            } else {
                Response::success($students, 'Students retrieved successfully');
            }
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve students: ' . $e->getMessage(), 500, null, 'STUDENT_RETRIEVAL_ERROR');
        }
    }

    public function getById() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher', 'parent'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Student ID is required', 400, null, 'MISSING_STUDENT_ID');
                return;
            }

            $student = $this->studentModel->findById($id);
            if ($student) {
                // Parents can only view their own children
                if ($user['role'] === 'parent' && $student['parent_id'] != $user['id']) {
                    Response::forbidden('Access denied - you can only view your own children');
                    return;
                }
                Response::success($student, 'Student retrieved successfully');
            } else {
                Response::notFound('Student not found');
            }
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve student: ' . $e->getMessage(), 500, null, 'STUDENT_RETRIEVAL_ERROR');
        }
    }

    public function getByRegNo() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher', 'parent'], $user);
            
            $regNo = $_GET['reg_no'] ?? null;
            if (!$regNo) {
                Response::error('Registration number is required', 400, null, 'MISSING_REG_NO');
                return;
            }

            $student = $this->studentModel->findByRegNo($regNo);
            if ($student) {
                // Parents can only view their own children
                if ($user['role'] === 'parent' && $student['parent_id'] != $user['id']) {
                    Response::forbidden('Access denied - you can only view your own children');
                    return;
                }
                Response::success($student, 'Student retrieved successfully');
            } else {
                Response::notFound('Student not found');
            }
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve student: ' . $e->getMessage(), 500, null, 'STUDENT_RETRIEVAL_ERROR');
        }
    }

    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $errors = $this->validateStudent($input);
            if (!empty($errors)) {
                Response::validation($errors, 'Student validation failed');
                return;
            }

            // Check if registration number already exists
            $existingStudent = $this->studentModel->findByRegNo($input['reg_no']);
            if ($existingStudent) {
                Response::error('Registration number already exists', 409, null, 'REG_NO_EXISTS');
                return;
            }

            // Check class capacity if class_id is provided
            if (isset($input['class_id']) && $input['class_id']) {
                $classModel = new ClassModel();
                $classWithStudents = $classModel->getWithStudents($input['class_id']);
                
                if ($classWithStudents && isset($classWithStudents['capacity'])) {
                    $currentStudentCount = count($classWithStudents['students'] ?? []);
                    if ($currentStudentCount >= $classWithStudents['capacity']) {
                        Response::error('Class has reached maximum capacity', 400, null, 'CLASS_FULL');
                        return;
                    }
                }
            }

            $studentId = $this->studentModel->create($input);
            
            // Return the created student with full details
            $newStudent = $this->studentModel->findById($studentId);
            Response::created($newStudent, 'Student created successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to create student: ' . $e->getMessage(), 500, null, 'STUDENT_CREATION_ERROR');
        }
    }

    public function update() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Student ID is required', 400, null, 'MISSING_STUDENT_ID');
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            $errors = $this->validateStudent($input, true);
            if (!empty($errors)) {
                Response::validation($errors, 'Student validation failed');
                return;
            }

            // Check if student exists
            $existingStudent = $this->studentModel->findById($id);
            if (!$existingStudent) {
                Response::notFound('Student not found');
                return;
            }

            // Check if new registration number conflicts with another student
            if (isset($input['reg_no']) && $input['reg_no'] !== $existingStudent['reg_no']) {
                $conflictingStudent = $this->studentModel->findByRegNo($input['reg_no']);
                if ($conflictingStudent) {
                    Response::error('Registration number already exists', 409, null, 'REG_NO_EXISTS');
                    return;
                }
            }

            $success = $this->studentModel->update($id, $input);
            
            if ($success) {
                $updatedStudent = $this->studentModel->findById($id);
                Response::updated($updatedStudent, 'Student updated successfully');
            } else {
                Response::error('Failed to update student', 500, null, 'STUDENT_UPDATE_ERROR');
            }
            
        } catch (Exception $e) {
            Response::error('Failed to update student: ' . $e->getMessage(), 500, null, 'STUDENT_UPDATE_ERROR');
        }
    }

    public function delete() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Student ID is required', 400, null, 'MISSING_STUDENT_ID');
                return;
            }

            // Check if student exists
            $existingStudent = $this->studentModel->findById($id);
            if (!$existingStudent) {
                Response::notFound('Student not found');
                return;
            }

            $success = $this->studentModel->delete($id);
            
            if ($success) {
                Response::deleted('Student deleted successfully');
            } else {
                Response::error('Failed to delete student', 500, null, 'STUDENT_DELETION_ERROR');
            }
            
        } catch (Exception $e) {
            Response::error('Failed to delete student: ' . $e->getMessage(), 500, null, 'STUDENT_DELETION_ERROR');
        }
    }

    public function getByClass() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $classId = $_GET['class_id'] ?? null;
            if (!$classId) {
                Response::error('Class ID is required', 400, null, 'MISSING_CLASS_ID');
                return;
            }

            $students = $this->studentModel->getByClass($classId);
            Response::success($students, 'Students retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve students: ' . $e->getMessage(), 500, null, 'STUDENT_RETRIEVAL_ERROR');
        }
    }

    public function search() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher', 'parent'], $user);
            
            $query = $_GET['q'] ?? '';
            if (empty($query)) {
                Response::error('Search query is required', 400, null, 'MISSING_SEARCH_QUERY');
                return;
            }

            $options = [
                'limit' => (int)($_GET['limit'] ?? 50),
                'class_id' => $_GET['class_id'] ?? null,
                'status' => $_GET['status'] ?? 'Active'
            ];

            // Parents can only search their own children
            if ($user['role'] === 'parent') {
                $options['parent_id'] = $user['id'];
            }

            $students = $this->studentModel->search($query, $options);
            Response::success($students, 'Search completed successfully');
            
        } catch (Exception $e) {
            Response::error('Search failed: ' . $e->getMessage(), 500, null, 'STUDENT_SEARCH_ERROR');
        }
    }

    public function getStats() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $stats = $this->studentModel->getStats();
            Response::success($stats, 'Student statistics retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve statistics: ' . $e->getMessage(), 500, null, 'STATS_RETRIEVAL_ERROR');
        }
    }

    public function promote() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $studentIds = $input['student_ids'] ?? [];
            $newClassId = $input['new_class_id'] ?? null;
            $newLevel = $input['new_level'] ?? null;

            if (empty($studentIds) || !$newClassId || !$newLevel) {
                Response::error('Student IDs, new class ID, and new level are required', 400, null, 'MISSING_PROMOTION_DATA');
                return;
            }

            $results = [];
            $successCount = 0;

            foreach ($studentIds as $studentId) {
                try {
                    $success = $this->studentModel->promote($studentId, $newClassId, $newLevel);
                    $results[] = [
                        'student_id' => $studentId,
                        'success' => $success,
                        'message' => $success ? 'Student promoted successfully' : 'Failed to promote student'
                    ];
                    
                    if ($success) {
                        $successCount++;
                    }
                } catch (Exception $e) {
                    $results[] = [
                        'student_id' => $studentId,
                        'success' => false,
                        'message' => $e->getMessage()
                    ];
                }
            }

            $message = "Promotion completed: {$successCount} out of " . count($studentIds) . " students promoted";
            Response::bulk($results, $message);
            
        } catch (Exception $e) {
            Response::error('Promotion failed: ' . $e->getMessage(), 500, null, 'STUDENT_PROMOTION_ERROR');
        }
    }

    public function updateStatus() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $studentIds = $input['student_ids'] ?? [];
            $status = $input['status'] ?? null;

            if (empty($studentIds) || !$status) {
                Response::error('Student IDs and status are required', 400, null, 'MISSING_STATUS_DATA');
                return;
            }

            $results = [];
            $successCount = 0;

            foreach ($studentIds as $studentId) {
                try {
                    $success = $this->studentModel->updateStatus($studentId, $status);
                    $results[] = [
                        'student_id' => $studentId,
                        'success' => $success,
                        'message' => $success ? 'Status updated successfully' : 'Failed to update status'
                    ];
                    
                    if ($success) {
                        $successCount++;
                    }
                } catch (Exception $e) {
                    $results[] = [
                        'student_id' => $studentId,
                        'success' => false,
                        'message' => $e->getMessage()
                    ];
                }
            }

            $message = "Status update completed: {$successCount} out of " . count($studentIds) . " students updated";
            Response::bulk($results, $message);
            
        } catch (Exception $e) {
            Response::error('Status update failed: ' . $e->getMessage(), 500, null, 'STUDENT_STATUS_ERROR');
        }
    }

    // Helper methods
    private function checkPermission($roles, $user) {
        if (!in_array($user['role'], $roles)) {
            Response::forbidden('Access denied');
        }
    }

    private function validateStudent($input, $isUpdate = false) {
        $errors = [];

        // Required fields for creation
        if (!$isUpdate) {
            if (empty($input['reg_no'])) {
                $errors['reg_no'] = 'Registration number is required';
            }
            
            if (empty($input['full_name']) && (empty($input['firstName']) || empty($input['lastName']))) {
                $errors['name'] = 'Full name (first and last name) is required';
            }
        }

        // Validate registration number format
        if (isset($input['reg_no']) && !empty($input['reg_no'])) {
            if (!preg_match('/^[A-Z0-9\/-]+$/', $input['reg_no'])) {
                $errors['reg_no'] = 'Registration number format is invalid';
            }
        }

        // Validate email if provided
        if (isset($input['email']) && !empty($input['email'])) {
            if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
                $errors['email'] = 'Invalid email format';
            }
        }

        // Validate phone if provided
        if (isset($input['phone']) && !empty($input['phone'])) {
            if (!preg_match('/^[0-9+\-\s()]+$/', $input['phone'])) {
                $errors['phone'] = 'Invalid phone number format';
            }
        }

        // Validate gender if provided
        if (isset($input['gender']) && !empty($input['gender'])) {
            if (!in_array($input['gender'], ['Male', 'Female'])) {
                $errors['gender'] = 'Gender must be Male or Female';
            }
        }

        // Validate status if provided
        if (isset($input['status']) && !empty($input['status'])) {
            if (!in_array($input['status'], ['Active', 'Inactive', 'Graduated'])) {
                $errors['status'] = 'Status must be Active, Inactive, or Graduated';
            }
        }

        // Validate date of birth if provided
        if (isset($input['dob']) && !empty($input['dob'])) {
            $dob = DateTime::createFromFormat('Y-m-d', $input['dob']);
            if (!$dob || $dob->format('Y-m-d') !== $input['dob']) {
                $errors['dob'] = 'Invalid date format. Use YYYY-MM-DD';
            } elseif ($dob > new DateTime()) {
                $errors['dob'] = 'Date of birth cannot be in the future';
            }
        }

        return $errors;
    }

    private function buildWhereClause($options) {
        $clauses = [];
        
        if (!empty($options['class_id'])) {
            $clauses[] = "class_id = :class_id";
        }
        
        if (!empty($options['parent_id'])) {
            $clauses[] = "parent_id = :parent_id";
        }
        
        if (!empty($options['status'])) {
            $clauses[] = "status = :status";
        }
        
        if (!empty($options['gender'])) {
            $clauses[] = "gender = :gender";
        }
        
        if (!empty($options['academic_year'])) {
            $clauses[] = "academic_year = :academic_year";
        }
        
        if (!empty($options['search'])) {
            $clauses[] = "(full_name LIKE :search OR reg_no LIKE :search OR student_id LIKE :search)";
        }
        
        return empty($clauses) ? '' : implode(' AND ', $clauses);
    }

    private function buildParams($options) {
        $params = [];
        
        if (!empty($options['class_id'])) {
            $params['class_id'] = $options['class_id'];
        }
        
        if (!empty($options['parent_id'])) {
            $params['parent_id'] = $options['parent_id'];
        }
        
        if (!empty($options['status'])) {
            $params['status'] = $options['status'];
        }
        
        if (!empty($options['gender'])) {
            $params['gender'] = $options['gender'];
        }
        
        if (!empty($options['academic_year'])) {
            $params['academic_year'] = $options['academic_year'];
        }
        
        if (!empty($options['search'])) {
            $params['search'] = '%' . $options['search'] . '%';
        }
        
        return $params;
    }
}
