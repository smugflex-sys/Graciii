<?php

class RefreshToken {
    private $db;
    private $table = 'refresh_tokens';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($userId, $token, $deviceInfo = null, $ipAddress = null) {
        $sql = "INSERT INTO {$this->table} (user_id, token, jti, device_info, ip_address, expires_at) 
                VALUES (:user_id, :token, :jti, :device_info, :ip_address, :expires_at)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'user_id' => $userId,
            'token' => $token,
            'jti' => $this->extractJti($token),
            'device_info' => $deviceInfo ? json_encode($deviceInfo) : null,
            'ip_address' => $ipAddress,
            'expires_at' => date('Y-m-d H:i:s', time() + Config::get('jwt.refresh_token_expires'))
        ]);
    }

    public function findByToken($token) {
        $sql = "SELECT * FROM {$this->table} WHERE token = :token AND is_revoked = FALSE";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['token' => $token]);
        return $stmt->fetch();
    }

    public function findByJti($jti, $userId = null) {
        $sql = "SELECT * FROM {$this->table} WHERE jti = :jti AND is_revoked = FALSE";
        $params = ['jti' => $jti];
        
        if ($userId) {
            $sql .= " AND user_id = :user_id";
            $params['user_id'] = $userId;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }

    public function getUserTokens($userId) {
        $sql = "SELECT * FROM {$this->table} 
                WHERE user_id = :user_id AND is_revoked = FALSE AND expires_at > NOW() 
                ORDER BY created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll();
    }

    public function revoke($token, $revokedBy = null) {
        $sql = "UPDATE {$this->table} SET is_revoked = TRUE, revoked_at = NOW(), revoked_by = :revoked_by 
                WHERE token = :token";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'token' => $token,
            'revoked_by' => $revokedBy
        ]);
    }

    public function revokeByJti($jti, $revokedBy = null) {
        $sql = "UPDATE {$this->table} SET is_revoked = TRUE, revoked_at = NOW(), revoked_by = :revoked_by 
                WHERE jti = :jti";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'jti' => $jti,
            'revoked_by' => $revokedBy
        ]);
    }

    public function revokeAllUserTokens($userId, $revokedBy = null) {
        $sql = "UPDATE {$this->table} SET is_revoked = TRUE, revoked_at = NOW(), revoked_by = :revoked_by 
                WHERE user_id = :user_id AND is_revoked = FALSE";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'user_id' => $userId,
            'revoked_by' => $revokedBy
        ]);
    }

    public function cleanupExpired() {
        $sql = "DELETE FROM {$this->table} WHERE expires_at < NOW() OR (is_revoked = TRUE AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY))";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute();
    }

    public function getActiveSessionsCount($userId) {
        $sql = "SELECT COUNT(*) as count FROM {$this->table} 
                WHERE user_id = :user_id AND is_revoked = FALSE AND expires_at > NOW()";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['user_id' => $userId]);
        $result = $stmt->fetch();
        return (int)$result['count'];
    }

    private function extractJti($token) {
        try {
            $payload = JWTHandler::verifyToken($token);
            return $payload['jti'] ?? null;
        } catch (Exception $e) {
            return null;
        }
    }

    public function getTokenStats($userId) {
        $sql = "SELECT 
                    COUNT(*) as total_tokens,
                    SUM(CASE WHEN is_revoked = FALSE AND expires_at > NOW() THEN 1 ELSE 0 END) as active_tokens,
                    SUM(CASE WHEN is_revoked = TRUE THEN 1 ELSE 0 END) as revoked_tokens,
                    SUM(CASE WHEN expires_at <= NOW() THEN 1 ELSE 0 END) as expired_tokens
                FROM {$this->table} 
                WHERE user_id = :user_id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetch();
    }
}
