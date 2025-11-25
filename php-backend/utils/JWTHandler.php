<?php

class JWTHandler {
    private static $secretKey;
    private static $algorithm = 'HS256';

    public static function init() {
        self::$secretKey = Config::get('jwt.secret');
        
        if (empty(self::$secretKey)) {
            throw new Exception('JWT secret key is not configured. Please set JWT_SECRET environment variable.');
        }
        
        // Validate secret key strength in production
        if (Config::get('app.env') === 'production' && strlen(self::$secretKey) < 32) {
            throw new Exception('JWT secret key must be at least 32 characters in production');
        }
    }

    public static function generateToken($payload, $expiresIn = null) {
        if (!self::$secretKey) {
            self::init();
        }

        $header = json_encode(['typ' => 'JWT', 'alg' => self::$algorithm]);
        $payload['iat'] = time();
        $payload['exp'] = time() + ($expiresIn ?? Config::get('jwt.access_token_expires'));
        
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));
        $headerEncoded = self::base64UrlEncode($header);
        
        $signature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, self::$secretKey, true);
        $signatureEncoded = self::base64UrlEncode($signature);
        
        return $headerEncoded . "." . $payloadEncoded . "." . $signatureEncoded;
    }

    public static function generateAccessToken($user) {
        $payload = [
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'type' => 'access'
        ];
        
        return self::generateToken($payload, Config::get('jwt.access_token_expires'));
    }

    public static function generateRefreshToken($user, $deviceInfo = null, $ipAddress = null) {
        $payload = [
            'id' => $user['id'],
            'email' => $user['email'],
            'type' => 'refresh',
            'jti' => bin2hex(random_bytes(16)), // JWT ID for token tracking
            'device_info' => $deviceInfo,
            'ip_address' => $ipAddress
        ];
        
        return self::generateToken($payload, Config::get('jwt.refresh_token_expires'));
    }

    public static function verifyToken($token) {
        if (!self::$secretKey) {
            self::init();
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new Exception('Invalid token format');
        }

        list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;

        // Verify signature
        $signature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, self::$secretKey, true);
        $expectedSignature = self::base64UrlDecode($signatureEncoded);

        if (!hash_equals($signature, $expectedSignature)) {
            throw new Exception('Invalid token signature');
        }

        // Decode payload
        $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            throw new Exception('Token has expired');
        }

        return $payload;
    }

    public static function getCurrentUser($token = null) {
        if (!$token) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
            
            if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                throw new Exception('No authorization token provided');
            }
            
            $token = $matches[1];
        }

        // Security check: Ensure HTTPS in production
        if (Config::get('jwt.require_secure') && (!isset($_SERVER['HTTPS']) || $_SERVER['HTTPS'] !== 'on')) {
            throw new Exception('Secure connection required for authentication');
        }

        $payload = self::verifyToken($token);
        
        if ($payload['type'] !== 'access') {
            throw new Exception('Invalid token type');
        }

        return $payload;
    }

    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
