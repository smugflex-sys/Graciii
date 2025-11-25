/**
 * Security Configuration for Frontend
 * Provides security settings and validation functions
 */

export interface SecurityConfig {
  apiTimeout: number;
  requireHttps: boolean;
  allowedOrigins: string[];
  maxRetries: number;
  tokenRefreshThreshold: number;
  passwordMinLength: number;
  sessionTimeout: number;
  maxLoginAttempts: number;
  rateLimitWindow: number;
  enableCSP: boolean;
  sanitizeInputs: boolean;
}

export const securityConfig: SecurityConfig = {
  apiTimeout: 10000, // 10 seconds
  requireHttps: import.meta.env.PROD || window.location.protocol === 'https:',
  allowedOrigins: [
    import.meta.env.VITE_API_BASE_URL || '/api',
    'https://gracelandacademy.edu.ng',
    'https://www.gracelandacademy.edu.ng'
  ],
  maxRetries: 3,
  tokenRefreshThreshold: 300000, // 5 minutes before expiry
  passwordMinLength: 8,
  sessionTimeout: 1800000, // 30 minutes
  maxLoginAttempts: 5,
  rateLimitWindow: 900000, // 15 minutes
  enableCSP: true,
  sanitizeInputs: true
};

/**
 * Security validation functions
 */
export class SecurityValidator {
  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
  } {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < securityConfig.passwordMinLength) {
      errors.push(`Password must be at least ${securityConfig.passwordMinLength} characters`);
    } else {
      score += 1;
    }

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Common patterns
    if (/^(.)\1+$/.test(password)) {
      errors.push('Password cannot be repeated characters');
    }

    // Common passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'graceland'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors.push('Password cannot contain common words');
    }

    const strength = score <= 2 ? 'weak' : score <= 3 ? 'medium' : 'strong';

    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * Sanitize user input
   */
  static sanitizeInput(input: string): string {
    if (!input) return '';

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Validate phone number format
   */
  static validatePhone(phone: string): boolean {
    // Support Nigerian and international formats
    const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Check if request origin is allowed
   */
  static isAllowedOrigin(origin: string): boolean {
    return securityConfig.allowedOrigins.some(allowed => 
      origin.includes(allowed) || allowed === '*'
    );
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if session should be refreshed
   */
  static shouldRefreshToken(tokenExpiry: number): boolean {
    const now = Date.now();
    const threshold = tokenExpiry - securityConfig.tokenRefreshThreshold;
    return now >= threshold;
  }
}

/**
 * Security headers utility
 */
export class SecurityHeaders {
  /**
   * Apply security headers to fetch requests
   */
  static getSecureHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }

  /**
   * Create secure fetch request
   */
  static async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const secureOptions: RequestInit = {
      ...options,
      headers: {
        ...this.getSecureHeaders(),
        ...options.headers
      },
      credentials: 'same-origin'
    };

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), securityConfig.apiTimeout);
    secureOptions.signal = controller.signal;

    try {
      const response = await fetch(url, secureOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

/**
 * Rate limiting for frontend
 */
export class RateLimiter {
  private static attempts = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if action is allowed
   */
  static isAllowed(key: string, maxAttempts: number = securityConfig.maxLoginAttempts): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + securityConfig.rateLimitWindow });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Get remaining attempts
   */
  static getRemainingAttempts(key: string): number {
    const record = this.attempts.get(key);
    if (!record || Date.now() > record.resetTime) {
      return securityConfig.maxLoginAttempts;
    }
    return Math.max(0, securityConfig.maxLoginAttempts - record.count);
  }

  /**
   * Get reset time
   */
  static getResetTime(key: string): number {
    const record = this.attempts.get(key);
    return record ? record.resetTime : 0;
  }

  /**
   * Clear attempts for key
   */
  static clearAttempts(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Session security manager
 */
export class SessionSecurity {
  private static sessionTimeout: NodeJS.Timeout | null = null;

  /**
   * Initialize session monitoring
   */
  static initialize(): void {
    this.setupActivityListeners();
    this.resetTimeout();
  }

  /**
   * Setup activity listeners
   */
  private static setupActivityListeners(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, () => this.resetTimeout(), true);
    });

    // Handle page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseTimeout();
      } else {
        this.resumeTimeout();
      }
    });
  }

  /**
   * Reset session timeout
   */
  private static resetTimeout(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    this.sessionTimeout = setTimeout(() => {
      this.handleSessionTimeout();
    }, securityConfig.sessionTimeout);
  }

  /**
   * Pause timeout when page is hidden
   */
  private static pauseTimeout(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
  }

  /**
   * Resume timeout when page is visible
   */
  private static resumeTimeout(): void {
    if (!this.sessionTimeout) {
      this.resetTimeout();
    }
  }

  /**
   * Handle session timeout
   */
  private static handleSessionTimeout(): void {
    // Clear session data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Redirect to login
    window.location.href = '/login?reason=session_expired';
  }

  /**
   * Cleanup
   */
  static cleanup(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
  }
}

/**
 * Content Security Policy helper
 */
export class CSPHelper {
  /**
   * Generate CSP meta tag
   */
  static generateCSP(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');

    return directives;
  }

  /**
   * Apply CSP to document
   */
  static applyCSP(): void {
    if (securityConfig.enableCSP) {
      const csp = this.generateCSP();
      let meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('http-equiv', 'Content-Security-Policy');
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', csp);
    }
  }
}

export default {
  securityConfig,
  SecurityValidator,
  SecurityHeaders,
  RateLimiter,
  SessionSecurity,
  CSPHelper
};
