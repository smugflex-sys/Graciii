<?php
/**
 * Security Tables Setup Script
 * Creates tables for enhanced security features
 */

// Load environment variables
$envFile = __DIR__ . '/.env';
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

// Database configuration
$host = $_ENV['DB_HOST'] ?? 'localhost';
$port = $_ENV['DB_PORT'] ?? '3306';
$database = $_ENV['DB_NAME'] ?? 'mdpjhtua_graceland_db';
$username = $_ENV['DB_USER'] ?? 'root';
$password = $_ENV['DB_PASS'] ?? '';

try {
    // Connect to database
    $dsn = "mysql:host=$host;port=$port;dbname=$database;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    echo "🔒 Setting up security tables...\n\n";

    // Security tables to create
    $tables = [
        'rate_limits' => "
            CREATE TABLE IF NOT EXISTS `rate_limits` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `key` varchar(255) NOT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_key` (`key`),
                KEY `idx_created_at` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",

        'failed_attempts' => "
            CREATE TABLE IF NOT EXISTS `failed_attempts` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `identifier` varchar(255) NOT NULL,
                `reason` varchar(100) NOT NULL,
                `ip_address` varchar(45) DEFAULT NULL,
                `user_agent` text DEFAULT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_identifier` (`identifier`),
                KEY `idx_created_at` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",

        'account_lockouts' => "
            CREATE TABLE IF NOT EXISTS `account_lockouts` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `identifier` varchar(255) NOT NULL UNIQUE,
                `locked_until` datetime NOT NULL,
                `reason` varchar(255) DEFAULT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `idx_identifier` (`identifier`),
                KEY `idx_locked_until` (`locked_until`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",

        'security_logs' => "
            CREATE TABLE IF NOT EXISTS `security_logs` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `event` varchar(100) NOT NULL,
                `ip_address` varchar(45) DEFAULT NULL,
                `user_agent` text DEFAULT NULL,
                `user_id` int(11) DEFAULT NULL,
                `details` json DEFAULT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_event` (`event`),
                KEY `idx_ip_address` (`ip_address`),
                KEY `idx_user_id` (`user_id`),
                KEY `idx_created_at` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        "
    ];

    // Create tables
    foreach ($tables as $tableName => $sql) {
        try {
            $pdo->exec($sql);
            echo "✅ Table '{$tableName}' created successfully\n";
        } catch (PDOException $e) {
            echo "❌ Error creating table '{$tableName}': " . $e->getMessage() . "\n";
        }
    }

    // Create indexes for performance
    $indexes = [
        "CREATE INDEX IF NOT EXISTS idx_failed_attempts_recent ON failed_attempts(identifier, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_security_logs_search ON security_logs(event, created_at)"
    ];

    echo "\n🔍 Creating performance indexes...\n";
    foreach ($indexes as $indexSql) {
        try {
            $pdo->exec($indexSql);
            echo "✅ Index created\n";
        } catch (PDOException $e) {
            echo "⚠️  Index creation warning: " . $e->getMessage() . "\n";
        }
    }

    // Clean up old data setup
    echo "\n🧹 Setting up cleanup procedures...\n";
    
    // Create a stored procedure for cleanup (optional)
    $cleanupProcedure = "
        DELIMITER //
        CREATE PROCEDURE IF NOT EXISTS CleanupSecurityData()
        BEGIN
            -- Clean up old rate limit records (older than 1 hour)
            DELETE FROM rate_limits WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR);
            
            -- Clean up old failed attempts (older than 24 hours)
            DELETE FROM failed_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);
            
            -- Clean up expired account lockouts
            DELETE FROM account_lockouts WHERE locked_until < NOW();
            
            -- Clean up old security logs (older than 90 days)
            DELETE FROM security_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
            
            SELECT ROW_COUNT() as total_cleaned;
        END //
        DELIMITER ;
    ";

    try {
        $pdo->exec($cleanupProcedure);
        echo "✅ Cleanup procedure created\n";
    } catch (PDOException $e) {
        echo "⚠️  Cleanup procedure warning: " . $e->getMessage() . "\n";
    }

    echo "\n🎉 Security tables setup completed!\n";
    echo "\n📋 Tables created:\n";
    echo "  - rate_limits (for API rate limiting)\n";
    echo "  - failed_attempts (for login attempt tracking)\n";
    echo "  - account_lockouts (for automatic account lockouts)\n";
    echo "  - security_logs (for security event auditing)\n";
    echo "\n🔧 Features enabled:\n";
    echo "  - Enhanced rate limiting with database fallback\n";
    echo "  - Account lockout after failed attempts\n";
    echo "  - Security event logging\n";
    echo "  - Automatic cleanup procedures\n";

} catch (PDOException $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    exit(1);
}
