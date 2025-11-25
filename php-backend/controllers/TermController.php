<?php

class TermController {
    private $termModel;

    public function __construct() {
        $this->termModel = new Term();
    }

    public function getAll() {
        $options = [];
        
        // Parse query parameters
        if (isset($_GET['session_id'])) {
            $options['session_id'] = (int)$_GET['session_id'];
        }
        
        if (isset($_GET['is_active'])) {
            $options['is_active'] = filter_var($_GET['is_active'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($_GET['status'])) {
            $options['status'] = $_GET['status'];
        }
        
        if (isset($_GET['limit'])) {
            $options['limit'] = (int)$_GET['limit'];
        }
        
        $terms = $this->termModel->getAll($options);
        Response::success($terms, 'Terms retrieved successfully');
    }

    public function getById() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Term ID is required', 400);
            return;
        }

        $term = $this->termModel->findById($id);
        if ($term) {
            Response::success($term, 'Term retrieved successfully');
        } else {
            Response::error('Term not found', 404);
        }
    }

    public function getActive() {
        $term = $this->termModel->getActive();
        if ($term) {
            Response::success($term, 'Active term retrieved successfully');
        } else {
            Response::error('No active term found', 404);
        }
    }

    public function getCurrent() {
        $term = $this->termModel->getCurrentTerm();
        if ($term) {
            Response::success($term, 'Current term retrieved successfully');
        } else {
            Response::error('No current term found', 404);
        }
    }

    public function getBySession() {
        $sessionId = $_GET['session_id'] ?? null;
        if (!$sessionId) {
            Response::error('Session ID is required', 400);
            return;
        }

        $terms = $this->termModel->getBySession($sessionId);
        Response::success($terms, 'Terms retrieved successfully');
    }

    public function create() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $errors = $this->validateTerm($input);
        if (!empty($errors)) {
            Response::validation($errors);
            return;
        }

        // Validate term dates
        $dateErrors = $this->termModel->validateTermDates($input);
        if (!empty($dateErrors)) {
            Response::error(implode(', ', $dateErrors), 400);
            return;
        }

        // If this term is set as active, deactivate other terms in the same session
        if (isset($input['is_active']) && $input['is_active']) {
            $this->termModel->setActive(0); // Will be updated after creation
        }

        $createdId = $this->termModel->create($input);
        
        if ($createdId) {
            $term = $this->termModel->findById($createdId);
            Response::success($term, 'Term created successfully', 201);
        } else {
            Response::serverError('Failed to create term');
        }
    }

    public function update() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Term ID is required', 400);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        
        $errors = $this->validateTerm($input, true);
        if (!empty($errors)) {
            Response::validation($errors);
            return;
        }

        // Validate term dates
        $dateErrors = $this->termModel->validateTermDates($input);
        if (!empty($dateErrors)) {
            Response::error(implode(', ', $dateErrors), 400);
            return;
        }

        // If this term is set as active, deactivate other terms in the same session
        if (isset($input['is_active']) && $input['is_active']) {
            $this->termModel->setActive($id);
        }

        $updated = $this->termModel->update($id, $input);
        
        if ($updated) {
            $term = $this->termModel->findById($id);
            Response::success($term, 'Term updated successfully');
        } else {
            Response::error('Term not found or no changes made', 404);
        }
    }

    public function delete() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Term ID is required', 400);
            return;
        }

        $term = $this->termModel->findById($id);
        if (!$term) {
            Response::error('Term not found', 404);
            return;
        }

        // Check if term has associated scores
        $termWithScores = $this->termModel->getWithScores($id);
        if ($termWithScores && $termWithScores['score_count'] > 0) {
            Response::error('Cannot delete term with associated scores', 400);
            return;
        }

        $deleted = $this->termModel->delete($id);
        
        if ($deleted) {
            Response::success(null, 'Term deleted successfully');
        } else {
            Response::serverError('Failed to delete term');
        }
    }

    public function setActive() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Term ID is required', 400);
            return;
        }

        $term = $this->termModel->findById($id);
        if (!$term) {
            Response::error('Term not found', 404);
            return;
        }

        $setActive = $this->termModel->setActive($id);
        
        if ($setActive) {
            $updatedTerm = $this->termModel->findById($id);
            Response::success($updatedTerm, 'Term set as active successfully');
        } else {
            Response::serverError('Failed to set term as active');
        }
    }

    public function getStats() {
        $stats = $this->termModel->getStats();
        Response::success($stats, 'Term statistics retrieved');
    }

    public function search() {
        $query = $_GET['q'] ?? '';
        if (strlen($query) < 2) {
            Response::error('Search query must be at least 2 characters', 400);
            return;
        }

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $terms = $this->termModel->search($query, $limit);
        Response::success($terms, 'Terms retrieved successfully');
    }

    private function validateTerm($input, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate || isset($input['name'])) {
            if (!isset($input['name']) || strlen(trim($input['name'])) < 2) {
                $errors['name'] = 'Term name must be at least 2 characters';
            }
        }
        
        if (!$isUpdate || isset($input['session_id'])) {
            if (!isset($input['session_id']) || !is_numeric($input['session_id'])) {
                $errors['session_id'] = 'Valid session ID is required';
            }
        }
        
        if (isset($input['is_active']) && !is_bool($input['is_active'])) {
            $errors['is_active'] = 'is_active must be a boolean value';
        }
        
        if (isset($input['status']) && !in_array($input['status'], ['Active', 'Inactive'])) {
            $errors['status'] = 'Status must be Active or Inactive';
        }
        
        // Validate date formats if provided
        $dateFields = ['start_date', 'end_date', 'next_term_begins'];
        foreach ($dateFields as $field) {
            if (isset($input[$field]) && !empty($input[$field])) {
                if (!strtotime($input[$field])) {
                    $errors[$field] = 'Invalid date format for ' . str_replace('_', ' ', $field);
                }
            }
        }
        
        return $errors;
    }
}
