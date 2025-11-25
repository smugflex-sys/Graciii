<?php

class SessionController {
    private $sessionModel;

    public function __construct() {
        $this->sessionModel = new Session();
    }

    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $sessions = $this->sessionModel->getAll();
            Response::success($sessions, 'Sessions retrieved successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 403);
        }
    }

    public function getActive() {
        $activeSession = $this->sessionModel->getActiveSession();
        if ($activeSession) {
            Response::success($activeSession, 'Active session retrieved');
        } else {
            Response::success(null, 'No active session found');
        }
    }

    public function getById() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Session ID is required', 400);
            return;
        }

        $session = $this->sessionModel->getWithTerms($id);
        if ($session) {
            Response::success($session, 'Session retrieved successfully');
        } else {
            Response::error('Session not found', 404);
        }
    }

    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $errors = $this->validateSession($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }

            // Check if session name already exists
            $existingSession = $this->sessionModel->findByName($input['name']);
            if ($existingSession) {
                Response::error('Session name already exists', 409);
                return;
            }

            $sessionId = $this->sessionModel->create($input);
            
            if ($sessionId) {
                $session = $this->sessionModel->findById($sessionId);
                Response::success($session, 'Session created successfully', 201);
            } else {
                Response::serverError('Failed to create session');
            }
        } catch (Exception $e) {
            Response::error($e->getMessage(), 403);
        }
    }

    public function update() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Session ID is required', 400);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        
        $errors = $this->validateSession($input, true);
        if (!empty($errors)) {
            Response::validation($errors);
            return;
        }

        // Check if session name already exists (excluding current session)
        if (isset($input['name'])) {
            $existingSession = $this->sessionModel->findByName($input['name']);
            if ($existingSession && $existingSession['id'] != $id) {
                Response::error('Session name already exists', 409);
                return;
            }
        }

        $updated = $this->sessionModel->update($id, $input);
        
        if ($updated) {
            $session = $this->sessionModel->findById($id);
            Response::success($session, 'Session updated successfully');
        } else {
            Response::error('Session not found or no changes made', 404);
        }
    }

    public function delete() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Session ID is required', 400);
            return;
        }

        $session = $this->sessionModel->findById($id);
        if (!$session) {
            Response::error('Session not found', 404);
            return;
        }

        // Don't allow deletion of active session
        if ($session['is_active']) {
            Response::error('Cannot delete active session', 400);
            return;
        }

        $deleted = $this->sessionModel->delete($id);
        
        if ($deleted) {
            Response::success(null, 'Session deleted successfully');
        } else {
            Response::serverError('Failed to delete session');
        }
    }

    public function setActive() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Session ID is required', 400);
            return;
        }

        $session = $this->sessionModel->findById($id);
        if (!$session) {
            Response::error('Session not found', 404);
            return;
        }

        $updated = $this->sessionModel->setActive($id, true);
        
        if ($updated) {
            $activeSession = $this->sessionModel->getActiveSession();
            Response::success($activeSession, 'Session set as active successfully');
        } else {
            Response::serverError('Failed to set active session');
        }
    }

    public function getStats() {
        $totalCount = $this->sessionModel->getTotalCount();
        $activeCount = $this->sessionModel->getActiveCount();
        
        Response::success([
            'total_sessions' => $totalCount,
            'active_sessions' => $activeCount,
            'inactive_sessions' => $totalCount - $activeCount
        ], 'Session statistics retrieved');
    }

    private function validateSession($input, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate || isset($input['name'])) {
            if (!isset($input['name']) || strlen(trim($input['name'])) < 3) {
                $errors['name'] = 'Session name must be at least 3 characters';
            }
            
            if (isset($input['name']) && !preg_match('/^[0-9]{4}\/[0-9]{4}$/', $input['name'])) {
                $errors['name'] = 'Session name must be in format YYYY/YYYY (e.g., 2024/2025)';
            }
        }
        
        if (isset($input['is_active']) && !is_bool($input['is_active'])) {
            $errors['is_active'] = 'is_active must be a boolean value';
        }
        
        // Validate status enum
        if (isset($input['status']) && !in_array($input['status'], ['Active', 'Inactive'])) {
            $errors['status'] = 'Status must be Active or Inactive';
        }
        
        // Validate date ranges
        if (isset($input['start_date']) && isset($input['end_date'])) {
            if (strtotime($input['start_date']) >= strtotime($input['end_date'])) {
                $errors['date_range'] = 'Start date must be before end date';
            }
        }
        
        return $errors;
    }
    
    private function checkPermission($roles, $user) {
        if (!in_array($user['role'], $roles)) {
            throw new Exception('Access denied. Admin privileges required.');
        }
    }
}
