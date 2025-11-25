<?php

class SetupController {
    private $db;
    private $userModel;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
        $this->userModel = new User();
    }

    public function createAdmin() {
        $input = json_decode(file_get_contents('php://input'), true);
        $secret = $input['secret'] ?? '';
        $configured = $_ENV['SETUP_SECRET'] ?? '';
        if (!$configured || $secret !== $configured) {
            Response::forbidden('Invalid setup secret');
            return;
        }
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';
        $name = trim($input['name'] ?? 'Administrator');
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL) || !$password) {
            Response::validation(['email' => 'Valid email required', 'password' => 'Password required']);
            return;
        }
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = :email");
        $stmt->execute(['email' => $email]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            if (!empty($existing['deleted_at'])) {
                $this->db->prepare("UPDATE users SET deleted_at = NULL, status = 'active' WHERE id = :id")
                    ->execute(['id' => $existing['id']]);
            }
            $this->userModel->update($existing['id'], ['password' => $password, 'status' => 'active', 'name' => $name]);
            $user = $this->userModel->findById($existing['id']);
            Response::success($user, 'Admin updated');
            return;
        }
        $userId = $this->userModel->create([
            'role' => 'admin',
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'status' => 'active'
        ]);
        $user = $this->userModel->findById($userId);
        Response::success($user, 'Admin created', 201);
    }
}