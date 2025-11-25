<?php

class AuthController {
    private $userModel;
    private $refreshTokenModel;

    public function __construct() {
        $this->userModel = new User();
        $this->refreshTokenModel = new RefreshToken();
    }

    public function login() {
        // Apply security headers
        SecurityMiddleware::applySecurityHeaders();
        
        // Validate request origin
        SecurityMiddleware::validateOrigin();
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Sanitize input
        $input = SecurityMiddleware::sanitizeInput($input);
        
        // Validation
        $errors = $this->validateLogin($input);
        if (!empty($errors)) {
            Response::validation($errors);
            return;
        }

        $email = $input['email'];
        $password = $input['password'];
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';

        // Enhanced rate limiting with IP and email
        if (!SecurityMiddleware::rateLimit($ipAddress, 10, 900, 'login_ip')) {
            return; // Response already sent by rateLimit method
        }
        
        if (!SecurityMiddleware::rateLimit($email, 5, 900, 'login_email')) {
            return; // Response already sent by rateLimit method
        }

        // Check account lockout status
        if (!SecurityMiddleware::checkAccountLockout($email)) {
            return; // Response already sent by checkAccountLockout method
        }

        // Find user
        $user = $this->userModel->findByEmail($email);
        
        if (!$user) {
            SecurityMiddleware::recordFailedAttempt($email, 'user_not_found');
            Response::error('Invalid credentials', 401);
            return;
        }

        // Check if user is active
        if ($user['status'] !== 'active') {
            SecurityMiddleware::recordFailedAttempt($email, 'account_inactive');
            Response::error('Account is inactive', 401);
            return;
        }

        // Verify password
        if (!$this->userModel->verifyPassword($user, $password)) {
            SecurityMiddleware::recordFailedAttempt($email, 'invalid_password');
            Response::error('Invalid credentials', 401);
            return;
        }

        // Clear failed attempts on successful login
        SecurityMiddleware::clearFailedAttempts($email);

        // Generate tokens
        $deviceInfo = $this->extractDeviceInfo();
        
        $accessToken = JWTHandler::generateAccessToken($user);
        $refreshToken = JWTHandler::generateRefreshToken($user, $deviceInfo, $ipAddress);

        // Store refresh token
        $this->refreshTokenModel->create($user['id'], $refreshToken, $deviceInfo, $ipAddress);

        // Update last login
        $this->userModel->updateLastLogin($user['id']);

        // Log activity
        $this->logActivity($user, 'LOGIN', 'users', $user['id'], [
            'email' => $user['email'],
            'ip_address' => $ipAddress,
            'device_info' => $deviceInfo
        ]);

        Response::success([
            'user' => $user,
            'token' => $accessToken,
            'refreshToken' => $refreshToken
        ], 'Login successful');
    }

    public function refresh() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['refreshToken'])) {
            Response::error('Refresh token required', 400);
            return;
        }

        try {
            $decoded = JWTHandler::verifyToken($input['refreshToken']);
            
            if ($decoded['type'] !== 'refresh') {
                Response::error('Invalid token type', 401);
                return;
            }

            // Verify refresh token exists in database
            $tokenRecord = $this->refreshTokenModel->findByToken($input['refreshToken']);
            if (!$tokenRecord) {
                Response::error('Invalid refresh token', 401);
                return;
            }

            // Get user
            $user = $this->userModel->findById($decoded['id']);
            
            if (!$user || $user['status'] !== 'active') {
                Response::error('Invalid refresh token', 401);
                return;
            }

            // Generate new access token
            $accessToken = JWTHandler::generateAccessToken($user);

            Response::success(['token' => $accessToken], 'Token refreshed');

        } catch (Exception $e) {
            if (strpos($e->getMessage(), 'token') !== false) {
                Response::error($e->getMessage(), 401);
            } else {
                Response::serverError('Token refresh failed');
            }
        }
    }

    public function logout() {
        try {
            $user = JWTHandler::getCurrentUser();
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (isset($input['refreshToken'])) {
                $this->refreshTokenModel->revoke($input['refreshToken'], $user['id']);
            }

            // Log activity
            $this->logActivity($user, 'LOGOUT', 'users', $user['id']);

            Response::success(null, 'Logout successful');

        } catch (Exception $e) {
            Response::error('Logout failed', 400);
        }
    }

    public function logoutAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            
            $this->refreshTokenModel->revokeAllUserTokens($user['id'], $user['id']);

            // Log activity
            $this->logActivity($user, 'LOGOUT_ALL', 'users', $user['id']);

            Response::success(null, 'Logged out from all devices');

        } catch (Exception $e) {
            Response::error('Logout failed', 400);
        }
    }

    public function changePassword() {
        try {
            $user = JWTHandler::getCurrentUser();
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validatePasswordChange($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }

            // Get user with password
            $userWithPassword = $this->userModel->findByEmail($user['email']);
            
            // Verify old password
            if (!$this->userModel->verifyPassword($userWithPassword, $input['oldPassword'])) {
                Response::error('Current password is incorrect', 401);
                return;
            }

            // Update password
            $this->userModel->update($user['id'], ['password' => $input['newPassword']]);

            // Revoke all refresh tokens
            $this->refreshTokenModel->revokeAllUserTokens($user['id'], $user['id']);

            // Log activity
            $this->logActivity($user, 'CHANGE_PASSWORD', 'users', $user['id']);

            Response::success(null, 'Password changed successfully');

        } catch (Exception $e) {
            Response::error('Password change failed', 400);
        }
    }

    public function getProfile() {
        try {
            $user = JWTHandler::getCurrentUser();
            $profile = $this->userModel->findById($user['id']);
            
            Response::success($profile, 'Profile retrieved');

        } catch (Exception $e) {
            Response::error('Failed to retrieve profile', 400);
        }
    }

    public function updateProfile() {
        try {
            $user = JWTHandler::getCurrentUser();
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validateProfileUpdate($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }

            $updateData = [];
            if (isset($input['name'])) {
                $updateData['name'] = $input['name'];
            }
            if (isset($input['phone'])) {
                $updateData['phone'] = $input['phone'];
            }

            $this->userModel->update($user['id'], $updateData);

            // Log activity
            $this->logActivity($user, 'UPDATE_PROFILE', 'users', $user['id'], $updateData);

            $updatedProfile = $this->userModel->findById($user['id']);
            Response::success($updatedProfile, 'Profile updated');

        } catch (Exception $e) {
            Response::error('Profile update failed', 400);
        }
    }

    public function getActiveSessions() {
        try {
            $user = JWTHandler::getCurrentUser();
            $tokens = $this->refreshTokenModel->getUserTokens($user['id']);
            
            // Parse device_info JSON if needed
            $sessions = array_map(function($token) {
                $token['device_info'] = json_decode($token['device_info'] ?? '{}', true);
                return $token;
            }, $tokens);
            
            Response::success(['sessions' => $sessions], 'Active sessions retrieved');

        } catch (Exception $e) {
            Response::error('Failed to retrieve sessions', 400);
        }
    }

    public function revokeSession() {
        try {
            $user = JWTHandler::getCurrentUser();
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['jti'])) {
                Response::error('Session ID (jti) is required', 400);
                return;
            }
            
            // Find the refresh token by JTI
            $refreshToken = $this->refreshTokenModel->findByJti($input['jti'], $user['id']);
            
            if (!$refreshToken) {
                Response::error('Session not found', 404);
                return;
            }
            
            // Revoke the token
            $this->refreshTokenModel->revokeByJti($input['jti'], $user['id']);
            
            // Log activity
            $this->logActivity($user, 'REVOKE_SESSION', 'refresh_tokens', $refreshToken['id'], 
                ['jti' => $input['jti'], 'device_info' => $refreshToken['device_info']]);
            
            Response::success(null, 'Session revoked successfully');

        } catch (Exception $e) {
            Response::error('Session revocation failed', 400);
        }
    }

    private function validateLogin($input) {
        $errors = [];
        
        if (!isset($input['email']) || !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Valid email is required';
        }
        
        if (!isset($input['password']) || strlen($input['password']) < 1) {
            $errors['password'] = 'Password is required';
        }
        
        return $errors;
    }

    private function validatePasswordChange($input) {
        $errors = [];
        
        if (!isset($input['oldPassword']) || strlen($input['oldPassword']) < 1) {
            $errors['oldPassword'] = 'Current password is required';
        }
        
        if (!isset($input['newPassword']) || strlen($input['newPassword']) < Config::get('security.password_min_length')) {
            $errors['newPassword'] = 'New password must be at least ' . Config::get('security.password_min_length') . ' characters';
        }
        
        if (isset($input['newPassword']) && isset($input['confirmPassword']) && $input['newPassword'] !== $input['confirmPassword']) {
            $errors['confirmPassword'] = 'Passwords do not match';
        }
        
        return $errors;
    }

    private function validateProfileUpdate($input) {
        $errors = [];
        
        if (isset($input['name']) && strlen(trim($input['name'])) < 2) {
            $errors['name'] = 'Name must be at least 2 characters';
        }
        
        if (isset($input['phone']) && !empty($input['phone']) && !preg_match('/^[+]?[\d\s\-()]+$/', $input['phone'])) {
            $errors['phone'] = 'Invalid phone number format';
        }
        
        return $errors;
    }

    private function extractDeviceInfo() {
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        
        $deviceInfo = [
            'user_agent' => $userAgent,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
            'platform' => 'Unknown',
            'browser' => 'Unknown'
        ];
        
        // Simple device detection
        if (preg_match('/Mobile|Android|iPhone|iPad/i', $userAgent)) {
            $deviceInfo['platform'] = 'Mobile';
        } elseif (preg_match('/Windows|Mac|Linux/i', $userAgent)) {
            $deviceInfo['platform'] = 'Desktop';
        }
        
        if (preg_match('/Chrome/i', $userAgent)) {
            $deviceInfo['browser'] = 'Chrome';
        } elseif (preg_match('/Firefox/i', $userAgent)) {
            $deviceInfo['browser'] = 'Firefox';
        } elseif (preg_match('/Safari/i', $userAgent)) {
            $deviceInfo['browser'] = 'Safari';
        }
        
        return $deviceInfo;
    }

    private function logActivity($user, $action, $table, $recordId, $details = null) {
        // This would be implemented with an ActivityLog model
        // For now, we'll just log to error_log for debugging
        $logData = [
            'user_id' => $user['id'],
            'action' => $action,
            'table_name' => $table,
            'record_id' => $recordId,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'details' => $details ? json_encode($details) : null,
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        error_log('Activity Log: ' . json_encode($logData));
    }
}
