<?php

class SubjectController {
    private $subjectModel;

    public function __construct() {
        $this->subjectModel = new Subject();
    }

    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $options = [];
            
            // Parse query parameters
            if (isset($_GET['status'])) {
                $options['status'] = $_GET['status'];
            }
            
            if (isset($_GET['is_core'])) {
                $options['is_core'] = filter_var($_GET['is_core'], FILTER_VALIDATE_BOOLEAN);
            }
            
            if (isset($_GET['limit'])) {
                $options['limit'] = (int)$_GET['limit'];
            }
            
            $subjects = $this->subjectModel->getAll($options);
            Response::success($subjects, 'Subjects retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve subjects: ' . $e->getMessage(), 500);
        }
    }

    public function getById() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Subject ID is required', 400);
                return;
            }

            $subject = $this->subjectModel->findById($id);
            if ($subject) {
                Response::success($subject, 'Subject retrieved successfully');
            } else {
                Response::error('Subject not found', 404);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve subject: ' . $e->getMessage(), 500);
        }
    }

    public function getWithClasses() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Subject ID is required', 400);
            return;
        }

        $subject = $this->subjectModel->getWithClasses($id);
        if ($subject) {
            Response::success($subject, 'Subject with classes retrieved successfully');
        } else {
            Response::error('Subject not found', 404);
        }
    }

    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $errors = $this->validateSubject($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }

            // Check if subject name already exists
            $existingSubject = $this->subjectModel->findByName($input['name']);
            if ($existingSubject) {
                Response::error('Subject name already exists', 409);
                return;
            }

            // Check if subject code already exists
            if (isset($input['code']) && !empty($input['code'])) {
                $existingCode = $this->subjectModel->findByCode($input['code']);
                if ($existingCode) {
                    Response::error('Subject code already exists', 409);
                    return;
                }
            }

            $subjectId = $this->subjectModel->create($input);
            
            if ($subjectId) {
                $subject = $this->subjectModel->findById($subjectId);
                Response::success($subject, 'Subject created successfully', 201);
            } else {
                Response::serverError('Failed to create subject');
            }
            
        } catch (Exception $e) {
            Response::error('Failed to create subject: ' . $e->getMessage(), 500);
        }
    }

    public function update() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Subject ID is required', 400);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            $errors = $this->validateSubject($input, true);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }

            // Check if subject name already exists (excluding current subject)
            if (isset($input['name'])) {
                $existingSubject = $this->subjectModel->findByName($input['name']);
                if ($existingSubject && $existingSubject['id'] != $id) {
                    Response::error('Subject name already exists', 409);
                    return;
                }
            }

            // Check if subject code already exists (excluding current subject)
            if (isset($input['code']) && !empty($input['code'])) {
                $existingCode = $this->subjectModel->findByCode($input['code']);
                if ($existingCode && $existingCode['id'] != $id) {
                    Response::error('Subject code already exists', 409);
                    return;
                }
            }

            $updated = $this->subjectModel->update($id, $input);
            
            if ($updated) {
                $subject = $this->subjectModel->findById($id);
                Response::success($subject, 'Subject updated successfully');
            } else {
                Response::error('Subject not found or no changes made', 404);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to update subject: ' . $e->getMessage(), 500);
        }
    }

    public function delete() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Subject ID is required', 400);
                return;
            }

            $subject = $this->subjectModel->findById($id);
            if (!$subject) {
                Response::error('Subject not found', 404);
                return;
            }

            // Check if subject is assigned to any classes
            $subjectWithClasses = $this->subjectModel->getWithClasses($id);
            if ($subjectWithClasses && !empty($subjectWithClasses['classes'])) {
                Response::error('Cannot delete subject assigned to classes', 400);
                return;
            }

            $deleted = $this->subjectModel->delete($id);
            
            if ($deleted) {
                Response::success(null, 'Subject deleted successfully');
            } else {
                Response::serverError('Failed to delete subject');
            }
            
        } catch (Exception $e) {
            Response::error('Failed to delete subject: ' . $e->getMessage(), 500);
        }
    }

    public function getCoreSubjects() {
        $subjects = $this->subjectModel->getCoreSubjects();
        Response::success($subjects, 'Core subjects retrieved successfully');
    }

    public function getElectiveSubjects() {
        $subjects = $this->subjectModel->getElectiveSubjects();
        Response::success($subjects, 'Elective subjects retrieved successfully');
    }

    public function search() {
        $query = $_GET['q'] ?? '';
        if (strlen($query) < 2) {
            Response::error('Search query must be at least 2 characters', 400);
            return;
        }

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $subjects = $this->subjectModel->search($query, $limit);
        Response::success($subjects, 'Subjects retrieved successfully');
    }

    public function assignToClass() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['subject_id'])) {
            Response::error('Subject ID is required', 400);
            return;
        }
        
        if (!isset($input['class_id'])) {
            Response::error('Class ID is required', 400);
            return;
        }

        // Validate subject exists
        $subject = $this->subjectModel->findById($input['subject_id']);
        if (!$subject) {
            Response::error('Subject not found', 404);
            return;
        }

        // Check class subject capacity (max 15 subjects per class)
        $subjectWithClasses = $this->subjectModel->getWithClasses($input['subject_id']);
        if ($subjectWithClasses && !empty($subjectWithClasses['classes'])) {
            $currentClassCount = count($subjectWithClasses['classes']);
            if ($currentClassCount >= 15) {
                Response::error('Subject has reached maximum class assignment limit (15 classes)', 400);
                return;
            }
        }

        $assigned = $this->subjectModel->assignToClass($input['subject_id'], $input['class_id']);
        
        if ($assigned) {
            Response::success(null, 'Subject assigned to class successfully');
        } else {
            Response::error('Subject already assigned to class', 409);
        }
    }

    public function removeFromClass() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['subject_id'])) {
            Response::error('Subject ID is required', 400);
            return;
        }
        
        if (!isset($input['class_id'])) {
            Response::error('Class ID is required', 400);
            return;
        }

        $removed = $this->subjectModel->removeFromClass($input['subject_id'], $input['class_id']);
        
        if ($removed) {
            Response::success(null, 'Subject removed from class successfully');
        } else {
            Response::error('Subject not assigned to class', 404);
        }
    }

    public function getSubjectsNotInClass() {
        $classId = $_GET['class_id'] ?? null;
        if (!$classId) {
            Response::error('Class ID is required', 400);
            return;
        }

        $subjects = $this->subjectModel->getSubjectsNotInClass($classId);
        Response::success($subjects, 'Subjects not in class retrieved successfully');
    }

    public function getStats() {
        $stats = $this->subjectModel->getStats();
        Response::success($stats, 'Subject statistics retrieved');
    }

    public function getWithTeachers() {
        $id = $_GET['id'] ?? null;
        $classId = $_GET['class_id'] ?? null;
        
        if (!$id) {
            Response::error('Subject ID is required', 400);
            return;
        }

        $subject = $this->subjectModel->getWithTeachers($id, $classId);
        if ($subject) {
            Response::success($subject, 'Subject with teachers retrieved successfully');
        } else {
            Response::error('Subject not found', 404);
        }
    }

    public function assignToTeacher() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['subject_id'])) {
                Response::error('Subject ID is required', 400);
                return;
            }
            
            if (!isset($input['teacher_id'])) {
                Response::error('Teacher ID is required', 400);
                return;
            }

            // Validate subject exists
            $subject = $this->subjectModel->findById($input['subject_id']);
            if (!$subject) {
                Response::error('Subject not found', 404);
                return;
            }

            // Check teacher workload (max 20 subjects per teacher)
            $currentAssignments = $this->subjectModel->getTeacherSubjects($input['teacher_id']);
            if (count($currentAssignments) >= 20) {
                Response::error('Teacher has reached maximum subject assignment limit (20 subjects)', 400);
                return;
            }

            // Check for duplicate assignment
            $existingAssignments = $this->subjectModel->getTeacherSubjects($input['teacher_id'], [
                'class_id' => $input['class_id'] ?? null
            ]);
            $duplicateExists = false;
            foreach ($existingAssignments as $assignment) {
                if ($assignment['id'] == $input['subject_id']) {
                    $duplicateExists = true;
                    break;
                }
            }
            
            if ($duplicateExists) {
                Response::error('Teacher is already assigned to this subject', 409);
                return;
            }

            // Prepare assignment options
            $options = [
                'academic_year' => $input['academic_year'] ?? null,
                'term' => $input['term'] ?? null,
                'is_primary_teacher' => $input['is_primary_teacher'] ?? false,
                'status' => $input['status'] ?? 'Active'
            ];

            $assigned = $this->subjectModel->assignToTeacher(
                $input['subject_id'], 
                $input['teacher_id'], 
                $input['class_id'] ?? null, 
                $options
            );
            
            if ($assigned) {
                Response::success(null, 'Subject assigned to teacher successfully');
            } else {
                Response::error('Assignment already exists or failed', 409);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to assign subject to teacher: ' . $e->getMessage(), 500);
        }
    }

    public function removeTeacherAssignment() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['subject_id'])) {
                Response::error('Subject ID is required', 400);
                return;
            }
            
            if (!isset($input['teacher_id'])) {
                Response::error('Teacher ID is required', 400);
                return;
            }

            $removed = $this->subjectModel->removeTeacherAssignment(
                $input['subject_id'], 
                $input['teacher_id'], 
                $input['class_id'] ?? null
            );
            
            if ($removed) {
                Response::success(null, 'Teacher assignment removed successfully');
            } else {
                Response::error('Assignment not found', 404);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to remove teacher assignment: ' . $e->getMessage(), 500);
        }
    }

    public function getTeacherSubjects() {
        $teacherId = $_GET['teacher_id'] ?? null;
        if (!$teacherId) {
            Response::error('Teacher ID is required', 400);
            return;
        }

        $options = [];
        if (isset($_GET['class_id'])) {
            $options['class_id'] = (int)$_GET['class_id'];
        }
        if (isset($_GET['academic_year'])) {
            $options['academic_year'] = $_GET['academic_year'];
        }
        if (isset($_GET['term'])) {
            $options['term'] = $_GET['term'];
        }

        $subjects = $this->subjectModel->getTeacherSubjects($teacherId, $options);
        Response::success($subjects, 'Teacher subjects retrieved successfully');
    }

    public function getSubjectsByDepartment() {
        $department = $_GET['department'] ?? null;
        if (!$department) {
            Response::error('Department is required', 400);
            return;
        }

        $subjects = $this->subjectModel->getSubjectsByDepartment($department);
        Response::success($subjects, 'Department subjects retrieved successfully');
    }

    public function getDepartmentStats() {
        $stats = $this->subjectModel->getDepartmentStats();
        Response::success($stats, 'Department statistics retrieved');
    }

    private function validateSubject($input, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate || isset($input['name'])) {
            if (!isset($input['name']) || strlen(trim($input['name'])) < 2) {
                $errors['name'] = 'Subject name must be at least 2 characters';
            }
        }
        
        if (isset($input['code']) && !empty($input['code'])) {
            if (strlen(trim($input['code'])) < 2) {
                $errors['code'] = 'Subject code must be at least 2 characters';
            }
            
            if (isset($input['code']) && !preg_match('/^[A-Z0-9_-]+$/', strtoupper($input['code']))) {
                $errors['code'] = 'Subject code can only contain letters, numbers, underscores, and hyphens';
            }
        }
        
        if (isset($input['department']) && !empty($input['department'])) {
            $allowedDepartments = ['Sciences', 'Arts', 'Commercial', 'Technology', 'General'];
            if (!in_array($input['department'], $allowedDepartments)) {
                $errors['department'] = 'Department must be one of: ' . implode(', ', $allowedDepartments);
            }
        }
        
        if (isset($input['credit_units'])) {
            if (!is_numeric($input['credit_units']) || $input['credit_units'] < 1 || $input['credit_units'] > 10) {
                $errors['credit_units'] = 'Credit units must be a number between 1 and 10';
            }
        }
        
        if (isset($input['description']) && !empty($input['description'])) {
            if (strlen(trim($input['description'])) < 10) {
                $errors['description'] = 'Description must be at least 10 characters';
            }
            if (strlen($input['description']) > 1000) {
                $errors['description'] = 'Description cannot exceed 1000 characters';
            }
        }
        
        if (isset($input['is_core']) && !is_bool($input['is_core'])) {
            $errors['is_core'] = 'is_core must be a boolean value';
        }
        
        if (isset($input['status']) && !in_array($input['status'], ['Active', 'Inactive'])) {
            $errors['status'] = 'Status must be Active or Inactive';
        }
        
        return $errors;
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
