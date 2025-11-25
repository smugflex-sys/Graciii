<?php

/**
 * Notification Controller
 * Handles notification system operations
 */

class NotificationController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Get all notifications for current user
     */
    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            
            $sql = "SELECT n.*, 
                    CASE WHEN n.type = 'fee_reminder' THEN 'Fee Reminder'
                         WHEN n.type = 'payment_verified' THEN 'Payment Verified'
                         WHEN n.type = 'result_published' THEN 'Result Published'
                         WHEN n.type = 'general' THEN 'General'
                         ELSE n.type END as type_text
                    FROM notifications n
                    WHERE n.user_id = ? OR n.target_role = ?
                    ORDER BY n.created_at DESC
                    LIMIT 50";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$user['id'], $user['role']]);
            $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($notifications, 'Notifications retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve notifications: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Send a notification
     */
    public function send() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin', 'teacher'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validateNotificationData($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            $recipients = [];
            
            // Determine recipients
            if (isset($input['target_role'])) {
                // Send to all users with specific role
                $sql = "SELECT id FROM users WHERE role = ? AND status = 'active'";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$input['target_role']]);
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $recipients = array_column($users, 'id');
            } elseif (isset($input['user_ids'])) {
                $recipients = $input['user_ids'];
            } elseif (isset($input['class_id'])) {
                // Send to all parents of students in a class
                $sql = "SELECT DISTINCT parent_id FROM students WHERE class_id = ? AND parent_id IS NOT NULL";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$input['class_id']]);
                $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $recipients = array_column($students, 'parent_id');
            }
            
            if (empty($recipients)) {
                Response::error('No recipients found', 400);
                return;
            }
            
            // Send notifications
            $sentCount = 0;
            foreach ($recipients as $recipientId) {
                $sql = "INSERT INTO notifications (user_id, type, title, message, data, created_by) 
                        VALUES (?, ?, ?, ?, ?, ?)";
                
                $stmt = $this->db->prepare($sql);
                $result = $stmt->execute([
                    $recipientId,
                    $input['type'],
                    $input['title'],
                    $input['message'],
                    json_encode($input['data'] ?? []),
                    $user['id']
                ]);
                
                if ($result) {
                    $sentCount++;
                }
            }
            
            Response::success(['sent_count' => $sentCount], "Notification sent to {$sentCount} recipients");
            
        } catch (Exception $e) {
            Response::error('Failed to send notification: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Mark notification as read
     */
    public function markAsRead() {
        try {
            $user = JWTHandler::getCurrentUser();
            $notificationId = $_GET['id'] ?? null;
            
            if (!$notificationId) {
                Response::error('Notification ID is required', 400);
                return;
            }
            
            // Update notification
            $sql = "UPDATE notifications SET read_at = NOW() 
                    WHERE id = ? AND user_id = ? AND read_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$notificationId, $user['id']]);
            
            if ($stmt->rowCount() === 0) {
                Response::error('Notification not found or already read', 404);
                return;
            }
            
            Response::success(null, 'Notification marked as read');
            
        } catch (Exception $e) {
            Response::error('Failed to mark notification as read: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Delete a notification
     */
    public function delete() {
        try {
            $user = JWTHandler::getCurrentUser();
            $notificationId = $_GET['id'] ?? null;
            
            if (!$notificationId) {
                Response::error('Notification ID is required', 400);
                return;
            }
            
            // Delete notification
            $sql = "DELETE FROM notifications WHERE id = ? AND user_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$notificationId, $user['id']]);
            
            if ($stmt->rowCount() === 0) {
                Response::error('Notification not found', 404);
                return;
            }
            
            Response::success(null, 'Notification deleted');
            
        } catch (Exception $e) {
            Response::error('Failed to delete notification: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get unread count
     */
    public function getUnreadCount() {
        try {
            $user = JWTHandler::getCurrentUser();
            
            $sql = "SELECT COUNT(*) as unread_count 
                    FROM notifications 
                    WHERE (user_id = ? OR target_role = ?) AND read_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$user['id'], $user['role']]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            Response::success(['unread_count' => $result['unread_count']], 'Unread count retrieved');
            
        } catch (Exception $e) {
            Response::error('Failed to get unread count: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Create automatic notifications
     */
    public function createAutomaticNotification($userId, $type, $title, $message, $data = []) {
        try {
            $sql = "INSERT INTO notifications (user_id, type, title, message, data, created_by) 
                    VALUES (?, ?, ?, ?, ?, NULL)";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $userId,
                $type,
                $title,
                $message,
                json_encode($data)
            ]);
            
            return $this->db->lastInsertId();
            
        } catch (Exception $e) {
            error_log('Failed to create automatic notification: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Validate notification data
     */
    private function validateNotificationData($input) {
        $errors = [];
        
        if (!isset($input['type'])) {
            $errors['type'] = 'Notification type is required';
        }
        
        if (!isset($input['title']) || empty(trim($input['title']))) {
            $errors['title'] = 'Title is required';
        }
        
        if (!isset($input['message']) || empty(trim($input['message']))) {
            $errors['message'] = 'Message is required';
        }
        
        // Validate recipients
        $hasRecipients = isset($input['target_role']) || isset($input['user_ids']) || isset($input['class_id']);
        if (!$hasRecipients) {
            $errors['recipients'] = 'Must specify target_role, user_ids, or class_id';
        }
        
        return $errors;
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
