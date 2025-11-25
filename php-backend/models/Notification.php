<?php

class Notification {
    private $db;
    private $table = 'notifications';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create($data) {
        $sql = "INSERT INTO {$this->table} 
                (user_id, target_role, type, title, message, data, created_by) 
                VALUES (:user_id, :target_role, :type, :title, :message, :data, :created_by)";
        
        $stmt = $this->db->prepare($sql);
        $dataJson = isset($data['data']) ? 
            (is_array($data['data']) ? json_encode($data['data']) : $data['data']) 
            : null;
        
        return $stmt->execute([
            'user_id' => $data['user_id'] ?? null,
            'target_role' => $data['target_role'] ?? null,
            'type' => $data['type'],
            'title' => $data['title'],
            'message' => $data['message'],
            'data' => $dataJson,
            'created_by' => $data['created_by'] ?? null
        ]);
    }

    public function findById($id) {
        $sql = "SELECT n.*, u1.name as user_name, u2.name as created_by_name
                FROM {$this->table} n
                LEFT JOIN users u1 ON n.user_id = u1.id
                LEFT JOIN users u2 ON n.created_by = u2.id
                WHERE n.id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        
        if ($result && isset($result['data'])) {
            $result['data'] = json_decode($result['data'], true) ?: null;
        }
        
        return $result;
    }

    public function getAll($options = []) {
        $sql = "SELECT n.*, u1.name as user_name, u2.name as created_by_name
                FROM {$this->table} n
                LEFT JOIN users u1 ON n.user_id = u1.id
                LEFT JOIN users u2 ON n.created_by = u2.id";
        
        $params = [];
        $whereClauses = [];
        
        if (isset($options['user_id'])) {
            $whereClauses[] = "n.user_id = :user_id";
            $params['user_id'] = $options['user_id'];
        }
        
        if (isset($options['target_role'])) {
            $whereClauses[] = "n.target_role = :target_role";
            $params['target_role'] = $options['target_role'];
        }
        
        if (isset($options['type'])) {
            $whereClauses[] = "n.type = :type";
            $params['type'] = $options['type'];
        }
        
        if (isset($options['is_read'])) {
            if ($options['is_read']) {
                $whereClauses[] = "n.read_at IS NOT NULL";
            } else {
                $whereClauses[] = "n.read_at IS NULL";
            }
        }
        
        if (isset($options['created_by'])) {
            $whereClauses[] = "n.created_by = :created_by";
            $params['created_by'] = $options['created_by'];
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $sql .= " ORDER BY n.created_at DESC";
        
        if (isset($options['limit'])) {
            $sql .= " LIMIT :limit";
            $params['limit'] = (int)$options['limit'];
        }
        
        if (isset($options['offset'])) {
            $sql .= " OFFSET :offset";
            $params['offset'] = (int)$options['offset'];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll();
        
        // Decode data for each result
        foreach ($results as &$result) {
            if (isset($result['data'])) {
                $result['data'] = json_decode($result['data'], true) ?: null;
            }
        }
        
        return $results;
    }

    public function getByUser($userId, $options = []) {
        return $this->getAll(array_merge(['user_id' => $userId], $options));
    }

    public function getByRole($targetRole, $options = []) {
        return $this->getAll(array_merge(['target_role' => $targetRole], $options));
    }

    public function getByType($type, $options = []) {
        return $this->getAll(array_merge(['type' => $type], $options));
    }

    public function getUnread($userId = null, $options = []) {
        $params = ['is_read' => false];
        if ($userId) {
            $params['user_id'] = $userId;
        }
        return $this->getAll(array_merge($params, $options));
    }

    public function getRead($userId = null, $options = []) {
        $params = ['is_read' => true];
        if ($userId) {
            $params['user_id'] = $userId;
        }
        return $this->getAll(array_merge($params, $options));
    }

    public function markAsRead($id) {
        $sql = "UPDATE {$this->table} SET read_at = NOW() WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function markAsUnread($id) {
        $sql = "UPDATE {$this->table} SET read_at = NULL WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function markAllAsRead($userId = null, $targetRole = null) {
        $sql = "UPDATE {$this->table} SET read_at = NOW() WHERE read_at IS NULL";
        $params = [];
        
        if ($userId) {
            $sql .= " AND user_id = :user_id";
            $params['user_id'] = $userId;
        }
        
        if ($targetRole) {
            $sql .= " AND target_role = :target_role";
            $params['target_role'] = $targetRole;
        }
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function update($id, $data) {
        $fields = [];
        $params = ['id' => $id];

        $allowedFields = ['user_id', 'target_role', 'type', 'title', 'message', 'data', 'created_by'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                if ($field === 'data') {
                    $fields[] = "$field = :$field";
                    $params[$field] = is_array($data[$field]) ? json_encode($data[$field]) : $data[$field];
                } else {
                    $fields[] = "$field = :$field";
                    $params[$field] = $data[$field];
                }
            }
        }

        if (empty($fields)) {
            return false;
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $sql = "DELETE FROM {$this->table} WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function deleteByUser($userId) {
        $sql = "DELETE FROM {$this->table} WHERE user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['user_id' => $userId]);
    }

    public function deleteByRole($targetRole) {
        $sql = "DELETE FROM {$this->table} WHERE target_role = :target_role";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['target_role' => $targetRole]);
    }

    public function search($query, $limit = 50) {
        $sql = "SELECT n.*, u1.name as user_name, u2.name as created_by_name
                FROM {$this->table} n
                LEFT JOIN users u1 ON n.user_id = u1.id
                LEFT JOIN users u2 ON n.created_by = u2.id
                WHERE (n.title LIKE :query OR n.message LIKE :query OR n.type LIKE :query)
                ORDER BY n.created_at DESC
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'query' => "%$query%",
            'limit' => (int)$limit
        ]);
        
        $results = $stmt->fetchAll();
        
        // Decode data for each result
        foreach ($results as &$result) {
            if (isset($result['data'])) {
                $result['data'] = json_decode($result['data'], true) ?: null;
            }
        }
        
        return $results;
    }

    public function getUnreadCount($userId = null, $targetRole = null) {
        $sql = "SELECT COUNT(*) as count FROM {$this->table} WHERE read_at IS NULL";
        $params = [];
        
        if ($userId) {
            $sql .= " AND user_id = :user_id";
            $params['user_id'] = $userId;
        }
        
        if ($targetRole) {
            $sql .= " AND target_role = :target_role";
            $params['target_role'] = $targetRole;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return (int)$result['count'];
    }

    public function getTotalCount($filters = []) {
        $sql = "SELECT COUNT(*) as count FROM {$this->table}";
        $params = [];
        
        if (isset($filters['user_id'])) {
            $sql .= " WHERE user_id = :user_id";
            $params['user_id'] = $filters['user_id'];
        }
        
        if (isset($filters['target_role'])) {
            $sql .= $filters['user_id'] ? " AND target_role = :target_role" : " WHERE target_role = :target_role";
            $params['target_role'] = $filters['target_role'];
        }
        
        if (isset($filters['type'])) {
            $sql .= (isset($filters['user_id']) || isset($filters['target_role'])) ? 
                    " AND type = :type" : " WHERE type = :type";
            $params['type'] = $filters['type'];
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return (int)$result['count'];
    }

    public function createBulk($notifications) {
        $sql = "INSERT INTO {$this->table} 
                (user_id, target_role, type, title, message, data, created_by) 
                VALUES (:user_id, :target_role, :type, :title, :message, :data, :created_by)";
        
        $stmt = $this->db->prepare($sql);
        $success = true;
        
        foreach ($notifications as $notification) {
            $params = [
                'user_id' => $notification['user_id'] ?? null,
                'target_role' => $notification['target_role'] ?? null,
                'type' => $notification['type'],
                'title' => $notification['title'],
                'message' => $notification['message'],
                'data' => isset($notification['data']) ? 
                    (is_array($notification['data']) ? json_encode($notification['data']) : $notification['data']) 
                    : null,
                'created_by' => $notification['created_by'] ?? null
            ];
            
            if (!$stmt->execute($params)) {
                $success = false;
                break;
            }
        }
        
        return $success;
    }

    public function notifyRole($targetRole, $type, $title, $message, $data = null, $createdBy = null) {
        return $this->create([
            'user_id' => null,
            'target_role' => $targetRole,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'created_by' => $createdBy
        ]);
    }

    public function notifyUser($userId, $type, $title, $message, $data = null, $createdBy = null) {
        return $this->create([
            'user_id' => $userId,
            'target_role' => null,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'created_by' => $createdBy
        ]);
    }
}
