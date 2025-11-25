<?php

/**
 * Class Subject Registration Controller
 * Handles subject registration operations for classes
 */

class ClassSubjectRegistrationController {
    private $registrationModel;
    
    public function __construct() {
        $this->registrationModel = new ClassSubjectRegistration();
    }
    
    /**
     * Get all class subject registrations
     */
    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $options = [];
            
            // Parse query parameters
            if (isset($_GET['class_id'])) {
                $options['class_id'] = (int)$_GET['class_id'];
            }
            
            if (isset($_GET['subject_id'])) {
                $options['subject_id'] = (int)$_GET['subject_id'];
            }
            
            if (isset($_GET['term'])) {
                $options['term'] = $_GET['term'];
            }
            
            if (isset($_GET['academicYear'])) {
                $options['academicYear'] = $_GET['academicYear'];
            }
            
            if (isset($_GET['status'])) {
                $options['status'] = $_GET['status'];
            }
            
            if (isset($_GET['is_core'])) {
                $options['is_core'] = $_GET['is_core'] === 'true';
            }
            
            if (isset($_GET['limit'])) {
                $options['limit'] = (int)$_GET['limit'];
            }
            
            if (isset($_GET['offset'])) {
                $options['offset'] = (int)$_GET['offset'];
            }
            
            $registrations = $this->registrationModel->getAll($options);
            Response::success($registrations, 'Class subject registrations retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve registrations: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Create a new class subject registration
     */
    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validateRegistrationData($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            // Check if already registered
            if ($this->registrationModel->isSubjectRegistered(
                $input['class_id'], 
                $input['subject_id'], 
                $input['term'], 
                $input['academicYear']
            )) {
                Response::error('Subject already registered for this class in the specified term/year', 400);
                return;
            }
            
            $registrationData = [
                'class_id' => $input['class_id'],
                'subject_id' => $input['subject_id'],
                'className' => $input['className'],
                'subjectName' => $input['subjectName'],
                'subjectCode' => $input['subjectCode'],
                'term' => $input['term'],
                'academicYear' => $input['academicYear'],
                'is_core' => $input['is_core'] ?? false,
                'status' => $input['status'] ?? 'Active',
                'registeredBy' => $user['id']
            ];
            
            $registrationId = $this->registrationModel->create($registrationData);
            
            Response::success(['id' => $registrationId], 'Class subject registration created successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to create registration: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Create multiple class subject registrations
     */
    public function createBulk() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['registrations']) || !is_array($input['registrations'])) {
                Response::error('Registrations array is required', 400);
                return;
            }
            
            $validRegistrations = [];
            $errors = [];
            
            foreach ($input['registrations'] as $index => $registration) {
                $regErrors = $this->validateRegistrationData($registration);
                
                if (!empty($regErrors)) {
                    $errors["registration_$index"] = $regErrors;
                    continue;
                }
                
                // Check if already registered
                if ($this->registrationModel->isSubjectRegistered(
                    $registration['class_id'], 
                    $registration['subject_id'], 
                    $registration['term'], 
                    $registration['academicYear']
                )) {
                    $errors["registration_$index"] = ['subject' => 'Subject already registered for this class'];
                    continue;
                }
                
                $validRegistrations[] = [
                    'class_id' => $registration['class_id'],
                    'subject_id' => $registration['subject_id'],
                    'className' => $registration['className'],
                    'subjectName' => $registration['subjectName'],
                    'subjectCode' => $registration['subjectCode'],
                    'term' => $registration['term'],
                    'academicYear' => $registration['academicYear'],
                    'is_core' => $registration['is_core'] ?? false,
                    'status' => $registration['status'] ?? 'Active',
                    'registeredBy' => $user['id'],
                    'registeredDate' => date('Y-m-d H:i:s')
                ];
            }
            
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            if (empty($validRegistrations)) {
                Response::error('No valid registrations to create', 400);
                return;
            }
            
            $success = $this->registrationModel->createBulk($validRegistrations);
            
            if ($success) {
                Response::success(['count' => count($validRegistrations)], 'Class subject registrations created successfully');
            } else {
                Response::error('Failed to create some registrations', 500);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to create registrations: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update a class subject registration
     */
    public function update() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                Response::error('Registration ID is required', 400);
                return;
            }
            
            // Validation
            $errors = $this->validateUpdateData($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            $updateData = [];
            $allowedFields = ['className', 'subjectName', 'subjectCode', 'term', 'academicYear', 'is_core', 'status'];
            
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updateData[$field] = $input[$field];
                }
            }
            
            if (empty($updateData)) {
                Response::error('No valid fields to update', 400);
                return;
            }
            
            $success = $this->registrationModel->update($input['id'], $updateData);
            
            if ($success) {
                Response::success([], 'Class subject registration updated successfully');
            } else {
                Response::error('Failed to update registration or not found', 404);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to update registration: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Delete a class subject registration
     */
    public function delete() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('Registration ID is required', 400);
                return;
            }
            
            $success = $this->registrationModel->delete($id);
            
            if ($success) {
                Response::success([], 'Class subject registration deleted successfully');
            } else {
                Response::error('Failed to delete registration or not found', 404);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to delete registration: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get registrations by class
     */
    public function getByClass() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $classId = $_GET['class_id'] ?? null;
            if (!$classId) {
                Response::error('Class ID is required', 400);
                return;
            }
            
            $options = [];
            
            if (isset($_GET['term'])) {
                $options['term'] = $_GET['term'];
            }
            
            if (isset($_GET['academicYear'])) {
                $options['academicYear'] = $_GET['academicYear'];
            }
            
            if (isset($_GET['status'])) {
                $options['status'] = $_GET['status'];
            }
            
            $registrations = $this->registrationModel->getByClass($classId, $options);
            Response::success($registrations, 'Class registrations retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve registrations: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get registrations by subject
     */
    public function getBySubject() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $subjectId = $_GET['subject_id'] ?? null;
            if (!$subjectId) {
                Response::error('Subject ID is required', 400);
                return;
            }
            
            $options = [];
            
            if (isset($_GET['term'])) {
                $options['term'] = $_GET['term'];
            }
            
            if (isset($_GET['academicYear'])) {
                $options['academicYear'] = $_GET['academicYear'];
            }
            
            if (isset($_GET['status'])) {
                $options['status'] = $_GET['status'];
            }
            
            $registrations = $this->registrationModel->getBySubject($subjectId, $options);
            Response::success($registrations, 'Subject registrations retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve registrations: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get available subjects for a class
     */
    public function getAvailableSubjects() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $classId = $_GET['class_id'] ?? null;
            $term = $_GET['term'] ?? null;
            $academicYear = $_GET['academicYear'] ?? null;
            
            if (!$classId || !$term || !$academicYear) {
                Response::error('Class ID, term, and academic year are required', 400);
                return;
            }
            
            $subjects = $this->registrationModel->getAvailableSubjectsForClass($classId, $term, $academicYear);
            Response::success($subjects, 'Available subjects retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve available subjects: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get registration statistics
     */
    public function getStatistics() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $filters = [];
            
            if (isset($_GET['term'])) {
                $filters['term'] = $_GET['term'];
            }
            
            if (isset($_GET['academicYear'])) {
                $filters['academicYear'] = $_GET['academicYear'];
            }
            
            $statistics = $this->registrationModel->getRegistrationStats($filters);
            Response::success($statistics, 'Registration statistics retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve statistics: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Validate registration data
     */
    private function validateRegistrationData($data) {
        $errors = [];
        
        if (!isset($data['class_id']) || !is_numeric($data['class_id'])) {
            $errors['class_id'] = 'Valid class ID is required';
        }
        
        if (!isset($data['subject_id']) || !is_numeric($data['subject_id'])) {
            $errors['subject_id'] = 'Valid subject ID is required';
        }
        
        if (!isset($data['className']) || empty(trim($data['className']))) {
            $errors['className'] = 'Class name is required';
        }
        
        if (!isset($data['subjectName']) || empty(trim($data['subjectName']))) {
            $errors['subjectName'] = 'Subject name is required';
        }
        
        if (!isset($data['subjectCode']) || empty(trim($data['subjectCode']))) {
            $errors['subjectCode'] = 'Subject code is required';
        }
        
        if (!isset($data['term']) || empty(trim($data['term']))) {
            $errors['term'] = 'Term is required';
        }
        
        if (!isset($data['academicYear']) || empty(trim($data['academicYear']))) {
            $errors['academicYear'] = 'Academic year is required';
        }
        
        return $errors;
    }
    
    /**
     * Validate update data
     */
    private function validateUpdateData($data) {
        $errors = [];
        
        if (isset($data['className']) && empty(trim($data['className']))) {
            $errors['className'] = 'Class name cannot be empty';
        }
        
        if (isset($data['subjectName']) && empty(trim($data['subjectName']))) {
            $errors['subjectName'] = 'Subject name cannot be empty';
        }
        
        if (isset($data['subjectCode']) && empty(trim($data['subjectCode']))) {
            $errors['subjectCode'] = 'Subject code cannot be empty';
        }
        
        if (isset($data['term']) && empty(trim($data['term']))) {
            $errors['term'] = 'Term cannot be empty';
        }
        
        if (isset($data['academicYear']) && empty(trim($data['academicYear']))) {
            $errors['academicYear'] = 'Academic year cannot be empty';
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
