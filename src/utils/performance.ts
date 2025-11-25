/**
 * Performance optimization utilities
 */

// Request Animation Frame based throttling
export const rafThrottle = <T extends (...args: any[]) => any>(
  callback: T
): ((...args: Parameters<T>) => void) => {
  let ticking = false;
  
  return (...args: Parameters<T>) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        callback(...args);
        ticking = false;
      });
      ticking = true;
    }
  };
};

// Memoization with size limit
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: { maxSize?: number } = {}
): T {
  const cache = new Map<string, ReturnType<T>>();
  const { maxSize = 100 } = options;

  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    // Remove oldest entries if cache size exceeds maxSize
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (typeof firstKey === 'string') {
        cache.delete(firstKey);
      }
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Debounce function
export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  wait: number
): ((...args: Parameters<F>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<F>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Performance metrics
let metrics: Record<string, number> = {};

export const startMeasure = (name: string): void => {
  if (process.env.NODE_ENV === 'development') {
    performance.mark(`${name}-start`);
  }
};

export const stopMeasure = (name: string): number | null => {
  if (process.env.NODE_ENV === 'development') {
    try {
      performance.mark(`${name}-end`);
      const measure = performance.measure(
        name,
        `${name}-start`,
        `${name}-end`
      );
      
      metrics[name] = measure.duration;
      
      // Log if it's taking too long
      if (measure.duration > 100) {
        console.warn(`[Performance] ${name} took ${measure.duration.toFixed(2)}ms`);
      }
      
      return measure.duration;
    } catch (e) {
      console.warn(`Failed to measure ${name}`, e);
      return null;
    }
  }
  return null;
};

export const getMetrics = (): Record<string, number> => ({ ...metrics });

// Optimize expensive calculations
const calculationCache = new Map<string, any>();

export const memoizedCalculation = <T>(
  key: string,
  calculate: () => T,
  dependencies: any[] = []
): T => {
  const cacheKey = `${key}-${JSON.stringify(dependencies)}`;
  
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey);
  }
  
  const result = calculate();
  calculationCache.set(cacheKey, result);
  return result;
};

// Advanced performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observers: PerformanceObserver[] = [];
  private metrics: Map<string, number[]> = new Map();
  private thresholds: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.setupObservers();
  }

  private setupObservers() {
    // Monitor navigation timing
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('domContentLoaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
            this.recordMetric('pageLoad', navEntry.loadEventEnd - navEntry.loadEventStart);
            this.recordMetric('firstPaint', navEntry.responseEnd - navEntry.requestStart);
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Monitor resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            const resourceName = resourceEntry.name.split('/').pop() || 'unknown';
            this.recordMetric(`resource-${resourceName}`, resourceEntry.duration);
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Monitor long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            this.recordMetric('longTask', entry.duration);
            console.warn(`[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);

    // Check against threshold
    const threshold = this.thresholds.get(name);
    if (threshold && value > threshold) {
      console.warn(`[Performance] ${name} exceeded threshold: ${value.toFixed(2)}ms > ${threshold}ms`);
    }

    // Keep only last 100 measurements
    const measurements = this.metrics.get(name)!;
    if (measurements.length > 100) {
      measurements.shift();
    }
  }

  setThreshold(name: string, threshold: number) {
    this.thresholds.set(name, threshold);
  }

  getMetricStats(name: string) {
    const measurements = this.metrics.get(name) || [];
    if (measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);

    return {
      count: measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  getAllStats() {
    const stats: Record<string, any> = {};
    for (const [name] of this.metrics) {
      stats[name] = this.getMetricStats(name);
    }
    return stats;
  }

  measureFunction<T extends (...args: any[]) => any>(
    name: string,
    fn: T
  ): T {
    return ((...args: Parameters<T>) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      this.recordMetric(name, end - start);
      return result;
    }) as T;
  }

  measureAsyncFunction<T extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: T
  ): T {
    return (async (...args: Parameters<T>) => {
      const start = performance.now();
      const result = await fn(...args);
      const end = performance.now();
      this.recordMetric(name, end - start);
      return result;
    }) as T;
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
    this.thresholds.clear();
  }
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance();

  return {
    recordMetric: monitor.recordMetric.bind(monitor),
    getStats: monitor.getMetricStats.bind(monitor),
    getAllStats: monitor.getAllStats.bind(monitor),
    setThreshold: monitor.setThreshold.bind(monitor),
    measureFunction: monitor.measureFunction.bind(monitor),
    measureAsyncFunction: monitor.measureAsyncFunction.bind(monitor),
  };
}

// Memory usage monitoring
export const getMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
    };
  }
  return null;
};

// FPS monitoring
export class FPSMonitor {
  private fps: number[] = [];
  private lastTime = performance.now();
  private frameId: number | null = null;

  start() {
    const measure = (currentTime: number) => {
      const delta = currentTime - this.lastTime;
      const currentFps = 1000 / delta;
      
      this.fps.push(currentFps);
      if (this.fps.length > 60) {
        this.fps.shift();
      }

      this.lastTime = currentTime;
      this.frameId = requestAnimationFrame(measure);
    };

    this.frameId = requestAnimationFrame(measure);
  }

  stop() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  getAverageFPS() {
    if (this.fps.length === 0) return 0;
    return this.fps.reduce((a, b) => a + b, 0) / this.fps.length;
  }

  getCurrentFPS() {
    return this.fps[this.fps.length - 1] || 0;
  }
}

// Initialize performance monitoring
export const performanceMonitor = PerformanceMonitor.getInstance();

// Set default thresholds
performanceMonitor.setThreshold('domContentLoaded', 1000);
performanceMonitor.setThreshold('pageLoad', 3000);
performanceMonitor.setThreshold('firstPaint', 2000);
performanceMonitor.setThreshold('longTask', 50);
