<?php
/**
 * Database Setup Script
 * Creates the necessary tables for the Graceland Royal Academy system
 */

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

// Database configuration
$host = $_ENV['DB_HOST'] ?? 'localhost';
$port = $_ENV['DB_PORT'] ?? '3306';
$database = $_ENV['DB_NAME'] ?? 'mdpjhtua_graceland_db';
$username = $_ENV['DB_USER'] ?? 'root';
$password = $_ENV['DB_PASS'] ?? '';

try {
    // Connect without database name first
    $dsn = "mysql:host=$host;port=$port;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$database`");

    echo "✅ Database connected successfully!\n\n";

    // Tables to create
    $tables = [
        'users' => "
            CREATE TABLE IF NOT EXISTS `users` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `role` enum('admin','teacher','parent','accountant','student') NOT NULL DEFAULT 'teacher',
                `name` varchar(255) NOT NULL,
                `email` varchar(255) NOT NULL,
                `phone` varchar(20) DEFAULT NULL,
                `password_hash` varchar(255) DEFAULT NULL,
                `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
                `last_login` datetime DEFAULT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                `deleted_at` datetime DEFAULT NULL,
                `deleted_by` int(11) DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `email` (`email`),
                KEY `idx_role` (`role`),
                KEY `idx_status` (`status`),
                KEY `idx_deleted_at` (`deleted_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",

        'refresh_tokens' => "
            CREATE TABLE IF NOT EXISTS `refresh_tokens` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `user_id` int(11) NOT NULL,
                `token` text NOT NULL,
                `jti` varchar(64) NOT NULL,
                `device_info` json DEFAULT NULL,
                `ip_address` varchar(45) DEFAULT NULL,
                `expires_at` datetime NOT NULL,
                `is_revoked` tinyint(1) NOT NULL DEFAULT 0,
                `revoked_at` datetime DEFAULT NULL,
                `revoked_by` int(11) DEFAULT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `jti` (`jti`),
                KEY `idx_user_id` (`user_id`),
                KEY `idx_expires_at` (`expires_at`),
                KEY `idx_is_revoked` (`is_revoked`),
                CONSTRAINT `fk_refresh_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",

        'sessions' => "
            CREATE TABLE IF NOT EXISTS `sessions` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `name` varchar(255) NOT NULL,
                `is_active` tinyint(1) NOT NULL DEFAULT 1,
                `start_date` date NOT NULL,
                `end_date` date NOT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_is_active` (`is_active`),
                KEY `idx_dates` (`start_date`, `end_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",

        'terms' => "
            CREATE TABLE IF NOT EXISTS `terms` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `session_id` int(11) NOT NULL,
                `name` varchar(100) NOT NULL,
                `is_active` tinyint(1) NOT NULL DEFAULT 0,
                `start_date` date NOT NULL,
                `end_date` date NOT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_session_id` (`session_id`),
                KEY `idx_is_active` (`is_active`),
                CONSTRAINT `fk_terms_session_id` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",

        'classes' => "
            CREATE TABLE IF NOT EXISTS `classes` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `name` varchar(100) NOT NULL,
                `level` varchar(50) DEFAULT NULL,
                `class_teacher_id` int(11) DEFAULT NULL,
                `status` enum('active','inactive') NOT NULL DEFAULT 'active',
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_class_teacher_id` (`class_teacher_id`),
                KEY `idx_status` (`status`),
                CONSTRAINT `fk_classes_class_teacher_id` FOREIGN KEY (`class_teacher_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",

        'subjects' => "
            CREATE TABLE IF NOT EXISTS `subjects` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `name` varchar(100) NOT NULL,
                `code` varchar(20) DEFAULT NULL,
                `is_core` tinyint(1) NOT NULL DEFAULT 0,
                `status` enum('active','inactive') NOT NULL DEFAULT 'active',
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `code` (`code`),
                KEY `idx_is_core` (`is_core`),
                KEY `idx_status` (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",

        'students' => "
            CREATE TABLE IF NOT EXISTS `students` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `reg_no` varchar(50) NOT NULL,
                `full_name` varchar(255) NOT NULL,
                `class_id` int(11) DEFAULT NULL,
                `parent_id` int(11) DEFAULT NULL,
                `gender` enum('Male','Female') DEFAULT NULL,
                `dob` date DEFAULT NULL,
                `phone` varchar(20) DEFAULT NULL,
                `photo_path` varchar(255) DEFAULT NULL,
                `status` enum('Active','Inactive','Graduated') NOT NULL DEFAULT 'Active',
                `student_id` varchar(50) DEFAULT NULL,
                `level` varchar(50) DEFAULT NULL,
                `academic_year` varchar(20) DEFAULT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `reg_no` (`reg_no`),
                KEY `idx_class_id` (`class_id`),
                KEY `idx_parent_id` (`parent_id`),
                KEY `idx_status` (`status`),
                KEY `idx_student_id` (`student_id`),
                KEY `idx_academic_year` (`academic_year`),
                CONSTRAINT `fk_students_class_id` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL,
                CONSTRAINT `fk_students_parent_id` FOREIGN KEY (`parent_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",

        'fees' => "
            CREATE TABLE IF NOT EXISTS `fees` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `class_id` int(11) NOT NULL,
                `term_id` int(11) NOT NULL,
                `session_id` int(11) NOT NULL,
                `name` varchar(255) NOT NULL,
                `amount` decimal(10,2) NOT NULL,
                `due_date` date DEFAULT NULL,
                `status` enum('active','inactive') NOT NULL DEFAULT 'active',
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_class_id` (`class_id`),
                KEY `idx_term_id` (`term_id`),
                KEY `idx_session_id` (`session_id`),
                CONSTRAINT `fk_fees_class_id` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_fees_term_id` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_fees_session_id` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",

        'payments' => "
            CREATE TABLE IF NOT EXISTS `payments` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `student_id` int(11) NOT NULL,
                `fee_id` int(11) NOT NULL,
                `amount_paid` decimal(10,2) NOT NULL,
                `payment_method` enum('cash','bank_transfer','pos','online') DEFAULT NULL,
                `transaction_id` varchar(100) DEFAULT NULL,
                `payment_date` date NOT NULL,
                `status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
                `proof_file` varchar(255) DEFAULT NULL,
                `verified_by` int(11) DEFAULT NULL,
                `verified_at` datetime DEFAULT NULL,
                `notes` text DEFAULT NULL,
                `created_by` int(11) DEFAULT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_student_id` (`student_id`),
                KEY `idx_fee_id` (`fee_id`),
                KEY `idx_status` (`status`),
                KEY `idx_payment_date` (`payment_date`),
                KEY `idx_created_by` (`created_by`),
                CONSTRAINT `fk_payments_student_id` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_payments_fee_id` FOREIGN KEY (`fee_id`) REFERENCES `fees` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_payments_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
                CONSTRAINT `fk_payments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",

        'scores' => "
            CREATE TABLE IF NOT EXISTS `scores` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `student_id` int(11) NOT NULL,
                `subject_id` int(11) NOT NULL,
                `class_id` int(11) NOT NULL,
                `term_id` int(11) NOT NULL,
                `session_id` int(11) NOT NULL,
                `assessment_type` enum('ca1','ca2','exam','project') NOT NULL,
                `score` decimal(5,2) NOT NULL,
                `max_score` decimal(5,2) NOT NULL DEFAULT 100.00,
                `teacher_id` int(11) NOT NULL,
                `status` enum('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
                `approved_by` int(11) DEFAULT NULL,
                `approved_at` datetime DEFAULT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_student_id` (`student_id`),
                KEY `idx_subject_id` (`subject_id`),
                KEY `idx_class_id` (`class_id`),
                KEY `idx_term_id` (`term_id`),
                KEY `idx_session_id` (`session_id`),
                KEY `idx_teacher_id` (`teacher_id`),
                KEY `idx_status` (`status`),
                CONSTRAINT `fk_scores_student_id` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_scores_subject_id` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_scores_class_id` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_scores_term_id` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_scores_session_id` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_scores_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_scores_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        "
    ];

    // Create tables
    foreach ($tables as $tableName => $sql) {
        echo "🔧 Creating table: $tableName...\n";
        try {
            $pdo->exec($sql);
            echo "✅ Table '$tableName' created successfully!\n";
        } catch (PDOException $e) {
            echo "❌ Error creating table '$tableName': " . $e->getMessage() . "\n";
        }
    }

    echo "\n🎉 Database setup completed!\n";

    // Create default admin user if not exists
    echo "🔧 Creating default admin user...\n";
    $checkAdmin = $pdo->prepare("SELECT id FROM users WHERE email = 'admin@gracelandacademy.edu.ng' LIMIT 1");
    $checkAdmin->execute();
    
    if ($checkAdmin->rowCount() === 0) {
        $passwordHash = password_hash('admin123', PASSWORD_DEFAULT);
        $insertAdmin = $pdo->prepare("
            INSERT INTO users (role, name, email, password_hash, status) 
            VALUES ('admin', 'System Administrator', 'admin@gracelandacademy.edu.ng', ?, 'active')
        ");
        $insertAdmin->execute([$passwordHash]);
        echo "✅ Default admin user created (email: admin@gracelandacademy.edu.ng, password: admin123)\n";
    } else {
        echo "ℹ️  Admin user already exists\n";
    }

    // Create sample session and term
    echo "🔧 Creating sample academic session...\n";
    $checkSession = $pdo->prepare("SELECT id FROM sessions WHERE name LIKE '%2024/2025%' LIMIT 1");
    $checkSession->execute();
    
    if ($checkSession->rowCount() === 0) {
        $insertSession = $pdo->prepare("
            INSERT INTO sessions (name, is_active, start_date, end_date) 
            VALUES ('2024/2025', 1, '2024-09-01', '2025-07-31')
        ");
        $insertSession->execute();
        $sessionId = $pdo->lastInsertId();
        
        // Create terms
        $terms = [
            ['First Term', '2024-09-01', '2024-12-15'],
            ['Second Term', '2025-01-05', '2025-03-28'],
            ['Third Term', '2025-04-15', '2025-07-31']
        ];
        
        foreach ($terms as $index => $term) {
            $insertTerm = $pdo->prepare("
                INSERT INTO terms (session_id, name, is_active, start_date, end_date) 
                VALUES (?, ?, ?, ?, ?)
            ");
            $isActive = $index === 1 ? 1 : 0; // Second term is active
            $insertTerm->execute([$sessionId, $term[0], $isActive, $term[1], $term[2]]);
        }
        
        echo "✅ Sample session and terms created\n";
    } else {
        echo "ℹ️  Academic session already exists\n";
    }

    echo "\n🎯 Setup completed successfully!\n";
    echo "📝 Next steps:\n";
    echo "   1. Update your .env file with correct database credentials\n";
    echo "   2. Test the API endpoints\n";
    echo "   3. Change the default admin password\n";

} catch (PDOException $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    echo "Please check your database configuration in the .env file\n";
}
