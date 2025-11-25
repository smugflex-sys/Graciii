<?php

class AuthMiddleware {
    public static function authenticate() {
        try {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
            
            if (!$authHeader) {
                Response::unauthorized('Authorization header required');
                return;
            }
            
            if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                Response::unauthorized('Invalid authorization format');
                return;
            }
            
            $token = $matches[1];
            $user = JWTHandler::getCurrentUser($token);
            
            // Store user data in request context
            $_SERVER['CURRENT_USER'] = $user;
            
            return $user;
            
        } catch (Exception $e) {
            Response::unauthorized($e->getMessage());
        }
    }

    public static function requireRole($requiredRole) {
        $user = self::authenticate();
        
        if (!$user) {
            return;
        }
        
        if ($user['role'] !== $requiredRole && $user['role'] !== 'admin') {
            Response::forbidden('Insufficient permissions');
        }
        
        return $user;
    }

    public static function requireAnyRole($roles) {
        $user = self::authenticate();
        
        if (!$user) {
            return;
        }
        
        if (!in_array($user['role'], $roles) && $user['role'] !== 'admin') {
            Response::forbidden('Insufficient permissions');
        }
        
        return $user;
    }

    public static function getCurrentUser() {
        return $_SERVER['CURRENT_USER'] ?? null;
    }
}
