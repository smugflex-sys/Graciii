<?php

class CacheMiddleware {
    private static $cache = [];
    private static $ttl = 300; // 5 minutes
    
    public static function get($key) {
        if (isset(self::$cache[$key]) && (time() - self::$cache[$key]['timestamp']) < self::$ttl) {
            return self::$cache[$key]['data'];
        }
        return null;
    }
    
    public static function set($key, $data) {
        self::$cache[$key] = [
            'data' => $data,
            'timestamp' => time()
        ];
    }
    
    public static function clear($pattern = null) {
        if ($pattern) {
            foreach (self::$cache as $key => $value) {
                if (strpos($key, $pattern) !== false) {
                    unset(self::$cache[$key]);
                }
            }
        } else {
            self::$cache = [];
        }
    }
    
    public static function generateKey($prefix, $params = []) {
        return $prefix . '_' . md5(serialize($params));
    }
}
