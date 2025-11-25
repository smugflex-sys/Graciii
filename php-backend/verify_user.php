<?php
// Simple verification that User.php has no syntax errors
$file = __DIR__ . '/models/User.php';

echo "=== User.php Verification ===\n";
echo "File path: " . $file . "\n";
echo "File exists: " . (file_exists($file) ? 'Yes' : 'No') . "\n";

if (file_exists($file)) {
    $content = file_get_contents($file);
    $lines = explode("\n", $content);
    
    echo "Total lines: " . count($lines) . "\n";
    
    // Check for duplicate methods
    $methods = [];
    $lineNum = 1;
    foreach ($lines as $line) {
        if (preg_match('/public function (\w+)/', $line, $matches)) {
            $method = $matches[1];
            if (isset($methods[$method])) {
                echo "❌ Duplicate method '$method' found at line $lineNum (previously at line " . $methods[$method] . ")\n";
            } else {
                $methods[$method] = $lineNum;
            }
        }
        $lineNum++;
    }
    
    echo "\nMethods found:\n";
    foreach ($methods as $method => $line) {
        echo "  $method at line $line\n";
    }
    
    // Check for PDO calls
    $lineNum = 1;
    foreach ($lines as $line) {
        if (strpos($line, 'PDO::') !== false) {
            echo "❌ PDO call found at line $lineNum: " . trim($line) . "\n";
        }
        $lineNum++;
    }
    
    // Check for Database calls
    $lineNum = 1;
    $dbCalls = 0;
    foreach ($lines as $line) {
        if (strpos($line, '$this->db->') !== false) {
            $dbCalls++;
        }
        $lineNum++;
    }
    echo "\nDatabase class calls: $dbCalls\n";
    
    // Syntax check
    echo "\nSyntax check: ";
    $output = [];
    $returnCode = 0;
    exec('php -l "' . $file . '" 2>&1', $output, $returnCode);
    
    if ($returnCode === 0) {
        echo "✅ No syntax errors\n";
    } else {
        echo "❌ Syntax errors found:\n";
        foreach ($output as $line) {
            echo "  $line\n";
        }
    }
}

echo "\n=== Verification Complete ===\n";
