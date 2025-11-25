<?php

class CacheMiddleware {
    private static $cache = [];
    private static $ttl = 300; // 5 minutes

    public static function generateKey($prefix, $params = []) {
        return $prefix . ':' . md5(serialize($params));
    }

    public static function get($key) {
        if (isset(self::$cache[$key])) {
            $data = self::$cache[$key];
            if (time() - $data['timestamp'] < self::$ttl) {
                return $data['value'];
            }
            unset(self::$cache[$key]);
        }
        return null;
    }

    public static function set($key, $value) {
        self::$cache[$key] = [
            'value' => $value,
            'timestamp' => time()
        ];
    }

    public static function clear($key) {
        unset(self::$cache[$key]);
    }

    public static function flush() {
        self::$cache = [];
    }
}
