<?php

class ApiDocGenerator {
    private static $routes = [];
    private static $components = [];
    private static $info = [
        'title' => 'Graceland School Management API',
        'version' => '1.0.0',
        'description' => 'API documentation for Graceland School Management System',
        'contact' => [
            'name' => 'API Support',
            'email' => 'support@graceland.com'
        ]
    ];
    
    public static function addRoute($method, $path, $params = []) {
        $routeKey = strtoupper($method) . ' ' . $path;
        self::$routes[$routeKey] = array_merge([
            'summary' => '',
            'description' => '',
            'parameters' => [],
            'responses' => [
                '200' => [
                    'description' => 'Successful operation'
                ],
                '400' => [
                    'description' => 'Bad request'
                ],
                '401' => [
                    'description' => 'Unauthorized'
                ],
                '403' => [
                    'description' => 'Forbidden'
                ],
                '404' => [
                    'description' => 'Not found'
                ],
                '500' => [
                    'description' => 'Internal server error'
                ]
            ],
            'security' => [],
            'tags' => []
        ], $params);
    }

    public static function addComponent($type, $name, $schema) {
        if (!isset(self::$components[$type])) {
            self::$components[$type] = [];
        }
        self::$components[$type][$name] = $schema;
    }
    
    public static function generate() {
        $doc = [
            'openapi' => '3.0.0',
            'info' => self::$info,
            'servers' => [
                ['url' => '/api', 'description' => 'API Server']
            ],
            'paths' => [],
            'components' => [
                'securitySchemes' => [
                    'bearerAuth' => [
                        'type' => 'http',
                        'scheme' => 'bearer',
                        'bearerFormat' => 'JWT'
                    ]
                ],
                'schemas' => [
                    'Error' => [
                        'type' => 'object',
                        'properties' => [
                            'status' => ['type' => 'string', 'example' => 'error'],
                            'message' => ['type' => 'string', 'example' => 'An error occurred']
                        ]
                    ],
                    'Success' => [
                        'type' => 'object',
                        'properties' => [
                            'status' => ['type' => 'string', 'example' => 'success'],
                            'message' => ['type' => 'string'],
                            'data' => ['type' => 'object']
                        ]
                    ]
                ]
            ]
        ];
        
        // Group routes by path
        $groupedRoutes = [];
        foreach (self::$routes as $routeKey => $route) {
            list($method, $path) = explode(' ', $routeKey, 2);
            if (!isset($groupedRoutes[$path])) {
                $groupedRoutes[$path] = [];
            }
            $groupedRoutes[$path][strtolower($method)] = $route;
        }
        
        // Add paths to documentation
        foreach ($groupedRoutes as $path => $methods) {
            $doc['paths'][$path] = [];
            
            foreach ($methods as $method => $route) {
                $doc['paths'][$path][$method] = [
                    'summary' => $route['summary'],
                    'description' => $route['description'],
                    'parameters' => $route['parameters'],
                    'responses' => $route['responses'],
                    'tags' => $route['tags']
                ];
                
                // Add security if required
                if (!empty($route['security'])) {
                    $doc['paths'][$path][$method]['security'] = [['bearerAuth' => []]];
                }
            }
        }
        if (!empty(self::$components)) {
            foreach (self::$components as $type => $items) {
                if (!isset($doc['components'][$type])) {
                    $doc['components'][$type] = [];
                }
                foreach ($items as $name => $schema) {
                    $doc['components'][$type][$name] = $schema;
                }
            }
        }
        
        return json_encode($doc, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }
    
    public static function saveToFile($filename = 'api-docs.json') {
        $docs = self::generate();
        return file_put_contents($filename, $docs);
    }
}
