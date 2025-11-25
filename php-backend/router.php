<?php

// PHP built-in server router
// Serve static files directly, otherwise route all requests to index.php

$file = __DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($file !== __FILE__ && is_file($file)) {
  return false;
}

require __DIR__ . '/index.php';