<?php

class Response {
    public static function success($data = null, $message = 'Success', $statusCode = 200, $meta = []) {
        $response = [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c'),
            'status' => $statusCode
        ];

        // Add metadata if provided
        if (!empty($meta)) {
            $response['meta'] = $meta;
        }

        // Add pagination info if data is paginated
        if (is_array($data) && isset($meta['pagination'])) {
            $response['pagination'] = $meta['pagination'];
        }

        self::json($response, $statusCode);
    }

    public static function error($message = 'Error', $statusCode = 400, $errors = null, $code = null) {
        $response = [
            'success' => false,
            'message' => $message,
            'timestamp' => date('c'),
            'status' => $statusCode
        ];

        // Add error code if provided
        if ($code !== null) {
            $response['code'] = $code;
        }

        // Add detailed errors if provided
        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        // Add stack trace in development mode
        if (self::isDevelopmentMode()) {
            $response['debug'] = [
                'file' => debug_backtrace()[1]['file'] ?? 'unknown',
                'line' => debug_backtrace()[1]['line'] ?? 0,
                'function' => debug_backtrace()[1]['function'] ?? 'unknown'
            ];
        }

        self::json($response, $statusCode);
    }

    public static function validation($errors, $message = 'Validation failed') {
        self::error($message, 422, $errors, 'VALIDATION_ERROR');
    }

    public static function unauthorized($message = 'Unauthorized') {
        self::error($message, 401, null, 'UNAUTHORIZED');
    }

    public static function forbidden($message = 'Forbidden') {
        self::error($message, 403, null, 'FORBIDDEN');
    }

    public static function notFound($message = 'Not found') {
        self::error($message, 404, null, 'NOT_FOUND');
    }

    public static function serverError($message = 'Internal server error') {
        self::error($message, 500, null, 'SERVER_ERROR');
    }

    public static function paginated($data, $pagination, $message = 'Data retrieved successfully') {
        $meta = [
            'pagination' => $pagination,
            'total' => $pagination['total'] ?? count($data),
            'count' => count($data)
        ];
        
        self::success($data, $message, 200, $meta);
    }

    public static function created($data = null, $message = 'Resource created successfully') {
        self::success($data, $message, 201);
    }

    public static function updated($data = null, $message = 'Resource updated successfully') {
        self::success($data, $message, 200);
    }

    public static function deleted($message = 'Resource deleted successfully') {
        self::success(null, $message, 200);
    }

    public static function bulk($results, $message = 'Bulk operation completed') {
        $successCount = count(array_filter($results, fn($r) => $r['success'] ?? false));
        $totalCount = count($results);
        
        $data = [
            'results' => $results,
            'summary' => [
                'total' => $totalCount,
                'success' => $successCount,
                'failed' => $totalCount - $successCount,
                'success_rate' => $totalCount > 0 ? round(($successCount / $totalCount) * 100, 2) : 0
            ]
        ];

        $statusCode = $successCount === $totalCount ? 200 : 207; // 207 Multi-Status
        self::success($data, $message, $statusCode);
    }

    private static function json($data, $statusCode = 200) {
        header_remove();
        header('Content-Type: application/json');
        header('HTTP/1.1 ' . $statusCode . ' ' . self::getStatusMessage($statusCode));
        
        // Security headers
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        
        // Enhanced security headers
        if (!self::isDevelopmentMode()) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
            header('Content-Security-Policy: default-src \'self\'');
        }
        
        // CORS headers
        self::setCorsHeaders();

        // Cache control for API responses
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }

    private static function setCorsHeaders() {
        $config = self::getConfig('cors', []);
        $allowedOrigins = $config['allowed_origins'] ?? ['*'];
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowOrigin = '';
        
        if (in_array('*', $allowedOrigins, true)) {
            if (!empty($origin) && empty($config['credentials'])) {
                $allowOrigin = '*';
            } elseif (!empty($origin)) {
                $allowOrigin = $origin;
            }
        } elseif (!empty($origin) && in_array($origin, $allowedOrigins, true)) {
            $allowOrigin = $origin;
        } elseif (!empty($allowedOrigins)) {
            $allowOrigin = $allowedOrigins[0];
        }
        
        if ($allowOrigin !== '') {
            header('Access-Control-Allow-Origin: ' . $allowOrigin);
        }
        
        header('Access-Control-Allow-Methods: ' . implode(', ', $config['allowed_methods'] ?? ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']));
        header('Access-Control-Allow-Headers: ' . implode(', ', $config['allowed_headers'] ?? ['Content-Type', 'Authorization', 'X-Requested-With']));
        
        if (!empty($config['credentials'])) {
            header('Access-Control-Allow-Credentials: true');
        }
        
        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            header('Access-Control-Max-Age: 86400');
            exit(0);
        }
    }

    private static function getStatusMessage($statusCode) {
        $statusMessages = [
            200 => 'OK',
            201 => 'Created',
            204 => 'No Content',
            207 => 'Multi-Status',
            400 => 'Bad Request',
            401 => 'Unauthorized',
            403 => 'Forbidden',
            404 => 'Not Found',
            422 => 'Unprocessable Entity',
            429 => 'Too Many Requests',
            500 => 'Internal Server Error',
            503 => 'Service Unavailable'
        ];

        return $statusMessages[$statusCode] ?? 'Unknown';
    }

    private static function isDevelopmentMode() {
        return ($_ENV['APP_ENV'] ?? 'production') === 'development' || 
               ($_ENV['DEBUG'] ?? false) === true;
    }

    private static function getConfig($key, $default = []) {
        // Try to get config from Config class if available
        if (class_exists('Config')) {
            return Config::get($key, $default);
        }
        
        // Fallback to environment variables or defaults
        return $default;
    }

    /**
     * API Health Check Response
     */
    public static function health($status = 'healthy', $checks = []) {
        $data = [
            'status' => $status,
            'timestamp' => date('c'),
            'uptime' => self::getUptime(),
            'version' => $_ENV['APP_VERSION'] ?? '1.0.0',
            'environment' => $_ENV['APP_ENV'] ?? 'production',
            'checks' => $checks
        ];

        $statusCode = $status === 'healthy' ? 200 : 503;
        self::success($data, 'Health check completed', $statusCode);
    }

    /**
     * API Documentation Response
     */
    public static function apiInfo($info = []) {
        $data = [
            'name' => $info['name'] ?? 'School Management API',
            'version' => $info['version'] ?? '1.0.0',
            'description' => $info['description'] ?? 'RESTful API for school management system',
            'base_url' => $info['base_url'] ?? self::getBaseUrl(),
            'endpoints' => $info['endpoints'] ?? [],
            'documentation' => $info['documentation'] ?? '/api-docs',
            'contact' => $info['contact'] ?? [],
            'license' => $info['license'] ?? []
        ];

        self::success($data, 'API information retrieved successfully');
    }

    private static function getUptime() {
        if (function_exists('sys_getloadavg')) {
            $load = sys_getloadavg();
            return [
                'load_average' => $load,
                'memory_usage' => memory_get_usage(true),
                'memory_peak' => memory_get_peak_usage(true)
            ];
        }
        
        return [
            'memory_usage' => memory_get_usage(true),
            'memory_peak' => memory_get_peak_usage(true)
        ];
    }

    private static function getBaseUrl() {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $path = dirname($_SERVER['SCRIPT_NAME']);
        
        return $protocol . '://' . $host . $path;
    }
}
