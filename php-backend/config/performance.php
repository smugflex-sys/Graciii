<?php

// Performance optimization headers
header('X-Response-Time: ' . (microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']));

// Enable compression if available
if (function_exists('gzencode') && !headers_sent()) {
    ob_start('ob_gzhandler');
}

// Set response headers for performance
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Database query optimization
function optimizeQuery($sql) {
    // Remove unnecessary whitespace
    $sql = preg_replace('/\s+/', ' ', $sql);
    
    // Add query hints for better performance
    if (strpos($sql, 'SELECT') === 0) {
        $sql = str_replace('SELECT', 'SELECT /*+ USE_INDEX */', $sql);
    }
    
    return $sql;
}

// Response time tracking
class PerformanceTracker {
    private static $start;
    private static $queries = [];
    
    public static function start() {
        self::$start = microtime(true);
    }
    
    public static function logQuery($sql, $time) {
        self::$queries[] = [
            'sql' => $sql,
            'time' => $time,
            'timestamp' => microtime(true)
        ];
    }
    
    public static function getStats() {
        $total = microtime(true) - self::$start;
        $queryTime = array_sum(array_column(self::$queries, 'time'));
        
        return [
            'total_time' => $total,
            'query_time' => $queryTime,
            'query_count' => count(self::$queries),
            'avg_query_time' => count(self::$queries) > 0 ? $queryTime / count(self::$queries) : 0,
            'queries' => self::$queries
        ];
    }
}

// Initialize performance tracking
PerformanceTracker::start();

?>
