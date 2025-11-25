<?php

class HealthController {
    private $db;
    
    public function __construct() {
        $this->db = null;
    }
    
    public function check() {
        try {
            $dbStatus = $this->checkDatabase();
            $diskStatus = $this->checkDiskSpace();
            $rateLimitStats = $this->getRateLimitStats();
            
            $systemInfo = [
                'status' => 'ok',
                'timestamp' => date('c'),
                'database' => $dbStatus,
                'disk' => $diskStatus,
                'rate_limits' => $rateLimitStats,
                'memory_usage' => $this->formatBytes(memory_get_usage(true)),
                'memory_peak' => $this->formatBytes(memory_get_peak_usage(true)),
                'server' => [
                    'php_version' => PHP_VERSION,
                    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'CLI',
                    'server_os' => php_uname('s') . ' ' . php_uname('r'),
                    'server_hostname' => gethostname(),
                    'uptime' => $this->getSystemUptime(),
                    'load_average' => $this->getLoadAverage()
                ]
            ];
            
            $this->logHealthMetrics($systemInfo);
            
            Response::success($systemInfo, 'API health status');
        } catch (\Exception $e) {
            Response::error('Health check encountered an error: ' . $e->getMessage(), 500);
        }
    }

    private function checkDatabase() {
        try {
            $conn = Database::getInstance()->getConnection();
            $this->db = $conn;
            $stmt = $conn->query("SELECT 1 AS ok");
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result && isset($result['ok']) && (int)$result['ok'] === 1) {
                return [
                    'status' => 'ok',
                    'driver' => $conn->getAttribute(PDO::ATTR_DRIVER_NAME),
                    'version' => $conn->getAttribute(PDO::ATTR_SERVER_VERSION)
                ];
            }
            
            return [
                'status' => 'error',
                'message' => 'Database check failed'
            ];
            
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage()
            ];
        }
    }
    
    private function checkDiskSpace() {
        $free = disk_free_space('.');
        $total = disk_total_space('.');
        $used = $total - $free;
        
        return [
            'total' => $this->formatBytes($total),
            'used' => $this->formatBytes($used),
            'free' => $this->formatBytes($free),
            'usage_percentage' => round(($used / $total) * 100, 2) . '%'
        ];
    }
    
    private function getRateLimitStats() {
        try {
            $db = Database::getInstance()->getConnection();
            $hasTable = $db->query("SHOW TABLES LIKE 'rate_limits'")->fetch(PDO::FETCH_ASSOC);
            if (!$hasTable) {
                return [
                    'recent_requests' => 0,
                    'top_ips' => [],
                    'top_endpoints' => []
                ];
            }
            $stmt = $db->query("SELECT COUNT(*) as count FROM rate_limits WHERE timestamp > " . (time() - 3600));
            $recentRequests = $stmt->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;
            $stmt = $db->query("SELECT ip, COUNT(*) as count FROM rate_limits WHERE timestamp > " . (time() - 3600) . " GROUP BY ip ORDER BY count DESC LIMIT 5");
            $topIps = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $stmt = $db->query("SELECT path, COUNT(*) as count FROM rate_limits WHERE timestamp > " . (time() - 3600) . " GROUP BY path ORDER BY count DESC LIMIT 5");
            $topEndpoints = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return [
                'recent_requests' => (int)$recentRequests,
                'top_ips' => $topIps,
                'top_endpoints' => $topEndpoints
            ];
        } catch (\Exception $e) {
            return [
                'recent_requests' => 0,
                'top_ips' => [],
                'top_endpoints' => []
            ];
        }
    }
    
    private function getSystemUptime() {
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            // Windows
            $uptime = shell_exec('net stats server | find "Statistics since"');
            return trim($uptime);
        } else {
            // Linux/Unix
            $uptime = @file_get_contents('/proc/uptime');
            if ($uptime !== false) {
                $uptime = explode(' ', $uptime);
                return $this->formatUptime($uptime[0]);
            }
        }
        return 'N/A';
    }
    
    private function getLoadAverage() {
        if (function_exists('sys_getloadavg')) {
            $load = sys_getloadavg();
            return [
                '1min' => $load[0],
                '5min' => $load[1],
                '15min' => $load[2]
            ];
        }
        return 'N/A';
    }
    
    private function formatUptime($seconds) {
        $dtF = new \DateTime('@0');
        $dtT = new DateTime("@$seconds");
        return $dtF->diff($dtT)->format('%a days, %h hours, %i minutes');
    }
    
    private function logHealthMetrics($metrics) {
        $logFile = __DIR__ . '/../../logs/health_metrics.log';
        $logDir = dirname($logFile);
        
        // Create logs directory if it doesn't exist
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        // Log metrics to file
        $logEntry = json_encode([
            'timestamp' => date('c'),
            'metrics' => [
                'memory_usage' => memory_get_usage(true),
                'memory_peak' => memory_get_peak_usage(true),
                'database_status' => $metrics['database']['status'] ?? 'unknown',
                'disk_usage' => $metrics['disk']['usage_percentage'] ?? '0%',
                'requests_last_hour' => $metrics['rate_limits']['recent_requests'] ?? 0
            ]
        ]) . "\n";
        
        file_put_contents($logFile, $logEntry, FILE_APPEND);
    }
    
    private function formatBytes($bytes, $precision = 2) {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= (1 << (10 * $pow));
        
        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
