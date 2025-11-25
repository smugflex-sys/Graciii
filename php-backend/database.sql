-- =======================================================
-- Graceland Royal Academy - Complete Database Schema
-- =======================================================
-- Database: leuluzjk_graceland_db
-- Created for Production Deployment

-- Create database and select it
CREATE DATABASE IF NOT EXISTS `leuluzjk_graceland_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `leuluzjk_graceland_db`;

-- ==================== USERS ====================
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
    -- Teacher specific fields
    `employee_id` varchar(50) DEFAULT NULL,
    `qualification` varchar(255) DEFAULT NULL,
    `specialization` json DEFAULT NULL,
    `is_class_teacher` tinyint(1) DEFAULT 0,
    `class_teacher_id` int(11) DEFAULT NULL,
    -- Parent specific fields
    `student_ids` json DEFAULT NULL,
    `occupation` varchar(255) DEFAULT NULL,
    `address` text DEFAULT NULL,
    -- Accountant specific fields
    `department` varchar(100) DEFAULT NULL,
    `employee_level` varchar(50) DEFAULT NULL,
    -- Common fields
    `photo_url` varchar(255) DEFAULT NULL,
    `date_of_birth` date DEFAULT NULL,
    `gender` enum('male','female','other') DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `email` (`email`),
    KEY `idx_role` (`role`),
    KEY `idx_status` (`status`),
    KEY `idx_deleted_at` (`deleted_at`),
    KEY `idx_employee_id` (`employee_id`),
    KEY `idx_class_teacher_id` (`class_teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== REFRESH TOKENS ====================
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

-- ==================== SECURITY TABLES ====================
CREATE TABLE IF NOT EXISTS `rate_limits` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `ip_address` varchar(45) NOT NULL,
    `endpoint` varchar(255) NOT NULL,
    `request_count` int(11) NOT NULL DEFAULT 1,
    `window_start` datetime NOT NULL,
    `window_end` datetime NOT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_ip_endpoint_window` (`ip_address`, `endpoint`, `window_start`),
    KEY `idx_ip_address` (`ip_address`),
    KEY `idx_endpoint` (`endpoint`),
    KEY `idx_window_end` (`window_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `failed_attempts` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `ip_address` varchar(45) NOT NULL,
    `email` varchar(255) DEFAULT NULL,
    `attempt_type` enum('login','register','password_reset') NOT NULL,
    `attempt_count` int(11) NOT NULL DEFAULT 1,
    `last_attempt` datetime NOT NULL,
    `is_locked` tinyint(1) NOT NULL DEFAULT 0,
    `locked_until` datetime DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_ip_address` (`ip_address`),
    KEY `idx_email` (`email`),
    KEY `idx_attempt_type` (`attempt_type`),
    KEY `idx_last_attempt` (`last_attempt`),
    KEY `idx_locked_until` (`locked_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `account_lockouts` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) DEFAULT NULL,
    `ip_address` varchar(45) NOT NULL,
    `email` varchar(255) DEFAULT NULL,
    `lockout_reason` varchar(255) NOT NULL,
    `locked_at` datetime NOT NULL,
    `locked_until` datetime NOT NULL,
    `is_active` tinyint(1) NOT NULL DEFAULT 1,
    `released_at` datetime DEFAULT NULL,
    `released_by` int(11) DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_ip_address` (`ip_address`),
    KEY `idx_email` (`email`),
    KEY `idx_locked_until` (`locked_until`),
    KEY `idx_is_active` (`is_active`),
    CONSTRAINT `fk_account_lockouts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `security_logs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `event_type` varchar(50) NOT NULL,
    `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    `user_id` int(11) DEFAULT NULL,
    `ip_address` varchar(45) DEFAULT NULL,
    `user_agent` text DEFAULT NULL,
    `description` text NOT NULL,
    `details` json DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_event_type` (`event_type`),
    KEY `idx_severity` (`severity`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_ip_address` (`ip_address`),
    KEY `idx_created_at` (`created_at`),
    CONSTRAINT `fk_security_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SESSIONS ====================
CREATE TABLE IF NOT EXISTS `sessions` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `is_active` tinyint(1) NOT NULL DEFAULT 1,
    `prefix` varchar(20) DEFAULT NULL,
    `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
    `start_date` date NOT NULL,
    `end_date` date NOT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_is_active` (`is_active`),
    KEY `idx_status` (`status`),
    KEY `idx_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TERMS ====================
CREATE TABLE IF NOT EXISTS `terms` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `session_id` int(11) NOT NULL,
    `name` varchar(100) NOT NULL,
    `is_active` tinyint(1) NOT NULL DEFAULT 0,
    `is_current` tinyint(1) NOT NULL DEFAULT 0,
    `start_date` date NOT NULL,
    `end_date` date NOT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_session_id` (`session_id`),
    KEY `idx_is_active` (`is_active`),
    KEY `idx_is_current` (`is_current`),
    CONSTRAINT `fk_terms_session_id` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== CLASSES ====================
CREATE TABLE IF NOT EXISTS `classes` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(100) NOT NULL,
    `level` varchar(50) DEFAULT NULL,
    `capacity` int(11) DEFAULT 40,
    `class_teacher_id` int(11) DEFAULT NULL,
    `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_class_teacher_id` (`class_teacher_id`),
    KEY `idx_status` (`status`),
    KEY `idx_capacity` (`capacity`),
    CONSTRAINT `fk_classes_class_teacher_id` FOREIGN KEY (`class_teacher_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SUBJECTS ====================
CREATE TABLE IF NOT EXISTS `subjects` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(100) NOT NULL,
    `code` varchar(20) DEFAULT NULL,
    `department` varchar(50) DEFAULT 'General',
    `credit_units` int(11) DEFAULT 1,
    `description` text DEFAULT NULL,
    `is_core` tinyint(1) NOT NULL DEFAULT 0,
    `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `code` (`code`),
    KEY `idx_is_core` (`is_core`),
    KEY `idx_status` (`status`),
    KEY `idx_department` (`department`),
    KEY `idx_credit_units` (`credit_units`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== STUDENTS ====================
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
    `deleted_at` datetime DEFAULT NULL,
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

-- ==================== FEES ====================
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

-- ==================== PAYMENTS ====================
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

-- ==================== SCORES ====================
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
    `status` enum('DRAFT','SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
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

-- ==================== COMPILED RESULTS ====================
CREATE TABLE IF NOT EXISTS `compiled_results` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `student_id` int(11) NOT NULL,
    `class_id` int(11) NOT NULL,
    `term` varchar(50) NOT NULL,
    `academic_year` varchar(20) NOT NULL,
    `session_id` int(11) NOT NULL,
    `scores` json DEFAULT NULL,
    `affective` json DEFAULT NULL,
    `psychomotor` json DEFAULT NULL,
    `total_score` decimal(7,2) NOT NULL,
    `average_score` decimal(5,2) NOT NULL,
    `class_average` decimal(5,2) NOT NULL,
    `position` int(11) NOT NULL,
    `total_students` int(11) NOT NULL,
    `grade` varchar(2) NOT NULL,
    `times_present` int(11) NOT NULL DEFAULT 0,
    `times_absent` int(11) NOT NULL DEFAULT 0,
    `total_attendance_days` int(11) NOT NULL DEFAULT 0,
    `term_begin` date DEFAULT NULL,
    `term_end` date DEFAULT NULL,
    `next_term_begin` date DEFAULT NULL,
    `class_teacher_name` varchar(255) DEFAULT NULL,
    `class_teacher_comment` text DEFAULT NULL,
    `principal_name` varchar(255) DEFAULT NULL,
    `principal_comment` text DEFAULT NULL,
    `principal_signature` varchar(255) DEFAULT NULL,
    `compiled_by` int(11) NOT NULL,
    `compiled_date` datetime NOT NULL,
    `status` enum('Draft','Submitted','Approved','Rejected') NOT NULL DEFAULT 'Draft',
    `approved_by` int(11) DEFAULT NULL,
    `approved_date` datetime DEFAULT NULL,
    `rejection_reason` text DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_student_id` (`student_id`),
    KEY `idx_class_id` (`class_id`),
    KEY `idx_term` (`term`),
    KEY `idx_academic_year` (`academic_year`),
    KEY `idx_session_id` (`session_id`),
    KEY `idx_status` (`status`),
    KEY `idx_compiled_by` (`compiled_by`),
    CONSTRAINT `fk_compiled_results_student_id` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_compiled_results_class_id` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_compiled_results_session_id` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_compiled_results_compiled_by` FOREIGN KEY (`compiled_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_compiled_results_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SCHOOL SETTINGS ====================
CREATE TABLE IF NOT EXISTS `school_settings` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `setting_key` varchar(100) NOT NULL,
    `setting_value` text NOT NULL,
    `setting_type` enum('string','boolean','integer','float','email','url','json') NOT NULL,
    `category` varchar(100) NOT NULL DEFAULT 'general',
    `description` text DEFAULT NULL,
    `is_public` tinyint(1) NOT NULL DEFAULT 0,
    `principal_user_id` int(11) DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_setting_key` (`setting_key`),
    KEY `idx_category` (`category`),
    KEY `idx_is_public` (`is_public`),
    CONSTRAINT `fk_school_settings_principal_user_id` FOREIGN KEY (`principal_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) DEFAULT NULL,
    `target_role` enum('admin','teacher','parent','accountant','student') DEFAULT NULL,
    `type` varchar(50) NOT NULL,
    `title` varchar(255) NOT NULL,
    `message` text NOT NULL,
    `data` json DEFAULT NULL,
    `created_by` int(11) DEFAULT NULL,
    `read_at` datetime DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_target_role` (`target_role`),
    KEY `idx_type` (`type`),
    KEY `idx_read_at` (`read_at`),
    CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_notifications_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== ACTIVITY LOGS ====================
CREATE TABLE IF NOT EXISTS `activity_logs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `action` varchar(100) NOT NULL,
    `table_name` varchar(100) DEFAULT NULL,
    `record_id` int(11) DEFAULT NULL,
    `details` text DEFAULT NULL,
    `ip_address` varchar(45) DEFAULT NULL,
    `user_agent` varchar(255) DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_action` (`action`),
    KEY `idx_table_name` (`table_name`),
    KEY `idx_created_at` (`created_at`),
    CONSTRAINT `fk_activity_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== ADMISSIONS ====================
CREATE TABLE IF NOT EXISTS `admissions` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `admission_no` varchar(50) NOT NULL,
    `student_name` varchar(255) NOT NULL,
    `date_of_birth` date NOT NULL,
    `gender` enum('male','female') NOT NULL,
    `parent_name` varchar(255) NOT NULL,
    `parent_phone` varchar(20) NOT NULL,
    `parent_email` varchar(255) DEFAULT NULL,
    `address` text NOT NULL,
    `previous_school` varchar(255) DEFAULT NULL,
    `class_applied` int(11) NOT NULL,
    `session_id` int(11) NOT NULL,
    `admission_date` date NOT NULL,
    `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    `rejection_reason` text DEFAULT NULL,
    `approved_by` int(11) DEFAULT NULL,
    `approved_at` datetime DEFAULT NULL,
    `rejected_by` int(11) DEFAULT NULL,
    `rejected_at` datetime DEFAULT NULL,
    `student_id` int(11) DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_admission_no` (`admission_no`),
    KEY `idx_session_id` (`session_id`),
    KEY `idx_class_applied` (`class_applied`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_admissions_class_applied` FOREIGN KEY (`class_applied`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_admissions_session_id` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_admissions_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_admissions_rejected_by` FOREIGN KEY (`rejected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_admissions_student_id` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SAMPLE DATA ====================

-- Insert sample academic sessions
INSERT IGNORE INTO `sessions` (`name`, `is_active`, `prefix`, `status`, `start_date`, `end_date`) VALUES
('2024/2025', 1, '2024/25', 'Active', '2024-09-01', '2025-07-31'),
('2023/2024', 0, '2023/24', 'Inactive', '2023-09-01', '2024-07-31'),
('2025/2026', 0, '2025/26', 'Inactive', '2025-09-01', '2026-07-31');

-- Insert sample terms for 2024/2025 session
INSERT IGNORE INTO `terms` (`session_id`, `name`, `is_active`, `is_current`, `start_date`, `end_date`) VALUES
(1, 'First Term', 0, 0, '2024-09-01', '2024-12-15'),
(1, 'Second Term', 1, 1, '2025-01-05', '2025-04-10'),
(1, 'Third Term', 0, 0, '2025-04-20', '2025-07-31');

-- Insert sample classes
INSERT IGNORE INTO `classes` (`name`, `level`, `capacity`, `status`) VALUES
('Nursery 1', 'Nursery', 30, 'Active'),
('Nursery 2', 'Nursery', 30, 'Active'),
('Nursery 3', 'Nursery', 30, 'Active'),
('Primary 1', 'Primary', 40, 'Active'),
('Primary 2', 'Primary', 40, 'Active'),
('Primary 3', 'Primary', 40, 'Active'),
('Primary 4', 'Primary', 40, 'Active'),
('Primary 5', 'Primary', 40, 'Active'),
('Primary 6', 'Primary', 40, 'Active'),
('JSS 1', 'Junior Secondary', 45, 'Active'),
('JSS 2', 'Junior Secondary', 45, 'Active'),
('JSS 3', 'Junior Secondary', 45, 'Active'),
('SSS 1', 'Senior Secondary', 45, 'Active'),
('SSS 2', 'Senior Secondary', 45, 'Active'),
('SSS 3', 'Senior Secondary', 45, 'Active');

-- Insert sample subjects
INSERT IGNORE INTO `subjects` (`name`, `code`, `department`, `credit_units`, `is_core`, `status`) VALUES
('English Language', 'ENG', 'Languages', 5, 1, 'Active'),
('Mathematics', 'MAT', 'Sciences', 5, 1, 'Active'),
('Physics', 'PHY', 'Sciences', 4, 1, 'Active'),
('Chemistry', 'CHE', 'Sciences', 4, 1, 'Active'),
('Biology', 'BIO', 'Sciences', 4, 1, 'Active'),
('Economics', 'ECO', 'Social Sciences', 3, 1, 'Active'),
('Geography', 'GEO', 'Social Sciences', 3, 0, 'Active'),
('History', 'HIS', 'Social Sciences', 3, 0, 'Active'),
('Civic Education', 'CIV', 'Social Sciences', 2, 1, 'Active'),
('Computer Studies', 'COM', 'Sciences', 3, 1, 'Active'),
('Physical Education', 'PE', 'Physical', 2, 0, 'Active'),
('Fine Art', 'ART', 'Arts', 2, 0, 'Active'),
('Music', 'MUS', 'Arts', 2, 0, 'Active'),
('Home Economics', 'HEC', 'Vocational', 2, 0, 'Active'),
('Agricultural Science', 'AGR', 'Sciences', 3, 0, 'Active'),
('Business Studies', 'BUS', 'Vocational', 3, 0, 'Active'),
('Accounting', 'ACC', 'Commercial', 3, 0, 'Active'),
('Commerce', 'COM', 'Commercial', 3, 0, 'Active'),
('Literature in English', 'LIT', 'Languages', 3, 0, 'Active'),
('French Language', 'FRE', 'Languages', 2, 0, 'Active'),
('Christian Religious Studies', 'CRS', 'Religious', 2, 0, 'Active'),
('Islamic Religious Studies', 'IRS', 'Religious', 2, 0, 'Active'),
('Yoruba Language', 'YOR', 'Languages', 2, 0, 'Active'),
('Hausa Language', 'HAU', 'Languages', 2, 0, 'Active'),
('Igbo Language', 'IGB', 'Languages', 2, 0, 'Active');

-- Insert school settings
INSERT IGNORE INTO `school_settings` (`setting_key`, `setting_value`, `setting_type`, `category`, `description`, `is_public`) VALUES
('school_name', 'Graceland Royal Academy Gombe', 'string', 'general', 'Name of the school', 1),
('school_motto', 'Wisdom & Illumination', 'string', 'general', 'School motto', 1),
('school_address', 'Gombe, Nigeria', 'string', 'general', 'School physical address', 1),
('school_phone', '+234-XXX-XXX-XXXX', 'string', 'general', 'School phone number', 1),
('school_email', 'info@gracelandacademy.edu.ng', 'email', 'general', 'School email address', 1),
('school_website', 'https://gracelandroyalacademy.org', 'url', 'general', 'School website', 1),
('principal_name', 'Mrs. Grace Okoro', 'string', 'administration', 'Name of the principal', 1),
('academic_session_current', '1', 'integer', 'academic', 'Current academic session ID', 0),
('academic_term_current', '2', 'integer', 'academic', 'Current academic term ID', 0),
('grading_system_a_min', '70', 'integer', 'academic', 'Minimum score for A grade', 0),
('grading_system_b_min', '60', 'integer', 'academic', 'Minimum score for B grade', 0),
('grading_system_c_min', '50', 'integer', 'academic', 'Minimum score for C grade', 0),
('grading_system_d_min', '45', 'integer', 'academic', 'Minimum score for D grade', 0),
('grading_system_e_min', '40', 'integer', 'academic', 'Minimum score for E grade', 0),
('grading_system_f_max', '39', 'integer', 'academic', 'Maximum score for F grade', 0),
('fee_payment_deadline_days', '14', 'integer', 'finance', 'Number of days to pay fees after due date', 0),
('late_fee_penalty_percentage', '10', 'float', 'finance', 'Percentage penalty for late fee payment', 0),
('max_file_upload_size', '5242880', 'integer', 'system', 'Maximum file upload size in bytes', 0),
('session_timeout_minutes', '30', 'integer', 'security', 'Session timeout in minutes', 0),
('max_login_attempts', '5', 'integer', 'security', 'Maximum login attempts before lockout', 0),
('lockout_duration_minutes', '15', 'integer', 'security', 'Account lockout duration in minutes', 0);

-- Create default admin user (password: admin123)
INSERT IGNORE INTO `users` (`role`, `name`, `email`, `password_hash`, `status`) VALUES
('admin', 'System Administrator', 'admin@graceland.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active');

-- =======================================================
-- TRIGGERS FOR ACTIVITY LOGGING
-- =======================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS `log_user_insert`;
DROP TRIGGER IF EXISTS `log_user_update`;
DROP TRIGGER IF EXISTS `log_payment_insert`;
DROP TRIGGER IF EXISTS `log_payment_update`;
DROP TRIGGER IF EXISTS `log_score_insert`;

-- Set delimiter to handle multi-statement triggers
DELIMITER //

-- Trigger for user insert
CREATE TRIGGER `log_user_insert` AFTER INSERT ON `users`
FOR EACH ROW
BEGIN
    INSERT INTO `activity_logs` (`user_id`, `action`, `table_name`, `record_id`, `details`)
    VALUES (NEW.id, 'INSERT', 'users', NEW.id, CONCAT('Created user: ', NEW.name, ' (', NEW.email, ')'));
END//

-- Trigger for user update
CREATE TRIGGER `log_user_update` AFTER UPDATE ON `users`
FOR EACH ROW
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO `activity_logs` (`user_id`, `action`, `table_name`, `record_id`, `details`)
        VALUES (NEW.id, 'STATUS_CHANGE', 'users', NEW.id, CONCAT('User status changed from ', OLD.status, ' to ', NEW.status));
    END IF;
END//

-- Trigger for payment insert
CREATE TRIGGER `log_payment_insert` AFTER INSERT ON `payments`
FOR EACH ROW
BEGIN
    INSERT INTO `activity_logs` (`user_id`, `action`, `table_name`, `record_id`, `details`)
    VALUES (NEW.created_by, 'INSERT', 'payments', NEW.id, CONCAT('Payment recorded: ', NEW.amount_paid, ' for student ID ', NEW.student_id));
END//

-- Trigger for payment update
CREATE TRIGGER `log_payment_update` AFTER UPDATE ON `payments`
FOR EACH ROW
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO `activity_logs` (`user_id`, `action`, `table_name`, `record_id`, `details`)
        VALUES (NEW.verified_by, 'STATUS_CHANGE', 'payments', NEW.id, CONCAT('Payment status changed from ', OLD.status, ' to ', NEW.status));
    END IF;
END//

-- Trigger for score insert
CREATE TRIGGER `log_score_insert` AFTER INSERT ON `scores`
FOR EACH ROW
BEGIN
    INSERT INTO `activity_logs` (`user_id`, `action`, `table_name`, `record_id`, `details`)
    VALUES (NEW.teacher_id, 'INSERT', 'scores', NEW.id, CONCAT('Score recorded: ', NEW.score, ' for student ID ', NEW.student_id, ' in subject ID ', NEW.subject_id));
END//

-- Reset delimiter to default
DELIMITER ;

-- =======================================================
-- VIEWS FOR COMMON QUERIES
-- =======================================================

-- View for student summary
CREATE OR REPLACE VIEW `v_student_summary` AS
SELECT 
    s.id,
    s.reg_no,
    s.full_name,
    s.gender,
    s.dob,
    s.phone,
    c.name as class_name,
    c.level,
    u.name as parent_name,
    u.phone as parent_phone,
    s.created_at
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN users u ON s.parent_id = u.id
WHERE s.deleted_at IS NULL;

-- View for payment summary
CREATE OR REPLACE VIEW `v_payment_summary` AS
SELECT 
    p.id,
    p.amount_paid,
    p.payment_date,
    p.status,
    s.full_name as student_name,
    s.reg_no,
    f.name as fee_name,
    c.name as class_name,
    u1.name as verified_by_name,
    p.created_at
FROM payments p
LEFT JOIN students s ON p.student_id = s.id
LEFT JOIN fees f ON p.fee_id = f.id
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN users u1 ON p.verified_by = u1.id;

-- =======================================================
-- FINAL VERIFICATION
-- =======================================================

-- Verify admin user was created
SELECT 'Admin User Verification:' as info;
SELECT COUNT(*) as admin_count FROM `users` WHERE `role` = 'admin' AND `email` = 'admin@graceland.com';

-- Verify core tables exist
SELECT 'Table Verification:' as info;
SELECT 
    'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'terms', COUNT(*) FROM terms
UNION ALL
SELECT 'classes', COUNT(*) FROM classes
UNION ALL
SELECT 'subjects', COUNT(*) FROM subjects
UNION ALL
SELECT 'school_settings', COUNT(*) FROM school_settings;

-- =======================================================
-- COMPLETION MESSAGE
-- =======================================================

SELECT 'Database setup completed successfully!' as message;
SELECT 'Default admin user: admin@graceland.com / admin123' as admin_info;
SELECT 'Total tables created:' as info, COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'leuluzjk_graceland_db';

-- =======================================================
-- END OF DATABASE SCHEMA
-- =======================================================
