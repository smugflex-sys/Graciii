<?php
// Load environment variables
require_once __DIR__ . '/vendor/autoload.php';

// Load environment variables from .env file
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Test database connection
function testDatabaseConnection() {
    try {
        $db = Database::getInstance();
        $conn = $db->getConnection();
        
        // Test connection
        $stmt = $conn->query("SELECT 1 AS test");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result && $result['test'] == 1) {
            echo "✅ Database connection successful!\n";
            return true;
        } else {
            echo "❌ Database connection test failed\n";
            return false;
        }
    } catch (Exception $e) {
        echo "❌ Database connection failed: " . $e->getMessage() . "\n";
        return false;
    }
}

// Check if tables exist
function checkTablesExist($conn) {
    $requiredTables = [
        'users', 'students', 'classes', 'subjects', 
        'scores', 'fees', 'payments', 'sessions', 'terms'
    ];
    
    $missingTables = [];
    
    foreach ($requiredTables as $table) {
        try {
            $stmt = $conn->query("SHOW TABLES LIKE '$table'");
            if ($stmt->rowCount() === 0) {
                $missingTables[] = $table;
            }
        } catch (Exception $e) {
            echo "❌ Error checking table $table: " . $e->getMessage() . "\n";
            return false;
        }
    }
    
    if (empty($missingTables)) {
        echo "✅ All required tables exist\n";
        return true;
    } else {
        echo "❌ Missing tables: " . implode(', ', $missingTables) . "\n";
        return false;
    }
}

// Check for admin user
function checkAdminUser($conn) {
    try {
        $stmt = $conn->query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result && $result['count'] > 0) {
            echo "✅ Admin user exists\n";
            return true;
        } else {
            echo "⚠️  No admin user found. You'll need to create one.\n";
            return false;
        }
    } catch (Exception $e) {
        echo "❌ Error checking admin user: " . $e->getMessage() . "\n";
        return false;
    }
}

// Main test function
function runDatabaseTests() {
    echo "=== Starting Database Tests ===\n\n";
    
    // Test database connection
    if (!testDatabaseConnection()) {
        echo "\n❌ Database tests failed at connection test\n";
        return false;
    }
    
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    // Check tables
    if (!checkTablesExist($conn)) {
        echo "\n❌ Database tests failed at tables check\n";
        return false;
    }
    
    // Check admin user
    checkAdminUser($conn);
    
    // Test data insertion
    try {
        // Test insert
        $testData = [
            'name' => 'test_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $stmt = $conn->prepare("INSERT INTO test_table (name, email, created_at) VALUES (:name, :email, :created_at)");
        $result = $stmt->execute($testData);
        
        if ($result) {
            echo "✅ Test data inserted successfully\n";
            $testId = $conn->lastInsertId();
            
            // Clean up
            $conn->exec("DELETE FROM test_table WHERE id = $testId");
        } else {
            echo "⚠️  Test data insertion failed (this might be expected if test_table doesn't exist)\n";
        }
    } catch (Exception $e) {
        echo "⚠️  Test data insertion failed: " . $e->getMessage() . " (this might be expected)\n";
    }
    
    echo "\n=== Database Tests Completed ===\n";
    return true;
}

// Include database class
require_once __DIR__ . '/config/database.php';

// Run tests
runDatabaseTests();
?>
