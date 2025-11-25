<?php

/**
 * Security Middleware
 * Provides comprehensive security features for the application
 */
class SecurityMiddleware {
    
    /**
     * Apply security headers to all responses
     */
    public static function applySecurityHeaders() {
        // Prevent clickjacking
        header('X-Frame-Options: DENY');
        
        // Prevent MIME type sniffing
        header('X-Content-Type-Options: nosniff');
        
        // Enable XSS protection
        header('X-XSS-Protection: "1; mode=block"');
        
        // Strict Transport Security (HTTPS only)
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
        }
        
        // Content Security Policy
        header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';");
        
        // Referrer Policy
        header('Referrer-Policy: strict-origin-when-cross-origin');
        
        // Permissions Policy
        header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    }
    
    /**
     * Enhanced rate limiting with Redis/database fallback
     */
    public static function rateLimit($identifier, $limit, $window, $scope = 'global') {
        $key = "rate_limit_{$scope}_" . md5($identifier);
        
        // Try to use Redis if available (faster and more efficient)
        if (class_exists('Redis')) {
            try {
                $redis = new Redis();
                $redis->connect('127.0.0.1', 6379);
                
                $current = $redis->incr($key);
                if ($current === 1) {
                    $redis->expire($key, $window);
                }
                
                if ($current > $limit) {
                    self::logSecurityEvent('RATE_LIMIT_EXCEEDED', [
                        'identifier' => $identifier,
                        'scope' => $scope,
                        'limit' => $limit,
                        'window' => $window,
                        'current' => $current
                    ]);
                    Response::error('Rate limit exceeded. Please try again later.', 429);
                    return false;
                }
                
                return true;
            } catch (Exception $e) {
                // Fallback to database if Redis fails
            }
        }
        
        // Database fallback for rate limiting
        return self::databaseRateLimit($key, $limit, $window);
    }
    
    /**
     * Database-based rate limiting fallback
     */
    private static function databaseRateLimit($key, $limit, $window) {
        try {
            $db = Database::getInstance()->getConnection();
            
            // Clean up old entries
            $db->exec("DELETE FROM rate_limits WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)");
            
            // Check current count
            $stmt = $db->prepare("SELECT COUNT(*) as count FROM rate_limits WHERE `key` = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)");
            $stmt->execute([$key, $window]);
            $current = $stmt->fetch()['count'];
            
            if ($current >= $limit) {
                self::logSecurityEvent('RATE_LIMIT_EXCEEDED', [
                    'key' => $key,
                    'limit' => $limit,
                    'window' => $window,
                    'current' => $current
                ]);
                Response::error('Rate limit exceeded. Please try again later.', 429);
                return false;
            }
            
            // Record this request
            $stmt = $db->prepare("INSERT INTO rate_limits (`key`, created_at) VALUES (?, NOW())");
            $stmt->execute([$key]);
            
            return true;
        } catch (Exception $e) {
            // Fail open - allow request if rate limiting fails
            error_log("Rate limiting failed: " . $e->getMessage());
            return true;
        }
    }
    
    /**
     * Account lockout mechanism
     */
    public static function checkAccountLockout($identifier) {
        $key = "account_lockout_" . md5($identifier);
        
        try {
            $db = Database::getInstance()->getConnection();
            
            $stmt = $db->prepare("SELECT * FROM account_lockouts WHERE identifier = ? AND locked_until > NOW()");
            $stmt->execute([$identifier]);
            $lockout = $stmt->fetch();
            
            if ($lockout) {
                $remainingTime = strtotime($lockout['locked_until']) - time();
                Response::error("Account temporarily locked. Try again in {$remainingTime} seconds.", 423);
                return false;
            }
            
            return true;
        } catch (Exception $e) {
            error_log("Account lockout check failed: " . $e->getMessage());
            return true; // Fail open
        }
    }
    
    /**
     * Record failed login attempt
     */
    public static function recordFailedAttempt($identifier, $reason = 'invalid_credentials') {
        $maxAttempts = Config::get('security.max_login_attempts', 5);
        $lockoutDuration = Config::get('security.lockout_duration', 900); // 15 minutes
        
        try {
            $db = Database::getInstance()->getConnection();
            
            // Clean up old attempts
            $db->exec("DELETE FROM failed_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)");
            
            // Record this attempt
            $stmt = $db->prepare("INSERT INTO failed_attempts (identifier, reason, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, NOW())");
            $stmt->execute([
                $identifier,
                $reason,
                $_SERVER['REMOTE_ADDR'] ?? '',
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);
            
            // Check if account should be locked
            $stmt = $db->prepare("SELECT COUNT(*) as count FROM failed_attempts WHERE identifier = ? AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
            $stmt->execute([$identifier]);
            $recentAttempts = $stmt->fetch()['count'];
            
            if ($recentAttempts >= $maxAttempts) {
                // Lock the account
                $lockedUntil = date('Y-m-d H:i:s', time() + $lockoutDuration);
                $stmt = $db->prepare("INSERT INTO account_lockouts (identifier, locked_until, reason, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE locked_until = ?, reason = ?");
                $stmt->execute([$identifier, $lockedUntil, "Too many failed attempts ({$maxAttempts})", $lockedUntil, "Too many failed attempts ({$maxAttempts})"]);
                
                self::logSecurityEvent('ACCOUNT_LOCKED', [
                    'identifier' => $identifier,
                    'attempts' => $recentAttempts,
                    'locked_until' => $lockedUntil
                ]);
            }
            
        } catch (Exception $e) {
            error_log("Failed attempt recording failed: " . $e->getMessage());
        }
    }
    
    /**
     * Clear failed attempts on successful login
     */
    public static function clearFailedAttempts($identifier) {
        try {
            $db = Database::getInstance()->getConnection();
            
            $stmt = $db->prepare("DELETE FROM failed_attempts WHERE identifier = ?");
            $stmt->execute([$identifier]);
            
            $stmt = $db->prepare("DELETE FROM account_lockouts WHERE identifier = ?");
            $stmt->execute([$identifier]);
            
        } catch (Exception $e) {
            error_log("Failed attempt clearing failed: " . $e->getMessage());
        }
    }
    
    /**
     * Input sanitization and validation
     */
    public static function sanitizeInput($data) {
        if (is_array($data)) {
            return array_map([self::class, 'sanitizeInput'], $data);
        }
        
        // Remove potential XSS
        $data = htmlspecialchars($data, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        
        // Remove SQL injection patterns
        $dangerousPatterns = [
            '/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i',
            '/(\b(OR|AND)\s+\d+\s*=\s*\d+)/i',
            '/(--|#|\/\*)/',
            '/(\b(SCRIPT|JAVASCRIPT|VBSCRIPT|ONLOAD|ONERROR)\b)/i'
        ];
        
        foreach ($dangerousPatterns as $pattern) {
            $data = preg_replace($pattern, '', $data);
        }
        
        return trim($data);
    }
    
    /**
     * Log security events
     */
    private static function logSecurityEvent($event, $details = []) {
        $logData = [
            'event' => $event,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'timestamp' => date('Y-m-d H:i:s'),
            'details' => $details
        ];
        
        error_log("SECURITY EVENT: " . json_encode($logData));
        
        // TODO: Store in database security_logs table for audit trail
    }
    
    /**
     * Validate request origin
     */
    public static function validateOrigin() {
        $allowedOrigins = Config::get('cors.allowed_origins', ['*']);
        
        if ($allowedOrigins !== ['*']) {
            $origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
            
            if (!in_array($origin, $allowedOrigins) && !in_array('*', $allowedOrigins)) {
                self::logSecurityEvent('INVALID_ORIGIN', ['origin' => $origin]);
                Response::error('Invalid request origin', 403);
                return false;
            }
        }
        
        return true;
    }
}
