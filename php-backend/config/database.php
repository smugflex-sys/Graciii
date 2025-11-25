<?php

class Database {
    private static $instance = null;
    private $connection;
    private $host;
    private $username;
    private $password;
    private $database;
    private $port;

    private function __construct() {
        $this->host = $_ENV['DB_HOST'] ?? 'localhost';
        $this->username = $_ENV['DB_USER'] ?? '';
        $this->password = $_ENV['DB_PASS'] ?? '';
        $this->database = $_ENV['DB_NAME'] ?? 'leuluzjk_graceland_db';
        $this->port = $_ENV['DB_PORT'] ?? '3306';

        $appEnv = $_ENV['APP_ENV'] ?? 'production';
        
        // Enhanced security validation
        if ($appEnv === 'production') {
            $requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
            foreach ($requiredVars as $key) {
                if (empty($_ENV[$key])) {
                    error_log("CRITICAL: Missing required environment variable: {$key}");
                    throw new Exception("Database configuration incomplete. Missing: {$key}");
                }
            }
            
            // Validate database name format in production
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $this->database)) {
                throw new Exception("Invalid database name format");
            }
        }

        $this->connect();
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function connect() {
        try {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->database};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                PDO::ATTR_PERSISTENT => true,
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => false,
                PDO::ATTR_TIMEOUT => 5,
                PDO::MYSQL_ATTR_MULTI_STATEMENTS => false
            ];

            $this->connection = new PDO($dsn, $this->username ?? '', $this->password ?? '', $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }

    public function getConnection() {
        return $this->connection;
    }

    public function query($sql, $params = []) {
        try {
            $start = microtime(true);
            
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            
            $queryTime = microtime(true) - $start;
            
            // Log query performance
            if (class_exists('PerformanceTracker')) {
                PerformanceTracker::logQuery($sql, $queryTime);
            }
            
            return $stmt;
        } catch (PDOException $e) {
            error_log("Query failed: " . $e->getMessage());
            throw new Exception("Database query failed");
        }
    }

    public function lastInsertId() {
        return $this->connection->lastInsertId();
    }

    public function prepare($sql) {
        return $this->connection->prepare($sql);
    }

    /**
     * Enhanced query methods for better frontend communication
     */
    public function fetchAll($sql, $params = [], $options = []) {
        try {
            $start = microtime(true);
            
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $queryTime = microtime(true) - $start;
            
            // Log query performance
            if (class_exists('PerformanceTracker')) {
                PerformanceTracker::logQuery($sql, $queryTime);
            }
            
            // Process results if options provided
            if (!empty($options)) {
                $results = $this->processResults($results, $options);
            }
            
            return $results;
        } catch (PDOException $e) {
            error_log("Fetch all query failed: " . $e->getMessage());
            throw new Exception("Database query failed");
        }
    }

    public function fetchOne($sql, $params = [], $options = []) {
        try {
            $start = microtime(true);
            
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $queryTime = microtime(true) - $start;
            
            // Log query performance
            if (class_exists('PerformanceTracker')) {
                PerformanceTracker::logQuery($sql, $queryTime);
            }
            
            // Process result if options provided
            if (!empty($options) && $result) {
                $result = $this->processResults([$result], $options)[0];
            }
            
            return $result;
        } catch (PDOException $e) {
            error_log("Fetch one query failed: " . $e->getMessage());
            throw new Exception("Database query failed");
        }
    }

    public function fetchColumn($sql, $params = [], $column = 0) {
        try {
            $start = microtime(true);
            
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetchColumn($column);
            
            $queryTime = microtime(true) - $start;
            
            // Log query performance
            if (class_exists('PerformanceTracker')) {
                PerformanceTracker::logQuery($sql, $queryTime);
            }
            
            return $result;
        } catch (PDOException $e) {
            error_log("Fetch column query failed: " . $e->getMessage());
            throw new Exception("Database query failed");
        }
    }

    /**
     * Process results for frontend compatibility
     */
    private function processResults($results, $options) {
        if (empty($results)) {
            return $results;
        }

        // Convert snake_case to camelCase for frontend
        if ($options['camelCase'] ?? false) {
            $results = array_map([$this, 'convertToCamelCase'], $results);
        }

        // Decode JSON fields
        if ($options['decodeJson'] ?? false) {
            $results = array_map([$this, 'decodeJsonFields'], $results);
        }

        // Format dates
        if ($options['formatDates'] ?? false) {
            $results = array_map([$this, 'formatDates'], $results);
        }

        // Add computed fields
        if (isset($options['computedFields'])) {
            $results = array_map(function($result) use ($options) {
                return $this->addComputedFields($result, $options['computedFields']);
            }, $results);
        }

        return $results;
    }

    /**
     * Convert snake_case array keys to camelCase
     */
    private function convertToCamelCase($array) {
        $camelCaseArray = [];
        foreach ($array as $key => $value) {
            $camelCaseKey = preg_replace_callback('/_([a-z])/', function($matches) {
                return strtoupper($matches[1]);
            }, $key);
            $camelCaseArray[$camelCaseKey] = $value;
        }
        return $camelCaseArray;
    }

    /**
     * Decode JSON fields in result
     */
    private function decodeJsonFields($array) {
        $jsonFields = ['specialization', 'student_ids', 'scores', 'affective', 'psychomotor', 'device_info'];
        
        foreach ($jsonFields as $field) {
            if (isset($array[$field]) && is_string($array[$field])) {
                $decoded = json_decode($array[$field], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $array[$field] = $decoded;
                }
            }
        }
        
        return $array;
    }

    /**
     * Format date fields for frontend
     */
    private function formatDates($array) {
        $dateFields = ['created_at', 'updated_at', 'deleted_at', 'last_login', 'dob', 'payment_date', 'verified_at'];
        
        foreach ($dateFields as $field) {
            if (isset($array[$field]) && $array[$field]) {
                $date = new DateTime($array[$field]);
                $array[$field . '_formatted'] = $date->format('M d, Y');
                $array[$field . '_iso'] = $date->format('c');
            }
        }
        
        return $array;
    }

    /**
     * Add computed fields to results
     */
    private function addComputedFields($array, $computedFields) {
        foreach ($computedFields as $field) {
            switch ($field) {
                case 'full_name':
                    if (isset($array['first_name']) && isset($array['last_name'])) {
                        $array['full_name'] = trim($array['first_name'] . ' ' . $array['last_name']);
                    }
                    break;
                case 'age':
                    if (isset($array['dob'])) {
                        $dob = new DateTime($array['dob']);
                        $today = new DateTime();
                        $array['age'] = $today->diff($dob)->y;
                    }
                    break;
                case 'status_badge':
                    if (isset($array['status'])) {
                        $array['status_badge'] = $this->getStatusBadge($array['status']);
                    }
                    break;
            }
        }
        
        return $array;
    }

    /**
     * Get status badge HTML
     */
    private function getStatusBadge($status) {
        $badges = [
            'active' => '<span class="badge bg-success">Active</span>',
            'inactive' => '<span class="badge bg-secondary">Inactive</span>',
            'suspended' => '<span class="badge bg-danger">Suspended</span>',
            'pending' => '<span class="badge bg-warning">Pending</span>',
            'verified' => '<span class="badge bg-success">Verified</span>',
            'rejected' => '<span class="badge bg-danger">Rejected</span>',
            'Active' => '<span class="badge bg-success">Active</span>',
            'Inactive' => '<span class="badge bg-secondary">Inactive</span>',
            'Graduated' => '<span class="badge bg-info">Graduated</span>'
        ];
        
        return $badges[$status] ?? '<span class="badge bg-secondary">' . ucfirst($status) . '</span>';
    }

    /**
     * Get table info for debugging
     */
    public function getTableInfo($table) {
        $sql = "DESCRIBE `{$table}`";
        return $this->fetchAll($sql);
    }

    /**
     * Check if table exists
     */
    public function tableExists($table) {
        $sql = "SHOW TABLES LIKE :table";
        $result = $this->fetchOne($sql, ['table' => $table]);
        return !empty($result);
    }

    /**
     * Get count of records in table
     */
    public function getCount($table, $where = '', $params = []) {
        $sql = "SELECT COUNT(*) as count FROM `{$table}`";
        if ($where) {
            $sql .= " WHERE {$where}";
        }
        $result = $this->fetchOne($sql, $params);
        return (int)($result['count'] ?? 0);
    }

    /**
     * Begin transaction with better error handling
     */
    public function beginTransaction() {
        try {
            return $this->connection->beginTransaction();
        } catch (PDOException $e) {
            error_log("Begin transaction failed: " . $e->getMessage());
            throw new Exception("Transaction failed to start");
        }
    }

    /**
     * Commit transaction with better error handling
     */
    public function commit() {
        try {
            return $this->connection->commit();
        } catch (PDOException $e) {
            error_log("Commit transaction failed: " . $e->getMessage());
            throw new Exception("Transaction failed to commit");
        }
    }

    /**
     * Rollback transaction with better error handling
     */
    public function rollback() {
        try {
            return $this->connection->rollback();
        } catch (PDOException $e) {
            error_log("Rollback transaction failed: " . $e->getMessage());
            throw new Exception("Transaction failed to rollback");
        }
    }

    public function __destruct() {
        $this->connection = null;
    }
}
