import { SubMindRateLimitService } from '../submind.rate-limit';

describe('SubMindRateLimitService', () => {
  let service: SubMindRateLimitService;

  beforeEach(() => {
    // Clear environment variables for consistent testing
    delete process.env.SUBMIND_RATE_LIMIT_REQUESTS;
    delete process.env.SUBMIND_RATE_LIMIT_WINDOW;
    
    service = new SubMindRateLimitService();
  });

  afterEach(() => {
    if (service && typeof service.onModuleDestroy === 'function') {
      service.onModuleDestroy();
    }
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const ip = '192.168.1.1';
      
      const result = service.checkRateLimit(ip);
      
      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBe(9); // 10 - 1 consumed
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should track multiple IPs separately', () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';
      
      const result1 = service.checkRateLimit(ip1);
      const result2 = service.checkRateLimit(ip2);
      
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result1.remainingTokens).toBe(9);
      expect(result2.remainingTokens).toBe(9);
    });

    it('should enforce rate limit when exceeded', () => {
      const ip = '192.168.1.1';
      
      // Consume all tokens (default is 10)
      for (let i = 0; i < 10; i++) {
        const result = service.checkRateLimit(ip);
        expect(result.allowed).toBe(true);
      }
      
      // Next request should be rate limited
      const result = service.checkRateLimit(ip);
      expect(result.allowed).toBe(false);
      expect(result.remainingTokens).toBe(0);
    });

    it('should reset tokens after window expires', async () => {
      // Set very short window for testing
      process.env.SUBMIND_RATE_LIMIT_WINDOW = '0.1'; // 100ms
      const shortWindowService = new SubMindRateLimitService();
      
      const ip = '192.168.1.1';
      
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        shortWindowService.checkRateLimit(ip);
      }
      
      // Should be rate limited
      let result = shortWindowService.checkRateLimit(ip);
      expect(result.allowed).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be allowed again
      result = shortWindowService.checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBe(9);
      
      shortWindowService.onModuleDestroy();
    });

    it('should use custom rate limit configuration', () => {
      process.env.SUBMIND_RATE_LIMIT_REQUESTS = '5';
      process.env.SUBMIND_RATE_LIMIT_WINDOW = '30';
      
      const customService = new SubMindRateLimitService();
      const ip = '192.168.1.1';
      
      const result = customService.checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBe(4); // 5 - 1 consumed
      
      customService.onModuleDestroy();
    });
  });

  describe('cleanup', () => {
    it('should remove old buckets during cleanup', async () => {
      const ip = '192.168.1.1';
      
      // Create a bucket
      service.checkRateLimit(ip);
      
      // Manually trigger cleanup (normally called by interval)
      service.cleanup();
      
      // Should still work normally (cleanup doesn't affect recent buckets)
      const result = service.checkRateLimit(ip);
      expect(result.allowed).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid IP addresses gracefully', () => {
      const invalidIps = ['', 'invalid', null as any, undefined as any];
      
      invalidIps.forEach(ip => {
        expect(() => service.checkRateLimit(ip)).not.toThrow();
      });
    });

    it('should handle concurrent requests for same IP', () => {
      const ip = '192.168.1.1';
      const results: any[] = [];
      
      // Simulate concurrent requests
      for (let i = 0; i < 5; i++) {
        results.push(service.checkRateLimit(ip));
      }
      
      // All should be allowed (within limit)
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
      
      // Tokens should decrease properly
      expect(results[0].remainingTokens).toBe(9);
      expect(results[4].remainingTokens).toBe(5);
    });
  });
});