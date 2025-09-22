/**
 * Client-Side Security Utilities
 * Edge Runtime compatible security functions
 */

import { config } from './config';

export class SecurityManager {
  /**
   * Simple base64 encoding (for development - use proper encryption in production)
   */
  static async encrypt(text: string): Promise<string> {
    // For client-side/Edge Runtime, use simple base64 encoding
    // In production, you'd want to use Web Crypto API properly
    try {
      if (typeof btoa !== 'undefined') {
        return btoa(text);
      }
      // Fallback for environments without btoa
      return Buffer.from(text, 'utf8').toString('base64');
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  /**
   * Simple base64 decoding (for development - use proper decryption in production)
   */
  static async decrypt(encryptedData: string): Promise<string> {
    try {
      if (typeof atob !== 'undefined') {
        return atob(encryptedData);
      }
      // Fallback for environments without atob
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate secure random token using Web Crypto API
   */
  static generateSecureToken(length: number = 32): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = crypto.getRandomValues(new Uint8Array(length));
      return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback using Math.random (less secure)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Sanitize input data
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .trim()
      .slice(0, 1000); // Limit length
  }

  /**
   * Validate SQL injection patterns
   */
  static validateSQLInput(input: string): boolean {
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|;)/gi,
      /((\%27)|(\')|(\')|(\%2D)|(\-\-))/gi,
    ];

    return !sqlInjectionPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Generate CSP header
   */
  static generateCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.supabase.com https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
  }
}

/**
 * Input validation utilities
 */
export class InputValidator {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Validate project name
   */
  static isValidProjectName(name: string): boolean {
    const nameRegex = /^[a-zA-Z0-9-_]{1,50}$/;
    return nameRegex.test(name);
  }

  /**
   * Validate organization ID
   */
  static isValidOrganizationId(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Validate database table name
   */
  static isValidTableName(name: string): boolean {
    const tableRegex = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;
    return tableRegex.test(name);
  }

  /**
   * Validate SQL WHERE clause (basic validation)
   */
  static isValidWhereClause(clause: string): boolean {
    if (!clause || clause.length > 1000) return false;
    
    // Basic SQL injection prevention
    return SecurityManager.validateSQLInput(clause);
  }

  /**
   * Validate migration configuration
   */
  static validateMigrationConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.clone_type || !['full_clone', 'schema_only', 'data_subset'].includes(config.clone_type)) {
      errors.push('Invalid clone_type');
    }

    if (!config.target_region || typeof config.target_region !== 'string') {
      errors.push('Invalid target_region');
    }

    if (!config.parallel_threads || config.parallel_threads < 1 || config.parallel_threads > 20) {
      errors.push('parallel_threads must be between 1 and 20');
    }

    if (!config.batch_size || config.batch_size < 100 || config.batch_size > 10000) {
      errors.push('batch_size must be between 100 and 10000');
    }

    if (config.data_filters) {
      if (!Array.isArray(config.data_filters)) {
        errors.push('data_filters must be an array');
      } else {
        config.data_filters.forEach((filter: any, index: number) => {
          if (!filter.table || !InputValidator.isValidTableName(filter.table)) {
            errors.push(`Invalid table name in data_filters[${index}]`);
          }
          if (!filter.where_clause || !InputValidator.isValidWhereClause(filter.where_clause)) {
            errors.push(`Invalid where_clause in data_filters[${index}]`);
          }
        });
      }
    }

    if (config.exclude_tables) {
      if (!Array.isArray(config.exclude_tables)) {
        errors.push('exclude_tables must be an array');
      } else {
        config.exclude_tables.forEach((table: any, index: number) => {
          if (!InputValidator.isValidTableName(table)) {
            errors.push(`Invalid table name in exclude_tables[${index}]`);
          }
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private static requests: Map<string, { count: number; resetTime: number }> = new Map();

  /**
   * Check if request is within rate limit
   */
  static checkRateLimit(
    identifier: string, 
    maxRequests: number = 100, 
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    
    let requestData = RateLimiter.requests.get(identifier);
    
    if (!requestData || requestData.resetTime < now) {
      requestData = { count: 0, resetTime: now + windowMs };
      RateLimiter.requests.set(identifier, requestData);
    }

    if (requestData.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: requestData.resetTime,
      };
    }

    requestData.count++;
    
    return {
      allowed: true,
      remaining: maxRequests - requestData.count,
      resetTime: requestData.resetTime,
    };
  }

  /**
   * Clear old entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, data] of RateLimiter.requests.entries()) {
      if (data.resetTime < now) {
        RateLimiter.requests.delete(key);
      }
    }
  }
}

/**
 * Audit logging (simplified for client-side)
 */
export class AuditLogger {
  /**
   * Log security event
   */
  static logSecurityEvent(event: {
    type: 'auth' | 'migration' | 'access' | 'error';
    action: string;
    userId?: string;
    organizationId?: string;
    details: any;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'security',
      ...event,
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('[SECURITY]', logEntry);
    }

    // In production, you would send to a logging service
    // This is a simplified version that just stores locally
  }

  /**
   * Log migration event
   */
  static logMigrationEvent(event: {
    action: 'started' | 'completed' | 'failed' | 'cancelled';
    jobId: string;
    userId: string;
    organizationId: string;
    sourceProject: string;
    targetProject?: string;
    details?: any;
  }): void {
    AuditLogger.logSecurityEvent({
      type: 'migration',
      action: event.action,
      userId: event.userId,
      organizationId: event.organizationId,
      details: {
        jobId: event.jobId,
        sourceProject: event.sourceProject,
        targetProject: event.targetProject,
        ...event.details,
      },
    });
  }
}
