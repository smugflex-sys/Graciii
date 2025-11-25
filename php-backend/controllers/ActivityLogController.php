<?php

/**
 * Activity Log Controller
 * Handles activity logging and retrieval
 */

class ActivityLogController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Get all activity logs
     */
    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $params = $_GET;
            
            $sql = "SELECT al.*, u.name as user_name, u.role as user_role
                   FROM activity_logs al
                   LEFT JOIN users u ON al.user_id = u.id
                   WHERE 1=1";
            
            $bindings = [];
            
            if (!empty($params['user_id'])) {
                $sql .= " AND al.user_id = ?";
                $bindings[] = $params['user_id'];
            }
            
            if (!empty($params['action'])) {
                $sql .= " AND al.action = ?";
                $bindings[] = $params['action'];
            }
            
            if (!empty($params['table_name'])) {
                $sql .= " AND al.table_name = ?";
                $bindings[] = $params['table_name'];
            }
            
            if (!empty($params['date_from'])) {
                $sql .= " AND al.created_at >= ?";
                $bindings[] = $params['date_from'] . ' 00:00:00';
            }
            
            if (!empty($params['date_to'])) {
                $sql .= " AND al.created_at <= ?";
                $bindings[] = $params['date_to'] . ' 23:59:59';
            }
            
            $sql .= " ORDER BY al.created_at DESC";
            
            // Pagination
            $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
            $offset = isset($params['offset']) ? (int)$params['offset'] : 0;
            
            $sql .= " LIMIT ? OFFSET ?";
            $bindings[] = $limit;
            $bindings[] = $offset;
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($bindings);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON details
            foreach ($logs as &$log) {
                if ($log['details']) {
                    $log['details'] = json_decode($log['details'], true);
                }
            }
            
            Response::success($logs, 'Activity logs retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve activity logs: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get activity logs for specific user
     */
    public function getByUser() {
        try {
            $user = JWTHandler::getCurrentUser();
            
            $userId = $_GET['user_id'] ?? $user['id'];
            
            // Users can only view their own logs unless admin
            if ($user['role'] !== 'admin' && $userId != $user['id']) {
                Response::error('You can only view your own activity logs', 403);
                return;
            }
            
            $params = $_GET;
            
            $sql = "SELECT al.*, u.name as user_name, u.role as user_role
                   FROM activity_logs al
                   LEFT JOIN users u ON al.user_id = u.id
                   WHERE al.user_id = ?";
            
            $bindings = [$userId];
            
            if (!empty($params['action'])) {
                $sql .= " AND al.action = ?";
                $bindings[] = $params['action'];
            }
            
            if (!empty($params['table_name'])) {
                $sql .= " AND al.table_name = ?";
                $bindings[] = $params['table_name'];
            }
            
            $sql .= " ORDER BY al.created_at DESC";
            
            // Pagination
            $limit = isset($params['limit']) ? (int)$params['limit'] : 20;
            $offset = isset($params['offset']) ? (int)$params['offset'] : 0;
            
            $sql .= " LIMIT ? OFFSET ?";
            $bindings[] = $limit;
            $bindings[] = $offset;
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($bindings);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON details
            foreach ($logs as &$log) {
                if ($log['details']) {
                    $log['details'] = json_decode($log['details'], true);
                }
            }
            
            Response::success($logs, 'User activity logs retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve user activity logs: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Log activity
     */
    public function logActivity($userId, $action, $tableName = null, $recordId = null, $details = null) {
        try {
            $sql = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address, user_agent) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                $userId,
                $action,
                $tableName,
                $recordId,
                $details ? json_encode($details) : null,
                $_SERVER['REMOTE_ADDR'] ?? '',
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);
            
            return $result;
            
        } catch (Exception $e) {
            error_log('Failed to log activity: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get activity statistics
     */
    public function getStatistics() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $params = $_GET;
            
            $dateCondition = "";
            $bindings = [];
            
            if (!empty($params['date_from'])) {
                $dateCondition .= " AND created_at >= ?";
                $bindings[] = $params['date_from'] . ' 00:00:00';
            }
            
            if (!empty($params['date_to'])) {
                $dateCondition .= " AND created_at <= ?";
                $bindings[] = $params['date_to'] . ' 23:59:59';
            }
            
            // Total activities
            $totalSql = "SELECT COUNT(*) as total FROM activity_logs WHERE 1=1 $dateCondition";
            $totalStmt = $this->db->prepare($totalSql);
            $totalStmt->execute($bindings);
            $stats['total_activities'] = $totalStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // Activities by action type
            $actionSql = "SELECT action, COUNT(*) as count 
                         FROM activity_logs 
                         WHERE 1=1 $dateCondition
                         GROUP BY action 
                         ORDER BY count DESC";
            $actionStmt = $this->db->prepare($actionSql);
            $actionStmt->execute($bindings);
            $stats['by_action'] = $actionStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Activities by user
            $userSql = "SELECT u.name, u.role, COUNT(*) as count 
                       FROM activity_logs al
                       LEFT JOIN users u ON al.user_id = u.id
                       WHERE 1=1 $dateCondition
                       GROUP BY al.user_id, u.name, u.role
                       ORDER BY count DESC
                       LIMIT 10";
            $userStmt = $this->db->prepare($userSql);
            $userStmt->execute($bindings);
            $stats['by_user'] = $userStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Activities by table
            $tableSql = "SELECT table_name, COUNT(*) as count 
                        FROM activity_logs 
                        WHERE table_name IS NOT NULL $dateCondition
                        GROUP BY table_name 
                        ORDER BY count DESC";
            $tableStmt = $this->db->prepare($tableSql);
            $tableStmt->execute($bindings);
            $stats['by_table'] = $tableStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Daily activity (last 30 days)
            $dailySql = "SELECT DATE(created_at) as date, COUNT(*) as count 
                        FROM activity_logs 
                        WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
                        GROUP BY DATE(created_at)
                        ORDER BY date DESC";
            $dailyStmt = $this->db->prepare($dailySql);
            $dailyStmt->execute();
            $stats['daily_activity'] = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($stats, 'Activity statistics retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve activity statistics: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Clear old activity logs
     */
    public function clearOldLogs() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $days = $_GET['days'] ?? 90; // Default 90 days
            
            $sql = "DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$days]);
            
            $deletedCount = $stmt->rowCount();
            
            Response::success([
                'deleted_count' => $deletedCount,
                'days_retained' => $days
            ], "Old activity logs cleared successfully");
            
        } catch (Exception $e) {
            Response::error('Failed to clear old logs: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Check user permission
     */
    private function checkPermission($allowedRoles, $user) {
        if (!in_array($user['role'], $allowedRoles)) {
            Response::error('Insufficient permissions', 403);
            exit;
        }
    }
}
