<?php

// Load environment variables
$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    $envFile = __DIR__ . '/env.txt'; // Fallback to env.txt
}

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, "\"'\"");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
        putenv("$key=$value");
    }
}

// Error reporting
if (($_ENV['APP_ENV'] ?? 'production') === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Set timezone
date_default_timezone_set($_ENV['TIMEZONE'] ?? 'UTC');

// Apply global security headers to all responses
SecurityMiddleware::applySecurityHeaders();

// Global rate limiting for all requests
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
SecurityMiddleware::rateLimit($clientIp, 100, 60, 'global_api');

// Load required files
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/SecurityMiddleware.php';
require_once __DIR__ . '/utils/Response.php';
require_once __DIR__ . '/utils/ErrorHandler.php';
require_once __DIR__ . '/utils/JWTHandler.php';
require_once __DIR__ . '/utils/ApiDocGenerator.php';
require_once __DIR__ . '/models/User.php';
require_once __DIR__ . '/models/RefreshToken.php';
require_once __DIR__ . '/models/Score.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/UserController.php';
require_once __DIR__ . '/controllers/SessionController.php';
require_once __DIR__ . '/controllers/TermController.php';
require_once __DIR__ . '/controllers/StudentController.php';
require_once __DIR__ . '/controllers/ClassController.php';
require_once __DIR__ . '/controllers/SubjectController.php';
require_once __DIR__ . '/controllers/ScoreController.php';
require_once __DIR__ . '/controllers/ResultController.php';
require_once __DIR__ . '/controllers/FeeController.php';
require_once __DIR__ . '/controllers/PaymentController.php';
require_once __DIR__ . '/controllers/NotificationController.php';
require_once __DIR__ . '/controllers/TeacherController.php';
require_once __DIR__ . '/controllers/ParentController.php';
require_once __DIR__ . '/controllers/AccountantController.php';
require_once __DIR__ . '/controllers/ActivityLogController.php';
require_once __DIR__ . '/controllers/SettingsController.php';
require_once __DIR__ . '/controllers/AdmissionController.php';
require_once __DIR__ . '/controllers/PromotionController.php';
require_once __DIR__ . '/controllers/HealthController.php';
require_once __DIR__ . '/controllers/SetupController.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';
require_once __DIR__ . '/middleware/CorsMiddleware.php';

// Handle CORS
CorsMiddleware::handle();

// Include middleware
// Optional middleware (disabled for simplified routing)
// require_once __DIR__ . '/middleware/RateLimitMiddleware.php';
// require_once __DIR__ . '/middleware/ActivityLogMiddleware.php';

// Get request method and URI
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'] ?? '/';

// Normalize URI
$uri = explode('?', $uri)[0];
$pathFromQuery = isset($_GET['path']) ? ('/api/' . ltrim($_GET['path'], '/')) : null;
if ($pathFromQuery) {
    $uri = $pathFromQuery;
}
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
if ($scriptName && strpos($uri, $scriptName) === 0) {
    $uri = substr($uri, strlen($scriptName));
}
$basePath = '/api';
if (strpos($uri, $basePath) === 0) {
    $uri = substr($uri, strlen($basePath));
}
if ($uri === '' ) { $uri = '/'; }

// Load routes
$routes = require __DIR__ . '/routes/routes.php';

// Simple request processing without external middleware chaining

// Route dispatch
$routeKey = "$method $uri";
if (isset($routes[$routeKey])) {
    $controllerClass = $routes[$routeKey][0];
    $controllerMethod = $routes[$routeKey][1];

    $publicRoutes = ['POST /auth/login', 'POST /auth/refresh', 'GET /health', 'POST /setup/create-admin'];
    if (!in_array($routeKey, $publicRoutes)) {
        AuthMiddleware::authenticate();
    }

    $controller = new $controllerClass();
    $controller->$controllerMethod();
} else {
    Response::notFound('Endpoint not found');
}