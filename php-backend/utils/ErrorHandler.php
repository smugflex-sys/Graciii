<?php

/**
 * Centralized Error Handler
 * Provides unified error logging and response handling
 */

class ErrorHandler {
    private static $errors = [];
    
    public static function handleException($exception) {
        self::logError([
            'type' => 'exception',
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
            'request' => [
                'method' => $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN',
                'uri' => $_SERVER['REQUEST_URI'] ?? '/',
                'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
            ]
        ]);
        
        if (($_ENV['APP_ENV'] ?? 'production') === 'development') {
            Response::serverError('Development Error: ' . $exception->getMessage());
        } else {
            Response::serverError('An internal error occurred');
        }
    }
    
    public static function handleError($errno, $errstr, $errfile, $errline) {
        if (!(error_reporting() & $errno)) {
            return false;
        }
        
        self::logError([
            'type' => 'php_error',
            'errno' => $errno,
            'message' => $errstr,
            'file' => $errfile,
            'line' => $errline,
            'request' => [
                'method' => $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN',
                'uri' => $_SERVER['REQUEST_URI'] ?? '/'
            ]
        ]);
        
        return true;
    }
    
    public static function logError($error) {
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[$timestamp] " . json_encode($error) . PHP_EOL;
        
        // Log to file if log path is configured
        $logPath = $_ENV['ERROR_LOG_PATH'] ?? null;
        if ($logPath) {
            file_put_contents($logPath, $logEntry, FILE_APPEND | LOCK_EX);
        }
        
        // Always log to PHP error log
        error_log("Backend Error: " . json_encode($error));
        
        // Store in memory for debugging
        self::$errors[] = $error;
        
        // Keep only last 100 errors in memory
        if (count(self::$errors) > 100) {
            self::$errors = array_slice(self::$errors, -100);
        }
    }
    
    public static function getRecentErrors($limit = 10) {
        return array_slice(self::$errors, -$limit);
    }
    
    public static function clearErrors() {
        self::$errors = [];
    }
    
    public static function validateRequired($data, $requiredFields) {
        $errors = [];
        
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || $data[$field] === '' || $data[$field] === null) {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required';
            }
        }
        
        return $errors;
    }
    
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    public static function validatePassword($password) {
        $minLength = Config::get('security.password_min_length', 8);
        
        if (strlen($password) < $minLength) {
            return "Password must be at least $minLength characters long";
        }
        
        if (!preg_match('/[A-Z]/', $password)) {
            return 'Password must contain at least one uppercase letter';
        }
        
        if (!preg_match('/[a-z]/', $password)) {
            return 'Password must contain at least one lowercase letter';
        }
        
        if (!preg_match('/[0-9]/', $password)) {
            return 'Password must contain at least one number';
        }
        
        return null;
    }
    
    public static function sanitizeInput($data) {
        if (is_array($data)) {
            return array_map([self::class, 'sanitizeInput'], $data);
        }
        
        return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
    }
    
    public static function validatePagination($params) {
        $errors = [];
        
        if (isset($params['page']) && (!is_numeric($params['page']) || $params['page'] < 1)) {
            $errors['page'] = 'Page must be a positive integer';
        }
        
        if (isset($params['limit']) && (!is_numeric($params['limit']) || $params['limit'] < 1 || $params['limit'] > 100)) {
            $errors['limit'] = 'Limit must be between 1 and 100';
        }
        
        return $errors;
    }
}

// Set up global error handlers
set_exception_handler([ErrorHandler::class, 'handleException']);
set_error_handler([ErrorHandler::class, 'handleError']);
