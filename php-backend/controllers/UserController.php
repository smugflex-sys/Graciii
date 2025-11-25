<?php

class UserController {
    private $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $options = [];
            
            // Parse query parameters
            if (isset($_GET['page'])) {
                $options['page'] = (int)$_GET['page'];
            }
            
            if (isset($_GET['limit'])) {
                $options['limit'] = (int)$_GET['limit'];
            }
            
            if (isset($_GET['role'])) {
                $options['role'] = $_GET['role'];
            }
            
            if (isset($_GET['status'])) {
                $options['status'] = $_GET['status'];
            }
            
            if (isset($_GET['search'])) {
                $options['search'] = $_GET['search'];
            }
            
            $result = $this->userModel->getAll($options);
            
            Response::success($result, 'Users retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve users: ' . $e->getMessage(), 500);
        }
    }

    public function getById() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('User ID is required', 400);
                return;
            }

            $user = $this->userModel->findById($id);
            if ($user) {
                // Remove password hash from response
                unset($user['password_hash']);
                Response::success($user, 'User retrieved successfully');
            } else {
                Response::error('User not found', 404);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve user: ' . $e->getMessage(), 500);
        }
    }

    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Map frontend field names to backend field names with role-specific data
            $mappedInput = [
                'name' => $input['fullName'] ?? $input['name'] ?? '',
                'email' => $input['email'] ?? '',
                'phone' => $input['phone'] ?? '',
                'role' => $input['role'] ?? '',
                'password' => $input['password'] ?? '',
                'status' => $input['status'] ?? 'active',
                // Common fields
                'photo_url' => $input['photoUrl'] ?? $input['photo_url'] ?? null,
                'date_of_birth' => $input['dateOfBirth'] ?? $input['date_of_birth'] ?? null,
                'gender' => $input['gender'] ?? null,
            ];
            
            // Add role-specific fields based on the role
            switch ($mappedInput['role']) {
                case 'teacher':
                    $mappedInput['employee_id'] = $input['employeeId'] ?? $input['employee_id'] ?? null;
                    $mappedInput['qualification'] = $input['qualification'] ?? null;
                    $mappedInput['specialization'] = $input['specialization'] ?? [];
                    $mappedInput['is_class_teacher'] = $input['isClassTeacher'] ?? $input['is_class_teacher'] ?? 0;
                    $mappedInput['class_teacher_id'] = $input['classTeacherId'] ?? $input['class_teacher_id'] ?? null;
                    break;
                    
                case 'parent':
                    $mappedInput['student_ids'] = $input['studentIds'] ?? $input['student_ids'] ?? [];
                    $mappedInput['occupation'] = $input['occupation'] ?? null;
                    $mappedInput['address'] = $input['address'] ?? null;
                    break;
                    
                case 'accountant':
                    $mappedInput['employee_id'] = $input['employeeId'] ?? $input['employee_id'] ?? null;
                    $mappedInput['department'] = $input['department'] ?? null;
                    $mappedInput['employee_level'] = $input['employeeLevel'] ?? $input['employee_level'] ?? null;
                    break;
            }
            
            $errors = $this->validateUser($mappedInput);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }

            // Check if email already exists
            $existingUser = $this->userModel->findByEmail($mappedInput['email']);
            if ($existingUser) {
                Response::error('Email already exists', 409);
                return;
            }

            // Hash password
            $mappedInput['password_hash'] = password_hash($mappedInput['password'], PASSWORD_DEFAULT);
            unset($mappedInput['password']);

            $userId = $this->userModel->create($mappedInput);
            
            if ($userId) {
                // Clear cache after creating user
                CacheMiddleware::clear('users');
                
                $user = $this->userModel->findById($userId);
                // Remove password hash from response
                unset($user['password_hash']);
                Response::success($user, 'User created successfully', 201);
            } else {
                Response::serverError('Failed to create user');
            }
            
        } catch (Exception $e) {
            Response::error('Failed to create user: ' . $e->getMessage(), 500);
        }
    }

    public function update() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('User ID is required', 400);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            // Map frontend field names to backend field names
            $mappedInput = [];
            
            // Common fields
            if (isset($input['fullName'])) {
                $mappedInput['name'] = $input['fullName'];
            }
            if (isset($input['email'])) {
                $mappedInput['email'] = $input['email'];
            }
            if (isset($input['phone'])) {
                $mappedInput['phone'] = $input['phone'];
            }
            if (isset($input['role'])) {
                $mappedInput['role'] = $input['role'];
            }
            if (isset($input['password'])) {
                $mappedInput['password'] = $input['password'];
            }
            if (isset($input['status'])) {
                $mappedInput['status'] = $input['status'];
            }
            
            // Common additional fields
            if (isset($input['photoUrl']) || isset($input['photo_url'])) {
                $mappedInput['photo_url'] = $input['photoUrl'] ?? $input['photo_url'];
            }
            if (isset($input['dateOfBirth']) || isset($input['date_of_birth'])) {
                $mappedInput['date_of_birth'] = $input['dateOfBirth'] ?? $input['date_of_birth'];
            }
            if (isset($input['gender'])) {
                $mappedInput['gender'] = $input['gender'];
            }
            
            // Role-specific fields
            $userRole = $input['role'] ?? null;
            if ($userRole) {
                switch ($userRole) {
                    case 'teacher':
                        if (isset($input['employeeId']) || isset($input['employee_id'])) {
                            $mappedInput['employee_id'] = $input['employeeId'] ?? $input['employee_id'];
                        }
                        if (isset($input['qualification'])) {
                            $mappedInput['qualification'] = $input['qualification'];
                        }
                        if (isset($input['specialization'])) {
                            $mappedInput['specialization'] = $input['specialization'];
                        }
                        if (isset($input['isClassTeacher']) || isset($input['is_class_teacher'])) {
                            $mappedInput['is_class_teacher'] = $input['isClassTeacher'] ?? $input['is_class_teacher'];
                        }
                        if (isset($input['classTeacherId']) || isset($input['class_teacher_id'])) {
                            $mappedInput['class_teacher_id'] = $input['classTeacherId'] ?? $input['class_teacher_id'];
                        }
                        break;
                        
                    case 'parent':
                        if (isset($input['studentIds']) || isset($input['student_ids'])) {
                            $mappedInput['student_ids'] = $input['studentIds'] ?? $input['student_ids'];
                        }
                        if (isset($input['occupation'])) {
                            $mappedInput['occupation'] = $input['occupation'];
                        }
                        if (isset($input['address'])) {
                            $mappedInput['address'] = $input['address'];
                        }
                        break;
                        
                    case 'accountant':
                        if (isset($input['employeeId']) || isset($input['employee_id'])) {
                            $mappedInput['employee_id'] = $input['employeeId'] ?? $input['employee_id'];
                        }
                        if (isset($input['department'])) {
                            $mappedInput['department'] = $input['department'];
                        }
                        if (isset($input['employeeLevel']) || isset($input['employee_level'])) {
                            $mappedInput['employee_level'] = $input['employeeLevel'] ?? $input['employee_level'];
                        }
                        break;
                }
            }
            
            $errors = $this->validateUser($mappedInput, true);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }

            // Check if email already exists (excluding current user)
            if (isset($mappedInput['email'])) {
                $existingUser = $this->userModel->findByEmail($mappedInput['email']);
                if ($existingUser && $existingUser['id'] != $id) {
                    Response::error('Email already exists', 409);
                    return;
                }
            }

            // Hash password if provided
            if (isset($mappedInput['password'])) {
                $mappedInput['password_hash'] = password_hash($mappedInput['password'], PASSWORD_DEFAULT);
                unset($mappedInput['password']);
            }

            $updated = $this->userModel->update($id, $mappedInput);
            
            if ($updated) {
                $user = $this->userModel->findById($id);
                unset($user['password_hash']);
                Response::success($user, 'User updated successfully');
            } else {
                Response::error('User not found or no changes made', 404);
            }
            
        } catch (Exception $e) {
            Response::error('Failed to update user: ' . $e->getMessage(), 500);
        }
    }

    public function delete() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $id = $_GET['id'] ?? null;
            if (!$id) {
                Response::error('User ID is required', 400);
                return;
            }

            // Prevent users from deleting themselves
            if ($user['id'] == $id) {
                Response::error('Cannot delete your own account', 400);
                return;
            }

            $userToDelete = $this->userModel->findById($id);
            if (!$userToDelete) {
                Response::error('User not found', 404);
                return;
            }

            $deleted = $this->userModel->softDelete($id, $user['id']);
            
            if ($deleted) {
                Response::success(null, 'User deleted successfully');
            } else {
                Response::serverError('Failed to delete user');
            }
            
        } catch (Exception $e) {
            Response::error('Failed to delete user: ' . $e->getMessage(), 500);
        }
    }

    public function getStats() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $stats = $this->userModel->getStats();
            Response::success($stats, 'User statistics retrieved');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve user statistics: ' . $e->getMessage(), 500);
        }
    }

    public function getByRole() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $role = $_GET['role'] ?? null;
            if (!$role) {
                Response::error('Role is required', 400);
                return;
            }

            $users = $this->userModel->findByRole($role);
            Response::success($users, 'Users retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve users by role: ' . $e->getMessage(), 500);
        }
    }

    public function search() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $query = $_GET['q'] ?? '';
            if (strlen($query) < 2) {
                Response::error('Search query must be at least 2 characters', 400);
                return;
            }

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $users = $this->userModel->search($query, $limit);
            Response::success($users, 'Users retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to search users: ' . $e->getMessage(), 500);
        }
    }

    public function updateStatus() {
        $id = $_GET['id'] ?? null;
        $status = $_GET['status'] ?? null;
        
        if (!$id) {
            Response::error('User ID is required', 400);
            return;
        }
        
        if (!$status || !in_array($status, ['active', 'inactive'])) {
            Response::error('Status must be active or inactive', 400);
            return;
        }

        $updated = $this->userModel->update($id, ['status' => $status]);
        
        if ($updated) {
            $user = $this->userModel->findById($id);
            unset($user['password_hash']);
            Response::success($user, 'User status updated successfully');
        } else {
            Response::error('User not found', 404);
        }
    }

    private function validateUser($input, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate || isset($input['name'])) {
            if (!isset($input['name']) || strlen(trim($input['name'])) < 2) {
                $errors['name'] = 'Name must be at least 2 characters';
            }
        }
        
        if (!$isUpdate || isset($input['email'])) {
            if (!isset($input['email']) || !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
                $errors['email'] = 'Valid email is required';
            }
        }
        
        if (!$isUpdate || isset($input['password'])) {
            if (!isset($input['password']) || strlen($input['password']) < 6) {
                $errors['password'] = 'Password must be at least 6 characters';
            }
        }
        
        if (isset($input['phone']) && !empty($input['phone'])) {
            if (!preg_match('/^[+]?[\d\s\-\(\)]+$/', $input['phone'])) {
                $errors['phone'] = 'Invalid phone number format';
            }
        }
        
        if (isset($input['role']) && !in_array($input['role'], ['admin', 'teacher', 'parent', 'accountant'])) {
            $errors['role'] = 'Invalid role. Must be admin, teacher, parent, or accountant';
        }
        
        if (isset($input['status']) && !in_array($input['status'], ['active', 'inactive'])) {
            $errors['status'] = 'Status must be active or inactive';
        }
        
        // Role-specific validation
        if (isset($input['role'])) {
            switch ($input['role']) {
                case 'teacher':
                    if (isset($input['is_class_teacher']) && $input['is_class_teacher'] == 1) {
                        if (!isset($input['class_teacher_id']) || empty($input['class_teacher_id'])) {
                            $errors['class_teacher_id'] = 'Class assignment is required for class teachers';
                        }
                    }
                    if (isset($input['employee_id']) && strlen(trim($input['employee_id'])) < 2) {
                        $errors['employee_id'] = 'Employee ID must be at least 2 characters';
                    }
                    break;
                    
                case 'parent':
                    // Parent-specific validation if needed
                    break;
                    
                case 'accountant':
                    if (isset($input['employee_id']) && strlen(trim($input['employee_id'])) < 2) {
                        $errors['employee_id'] = 'Employee ID must be at least 2 characters';
                    }
                    break;
            }
        }
        
        // Common field validation
        if (isset($input['date_of_birth']) && !empty($input['date_of_birth'])) {
            $dob = DateTime::createFromFormat('Y-m-d', $input['date_of_birth']);
            if (!$dob || $dob->format('Y-m-d') !== $input['date_of_birth']) {
                $errors['date_of_birth'] = 'Invalid date format. Use YYYY-MM-DD';
            }
        }
        
        if (isset($input['gender']) && !in_array($input['gender'], ['male', 'female', 'other'])) {
            $errors['gender'] = 'Gender must be male, female, or other';
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
