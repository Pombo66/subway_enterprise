import { createHash } from 'crypto';

export class SubMindSecurityUtil {
  /**
   * Hash a prompt for logging purposes (no PII storage)
   */
  static hashPrompt(prompt: string): string {
    return createHash('sha256').update(prompt).digest('hex').substring(0, 16);
  }

  /**
   * Sanitize HTML from user input
   */
  static stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * Remove excessive whitespace and normalize
   */
  static normalizeWhitespace(input: string): string {
    return input.replace(/\s+/g, ' ').trim();
  }

  /**
   * Validate and clamp prompt length
   */
  static validatePromptLength(prompt: string, maxLength: number = 4000): string {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt must be a non-empty string');
    }

    const clamped = prompt.slice(0, maxLength);
    if (!clamped.trim()) {
      throw new Error('Prompt cannot be empty after processing');
    }

    return clamped;
  }

  /**
   * Sanitize context data to prevent injection
   */
  static sanitizeContext(context: any): any {
    if (!context || typeof context !== 'object') {
      return context;
    }

    const sanitized: any = {};

    // Recursively sanitize object properties
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string') {
        // Strip HTML and normalize whitespace for string values
        sanitized[key] = this.normalizeWhitespace(this.stripHtml(value));
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeContext(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        // Keep primitive types as-is
        sanitized[key] = value;
      }
      // Skip functions, undefined, and other types
    }

    return sanitized;
  }

  /**
   * Validate IP address format
   */
  static isValidIp(ip: string): boolean {
    if (!ip || typeof ip !== 'string') {
      return false;
    }

    // Basic IPv4 validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }

    // Basic IPv6 validation (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv6Regex.test(ip);
  }

  /**
   * Extract safe client IP from request headers
   */
  static extractClientIp(headers: Record<string, string | string[] | undefined>): string {
    // Check for forwarded IP first (for load balancers/proxies)
    const forwarded = headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
      const firstIp = forwarded.split(',')[0].trim();
      if (this.isValidIp(firstIp)) {
        return firstIp;
      }
    }

    // Check for real IP header
    const realIp = headers['x-real-ip'];
    if (realIp && typeof realIp === 'string' && this.isValidIp(realIp)) {
      return realIp;
    }

    // Return fallback
    return 'unknown';
  }

  /**
   * Create a safe log entry with hashed sensitive data
   */
  static createSafeLogEntry(prompt: string, context?: any): {
    promptHash: string;
    contextSafe: any;
    timestamp: string;
  } {
    return {
      promptHash: this.hashPrompt(prompt),
      contextSafe: context ? this.sanitizeContext(context) : null,
      timestamp: new Date().toISOString(),
    };
  }
}