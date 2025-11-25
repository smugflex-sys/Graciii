<?php

class ClassController {
    private $classModel;

    public function __construct() {
        $this->classModel = new ClassModel();
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
            
            if (isset($_GET['level'])) {
                $options['level'] = $_GET['level'];
            }
            
            if (isset($_GET['class_teacher_id'])) {
                $options['class_teacher_id'] = (int)$_GET['class_teacher_id'];
            }
            
            if (isset($_GET['limit'])) {
                $options['limit'] = (int)$_GET['limit'];
            }
            
            // Check if students should be included
            $includeStudents = isset($_GET['include_students']) && $_GET['include_students'] === 'true';
            
            if ($includeStudents) {
                $classes = $this->classModel->getAllWithStudents($options);
            } else {
                $classes = $this->classModel->getAll($options);
            }
            
            Response::success($classes, 'Classes retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve classes: ' . $e->getMessage(), 500);
        }
    }

    public function getById() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Class ID is required', 400);
                return;
            }

            $class = $this->classModel->findById($id);
            if ($class) {
                Response::success($class, 'Class retrieved successfully');
            } else {
                Response::error('Class not found', 404);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve class: ' . $e->getMessage(), 500);
        }
    }

    public function getWithStudents() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Class ID is required', 400);
                return;
            }

            $class = $this->classModel->getWithStudents($id);
            if ($class) {
                Response::success($class, 'Class with students retrieved successfully');
            } else {
                Response::error('Class not found', 404);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve class with students: ' . $e->getMessage(), 500);
        }
    }

    public function getWithSubjects() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Class ID is required', 400);
                return;
            }

            $class = $this->classModel->getWithSubjects($id);
            if ($class) {
                Response::success($class, 'Class with subjects retrieved successfully');
            } else {
                Response::error('Class not found', 404);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve class with subjects: ' . $e->getMessage(), 500);
        }
    }

    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $errors = $this->validateClass($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }

            // Validate teacher assignment if provided
            if (isset($input['class_teacher_id']) && $input['class_teacher_id']) {
                $teacherClasses = $this->classModel->getByTeacher($input['class_teacher_id']);
                
                // Check if teacher is already assigned to another active class
                foreach ($teacherClasses as $teacherClass) {
                    if ($teacherClass['status'] == 'Active') {
                        Response::error('Teacher is already assigned to another active class', 400);
                        return;
                    }
                }
            }

            $classId = $this->classModel->create($input);
            
            if ($classId) {
                $class = $this->classModel->findById($classId);
                Response::success($class, 'Class created successfully', 201);
            } else {
                Response::serverError('Failed to create class');
            }
            
        } catch (Exception $e) {
            Response::error('Failed to create class: ' . $e->getMessage(), 500);
        }
    }

    public function update() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Class ID is required', 400);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            $errors = $this->validateClass($input, true);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }

            // Validate teacher assignment if provided
            if (isset($input['class_teacher_id']) && $input['class_teacher_id']) {
                $teacherClasses = $this->classModel->getByTeacher($input['class_teacher_id']);
                
                // Check if teacher is already assigned to another class (excluding current)
                foreach ($teacherClasses as $teacherClass) {
                    if ($teacherClass['id'] != $id && $teacherClass['status'] == 'Active') {
                        Response::error('Teacher is already assigned to another active class', 400);
                        return;
                    }
                }
            }

            $updated = $this->classModel->update($id, $input);
            
            if ($updated) {
                $class = $this->classModel->findById($id);
                Response::success($class, 'Class updated successfully');
            } else {
                Response::error('Class not found or no changes made', 404);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to update class: ' . $e->getMessage(), 500);
        }
    }

    public function delete() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Class ID is required', 400);
                return;
            }

            $class = $this->classModel->findById($id);
            if (!$class) {
                Response::error('Class not found', 404);
                return;
            }

            // Check if class has students
            $classWithStudents = $this->classModel->getWithStudents($id);
            if ($classWithStudents && !empty($classWithStudents['students'])) {
                Response::error('Cannot delete class with enrolled students', 400);
                return;
            }

            $deleted = $this->classModel->delete($id);
            
            if ($deleted) {
                Response::success(null, 'Class deleted successfully');
            } else {
                Response::serverError('Failed to delete class');
            }
            
        } catch (Exception $e) {
            Response::error('Failed to delete class: ' . $e->getMessage(), 500);
        }
    }

    public function getByLevel() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $level = $_GET['level'] ?? null;
            if (!$level) {
                Response::error('Level is required', 400);
                return;
            }

            $classes = $this->classModel->getByLevel($level);
            Response::success($classes, 'Classes retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve classes by level: ' . $e->getMessage(), 500);
        }
    }

    public function getByTeacher() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $teacherId = $_GET['teacher_id'] ?? null;
            if (!$teacherId) {
                Response::error('Teacher ID is required', 400);
                return;
            }

            $classes = $this->classModel->getByTeacher($teacherId);
            Response::success($classes, 'Classes retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve classes by teacher: ' . $e->getMessage(), 500);
        }
    }

    public function search() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $query = $_GET['q'] ?? '';
            if (strlen($query) < 2) {
                Response::error('Search query must be at least 2 characters', 400);
                return;
            }

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $classes = $this->classModel->search($query, $limit);
            Response::success($classes, 'Classes retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to search classes: ' . $e->getMessage(), 500);
        }
    }

    public function assignSubject() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['class_id'])) {
            Response::error('Class ID is required', 400);
            return;
        }
        
        if (!isset($input['subject_id'])) {
            Response::error('Subject ID is required', 400);
            return;
        }

        $assigned = $this->classModel->assignSubject($input['class_id'], $input['subject_id']);
        
        if ($assigned) {
            Response::success(null, 'Subject assigned to class successfully');
        } else {
            Response::error('Subject already assigned to class', 409);
        }
    }

    public function removeSubject() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['class_id'])) {
            Response::error('Class ID is required', 400);
            return;
        }
        
        if (!isset($input['subject_id'])) {
            Response::error('Subject ID is required', 400);
            return;
        }

        $removed = $this->classModel->removeSubject($input['class_id'], $input['subject_id']);
        
        if ($removed) {
            Response::success(null, 'Subject removed from class successfully');
        } else {
            Response::error('Subject not assigned to class', 404);
        }
    }

    public function getLevels() {
        $levels = $this->classModel->getLevels();
        Response::success($levels, 'Class levels retrieved successfully');
        return; // Explicit return to fix warning
    }

    public function getStats() {
        $totalCount = $this->classModel->getTotalCount();
        $activeCount = $this->classModel->getTotalCount('active');
        
        Response::success([
            'total_classes' => $totalCount,
            'active_classes' => $activeCount,
            'inactive_classes' => $totalCount - $activeCount
        ], 'Class statistics retrieved');
    }

    private function validateClass($input, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate || isset($input['name'])) {
            if (!isset($input['name']) || strlen(trim($input['name'])) < 2) {
                $errors['name'] = 'Class name must be at least 2 characters';
            }
        }
        
        if (!$isUpdate || isset($input['level'])) {
            if (!isset($input['level']) || strlen(trim($input['level'])) < 1) {
                $errors['level'] = 'Level is required';
            }
        }
        
        if (isset($input['capacity'])) {
            if (!is_numeric($input['capacity']) || $input['capacity'] < 1 || $input['capacity'] > 100) {
                $errors['capacity'] = 'Capacity must be a number between 1 and 100';
            }
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
