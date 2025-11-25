<?php

class Config {
    public static function get($key, $default = null) {
        $config = [
            'app' => [
                'name' => 'Graceland Royal Academy',
                'env' => $_ENV['APP_ENV'] ?? 'production',
                'debug' => ($_ENV['APP_ENV'] ?? 'production') === 'development',
                'timezone' => 'UTC',
                'url' => $_ENV['APP_URL'] ?? 'http://localhost',
            ],
            'database' => [
                'host' => $_ENV['DB_HOST'] ?? 'localhost',
                'port' => $_ENV['DB_PORT'] ?? '3306',
                'name' => $_ENV['DB_NAME'] ?? 'mdpjhtua_graceland_db',
                'username' => $_ENV['DB_USER'] ?? '',
                'password' => $_ENV['DB_PASS'] ?? '',
            ],
            'jwt' => [
                'secret' => $_ENV['JWT_SECRET'] ?? null,
                'algorithm' => 'HS256',
                'access_token_expires' => 15 * 60, // 15 minutes
                'refresh_token_expires' => 7 * 24 * 60 * 60, // 7 days
                'require_secure' => ($_ENV['APP_ENV'] ?? 'production') === 'production',
            ],
            'cors' => [
                'allowed_origins' => explode(',', $_ENV['CORS_ORIGINS'] ?? '*'),
                'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                'allowed_headers' => ['Content-Type', 'Authorization'],
                'credentials' => true,
            ],
            'upload' => [
                'path' => $_ENV['UPLOAD_PATH'] ?? __DIR__ . '/../public/uploads',
                'max_size' => 5 * 1024 * 1024, // 5MB
                'allowed_types' => ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
            ],
            'rate_limit' => [
                'window_ms' => 15 * 60 * 1000, // 15 minutes
                'max_requests' => 100,
            ],
            'security' => [
                'password_min_length' => 8,
                'session_timeout' => 30 * 60, // 30 minutes
                'max_login_attempts' => 5,
                'lockout_duration' => 15 * 60, // 15 minutes
            ]
        ];

        $keys = explode('.', $key);
        $value = $config;

        foreach ($keys as $k) {
            if (!isset($value[$k])) {
                return $default;
            }
            $value = $value[$k];
        }

        return $value;
    }
}
