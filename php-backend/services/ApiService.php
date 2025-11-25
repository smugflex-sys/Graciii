<?php
/**
 * API Service Layer
 * Provides business logic services for the application
 */

class ApiService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Generate API response
     */
    public static function response($data = null, $message = '', $status = 200) {
        http_response_code($status);
        header('Content-Type: application/json');
        
        $response = [
            'status' => $status < 400 ? 'success' : 'error',
            'message' => $message,
            'data' => $data
        ];

        echo json_encode($response);
        exit;
    }

    /**
     * Validate request data
     */
    public static function validate($data, $rules) {
        $errors = [];
        
        foreach ($rules as $field => $rule) {
            $rulesArray = explode('|', $rule);
            
            foreach ($rulesArray as $r) {
                if ($r === 'required' && (!isset($data[$field]) || empty($data[$field]))) {
                    $errors[$field] = ucfirst($field) . ' is required';
                }
                
                if ($r === 'email' && isset($data[$field]) && !filter_var($data[$field], FILTER_VALIDATE_EMAIL)) {
                    $errors[$field] = ucfirst($field) . ' must be a valid email';
                }
                
                if (strpos($r, 'min:') === 0 && isset($data[$field])) {
                    $min = explode(':', $r)[1];
                    if (strlen($data[$field]) < $min) {
                        $errors[$field] = ucfirst($field) . ' must be at least ' . $min . ' characters';
                    }
                }
            }
        }
        
        return $errors;
    }

    /**
     * Sanitize input data
     */
    public static function sanitize($data) {
        $sanitized = [];
        
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $sanitized[$key] = htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
            } else {
                $sanitized[$key] = $value;
            }
        }
        
        return $sanitized;
    }

    /**
     * Get pagination info
     */
    public static function getPagination($page, $limit, $total) {
        $totalPages = ceil($total / $limit);
        
        return [
            'current_page' => (int)$page,
            'per_page' => (int)$limit,
            'total' => (int)$total,
            'total_pages' => (int)$totalPages,
            'has_next' => $page < $totalPages,
            'has_prev' => $page > 1
        ];
    }
}
