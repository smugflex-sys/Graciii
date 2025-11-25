<?php

/**
 * Settings Controller
 * Handles school settings management
 */

class SettingsController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Get all settings
     */
    public function getAll() {
        try {
            $user = JWTHandler::getCurrentUser();
            
            $params = $_GET;
            
            $sql = "SELECT * FROM school_settings WHERE 1=1";
            $bindings = [];
            
            // Filter by public settings for non-admin users
            if ($user['role'] !== 'admin') {
                $sql .= " AND is_public = TRUE";
            }
            
            if (!empty($params['category'])) {
                $sql .= " AND category = ?";
                $bindings[] = $params['category'];
            }
            
            $sql .= " ORDER BY category, setting_key";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($bindings);
            $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Group settings by category
            $groupedSettings = [];
            foreach ($settings as $setting) {
                // Convert setting value based on type
                switch ($setting['setting_type']) {
                    case 'boolean':
                        $setting['setting_value'] = filter_var($setting['setting_value'], FILTER_VALIDATE_BOOLEAN);
                        break;
                    case 'integer':
                        $setting['setting_value'] = (int)$setting['setting_value'];
                        break;
                    case 'float':
                        $setting['setting_value'] = (float)$setting['setting_value'];
                        break;
                    case 'json':
                        $setting['setting_value'] = json_decode($setting['setting_value'], true);
                        break;
                }
                
                $groupedSettings[$setting['category']][] = $setting;
            }
            
            Response::success($groupedSettings, 'Settings retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve settings: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update settings
     */
    public function update() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (empty($input['settings']) || !is_array($input['settings'])) {
                Response::error('Settings data is required', 400);
                return;
            }
            
            $updatedSettings = [];
            $errors = [];
            
            foreach ($input['settings'] as $settingData) {
                // Validate required fields
                if (!isset($settingData['setting_key']) || !isset($settingData['setting_value'])) {
                    $errors[] = 'Each setting must have setting_key and setting_value';
                    continue;
                }
                
                // Get setting metadata
                $settingSql = "SELECT * FROM school_settings WHERE setting_key = ?";
                $settingStmt = $this->db->prepare($settingSql);
                $settingStmt->execute([$settingData['setting_key']]);
                $setting = $settingStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$setting) {
                    $errors[] = "Setting '{$settingData['setting_key']}' not found";
                    continue;
                }
                
                // Validate setting value based on type
                $validationError = $this->validateSettingValue($setting, $settingData['setting_value']);
                if ($validationError) {
                    $errors[] = $validationError;
                    continue;
                }
                
                // Convert value to string for storage
                $value = $this->convertValueToString($settingData['setting_value'], $setting['setting_type']);
                
                // Update setting
                $updateSql = "UPDATE school_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?";
                $updateStmt = $this->db->prepare($updateSql);
                $result = $updateStmt->execute([$value, $settingData['setting_key']]);
                
                if ($result) {
                    $updatedSettings[] = [
                        'setting_key' => $settingData['setting_key'],
                        'setting_value' => $settingData['setting_value']
                    ];
                    
                    // Log activity
                    $this->logActivity($user['id'], 'UPDATE_SETTING', 'school_settings', null, [
                        'setting_key' => $settingData['setting_key'],
                        'old_value' => $setting['setting_value'],
                        'new_value' => $value
                    ]);
                }
            }
            
            if (!empty($errors)) {
                Response::error('Some settings could not be updated: ' . implode(', ', $errors), 400);
                return;
            }
            
            Response::success($updatedSettings, 'Settings updated successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to update settings: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get setting by key
     */
    public function getByKey() {
        try {
            $user = JWTHandler::getCurrentUser();
            
            $settingKey = $_GET['key'] ?? null;
            
            if (!$settingKey) {
                Response::error('Setting key is required', 400);
                return;
            }
            
            $sql = "SELECT * FROM school_settings WHERE setting_key = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$settingKey]);
            $setting = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$setting) {
                Response::error('Setting not found', 404);
                return;
            }
            
            // Check if setting is public for non-admin users
            if ($user['role'] !== 'admin' && !$setting['is_public']) {
                Response::error('Setting not accessible', 403);
                return;
            }
            
            // Convert setting value based on type
            switch ($setting['setting_type']) {
                case 'boolean':
                    $setting['setting_value'] = filter_var($setting['setting_value'], FILTER_VALIDATE_BOOLEAN);
                    break;
                case 'integer':
                    $setting['setting_value'] = (int)$setting['setting_value'];
                    break;
                case 'float':
                    $setting['setting_value'] = (float)$setting['setting_value'];
                    break;
                case 'json':
                    $setting['setting_value'] = json_decode($setting['setting_value'], true);
                    break;
            }
            
            Response::success($setting, 'Setting retrieved successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to retrieve setting: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Create new setting
     */
    public function create() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $errors = $this->validateSettingData($input);
            if (!empty($errors)) {
                Response::validation($errors);
                return;
            }
            
            // Check if setting key already exists
            $checkSql = "SELECT setting_key FROM school_settings WHERE setting_key = ?";
            $checkStmt = $this->db->prepare($checkSql);
            $checkStmt->execute([$input['setting_key']]);
            if ($checkStmt->fetch(PDO::FETCH_ASSOC)) {
                Response::error('Setting key already exists', 400);
                return;
            }
            
            // Convert value to string for storage
            $value = $this->convertValueToString($input['setting_value'], $input['setting_type']);
            
            // Create setting
            $sql = "INSERT INTO school_settings (setting_key, setting_value, setting_type, category, description, is_public, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, NOW())";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $input['setting_key'],
                $value,
                $input['setting_type'],
                $input['category'] ?? 'general',
                $input['description'] ?? '',
                $input['is_public'] ?? false
            ]);
            
            // Log activity
            $this->logActivity($user['id'], 'CREATE_SETTING', 'school_settings', null, [
                'setting_key' => $input['setting_key'],
                'setting_value' => $value
            ]);
            
            Response::success([
                'setting_key' => $input['setting_key'],
                'setting_value' => $input['setting_value']
            ], 'Setting created successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to create setting: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Delete setting
     */
    public function delete() {
        try {
            $user = JWTHandler::getCurrentUser();
            $this->checkPermission(['admin'], $user);
            
            $settingKey = $_GET['key'] ?? null;
            
            if (!$settingKey) {
                Response::error('Setting key is required', 400);
                return;
            }
            
            // Get setting before deletion for logging
            $getSql = "SELECT * FROM school_settings WHERE setting_key = ?";
            $getStmt = $this->db->prepare($getSql);
            $getStmt->execute([$settingKey]);
            $setting = $getStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$setting) {
                Response::error('Setting not found', 404);
                return;
            }
            
            // Delete setting
            $deleteSql = "DELETE FROM school_settings WHERE setting_key = ?";
            $deleteStmt = $this->db->prepare($deleteSql);
            $deleteStmt->execute([$settingKey]);
            
            // Log activity
            $this->logActivity($user['id'], 'DELETE_SETTING', 'school_settings', null, [
                'setting_key' => $settingKey,
                'old_value' => $setting['setting_value']
            ]);
            
            Response::success(null, 'Setting deleted successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to delete setting: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Validate setting value
     */
    private function validateSettingValue($setting, $value) {
        switch ($setting['setting_type']) {
            case 'boolean':
                if (!is_bool($value) && !in_array($value, ['true', 'false', 1, 0, '1', '0'])) {
                    return "Boolean setting must be true or false";
                }
                break;
            case 'integer':
                if (!is_numeric($value) || (int)$value != $value) {
                    return "Integer setting must be a whole number";
                }
                break;
            case 'float':
                if (!is_numeric($value)) {
                    return "Float setting must be a number";
                }
                break;
            case 'email':
                if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    return "Email setting must be a valid email address";
                }
                break;
            case 'url':
                if (!filter_var($value, FILTER_VALIDATE_URL)) {
                    return "URL setting must be a valid URL";
                }
                break;
            case 'json':
                if (is_string($value)) {
                    json_decode($value);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        return "JSON setting must be valid JSON";
                    }
                } elseif (!is_array($value) && !is_object($value)) {
                    return "JSON setting must be a valid JSON object or array";
                }
                break;
        }
        
        return null;
    }
    
    /**
     * Convert value to string for storage
     */
    private function convertValueToString($value, $type) {
        switch ($type) {
            case 'boolean':
                return $value ? 'true' : 'false';
            case 'integer':
                return (string)(int)$value;
            case 'float':
                return (string)(float)$value;
            case 'json':
                return is_string($value) ? $value : json_encode($value);
            default:
                return (string)$value;
        }
    }
    
    /**
     * Validate setting data
     */
    private function validateSettingData($input) {
        $errors = [];
        
        if (!isset($input['setting_key'])) {
            $errors['setting_key'] = 'Setting key is required';
        }
        
        if (isset($input['setting_key']) && !preg_match('/^[a-zA-Z0-9_]+$/', $input['setting_key'])) {
            $errors['setting_key'] = 'Setting key must contain only letters, numbers, and underscores';
        }
        
        if (!isset($input['setting_value'])) {
            $errors['setting_value'] = 'Setting value is required';
        }
        
        if (!isset($input['setting_type'])) {
            $errors['setting_type'] = 'Setting type is required';
        }
        
        $validTypes = ['string', 'boolean', 'integer', 'float', 'email', 'url', 'json'];
        if (isset($input['setting_type']) && !in_array($input['setting_type'], $validTypes)) {
            $errors['setting_type'] = 'Invalid setting type';
        }
        
        return $errors;
    }
    
    /**
     * Log activity
     */
    private function logActivity($userId, $action, $tableName = null, $recordId = null, $details = null) {
        try {
            $sql = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address, user_agent) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $userId,
                $action,
                $tableName,
                $recordId,
                $details ? json_encode($details) : null,
                $_SERVER['REMOTE_ADDR'] ?? '',
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);
            
            return true;
            
        } catch (Exception $e) {
            error_log('Failed to log activity: ' . $e->getMessage());
            return false;
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
