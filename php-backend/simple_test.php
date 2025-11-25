<?php
// Simple database test script

// Database configuration
$host = 'localhost';
$dbname = 'leuluzjk_graceland_db';
$username = 'leuluzjk_mdpjhtua';
$password = '159075321@Au';

// Test connection
function testConnection($host, $dbname, $username, $password) {
    try {
        $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        
        $pdo = new PDO($dsn, $username, $password, $options);
        
        // Test query
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo "✅ Successfully connected to database: $dbname\n";
        echo "📊 Found " . count($tables) . " tables in the database.\n\n";
        
        // List all tables
        echo "📋 Database Tables:\n";
        foreach ($tables as $table) {
            echo "- $table\n";
        }
        
        // Check for required tables
        $requiredTables = ['users', 'students', 'classes', 'subjects', 'scores', 'fees', 'payments'];
        $missingTables = array_diff($requiredTables, $tables);
        
        if (empty($missingTables)) {
            echo "\n✅ All required tables exist.\n";
        } else {
            echo "\n❌ Missing required tables: " . implode(', ', $missingTables) . "\n";
        }
        
        return true;
        
    } catch (PDOException $e) {
        echo "❌ Connection failed: " . $e->getMessage() . "\n";
        return false;
    }
}

// Run the test
echo "🔍 Testing database connection...\n\n";
testConnection($host, $dbname, $username, $password);
?>
