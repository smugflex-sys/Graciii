<?php

class CorsMiddleware {
    public static function handle() {
        $config = Config::get('cors');
        
        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
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
            header('Access-Control-Allow-Methods: ' . implode(', ', $config['allowed_methods']));
            header('Access-Control-Allow-Headers: ' . implode(', ', $config['allowed_headers']));
            if (!empty($config['credentials'])) {
                header('Access-Control-Allow-Credentials: true');
            }
            header('Access-Control-Max-Age: 86400');
            header('Content-Length: 0');
            header('HTTP/1.1 204 No Content');
            exit;
        }
        
        // Set CORS headers for all requests
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
        header('Access-Control-Allow-Methods: ' . implode(', ', $config['allowed_methods']));
        header('Access-Control-Allow-Headers: ' . implode(', ', $config['allowed_headers']));
        if (!empty($config['credentials'])) {
            header('Access-Control-Allow-Credentials: true');
        }
    }
}
