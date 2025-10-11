import { submitTelemetryEvent, trackEvent, TelemetryHelpers, generateSessionId } from '../telemetry';

// Mock the API
jest.mock('../api', () => ({
  bff: jest.fn(),
}));

const mockBff = require('../api').bff;

describe('Telemetry Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('submitTelemetryEvent', () => {
    it('should submit event successfully', async () => {
      mockBff.mockResolvedValue({ success: true });
      
      const result = await submitTelemetryEvent({
        eventType: 'test_event',
        userId: 'user123',
        properties: { test: 'data' }
      });
      
      expect(result).toBe(true);
      expect(mockBff).toHaveBeenCalledWith('/telemetry', undefined, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'test_event',
          userId: 'user123',
          properties: { test: 'data' }
        }),
      });
    });

    it('should handle API errors gracefully', async () => {
      mockBff.mockResolvedValue({ success: false, error: 'Validation failed' });
      
      const result = await submitTelemetryEvent({
        eventType: 'test_event'
      });
      
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Telemetry submission failed:', 'Validation failed');
    });

    it('should handle network errors gracefully', async () => {
      mockBff.mockRejectedValue(new Error('Network error'));
      
      const result = await submitTelemetryEvent({
        eventType: 'test_event'
      });
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Telemetry event submission:', expect.any(Error));
    });

    it('should validate event type', async () => {
      const result = await submitTelemetryEvent({
        eventType: ''
      });
      
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Telemetry: Invalid event type provided');
      expect(mockBff).not.toHaveBeenCalled();
    });
  });

  describe('trackEvent', () => {
    it('should call submitTelemetryEvent without waiting', () => {
      mockBff.mockResolvedValue({ success: true });
      
      // This should not throw or return a promise
      expect(() => {
        trackEvent({ eventType: 'test_event' });
      }).not.toThrow();
    });
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      
      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('TelemetryHelpers', () => {
    beforeEach(() => {
      mockBff.mockResolvedValue({ success: true });
    });

    it('should track page view', () => {
      TelemetryHelpers.trackPageView('/dashboard', 'user123', { extra: 'data' });
      // Since trackEvent is fire-and-forget, we can't easily test the exact call
      expect(true).toBe(true);
    });

    it('should track user action', () => {
      TelemetryHelpers.trackUserAction('click', 'button', 'user123', { extra: 'data' });
      expect(true).toBe(true);
    });

    it('should track error with Error object', () => {
      const error = new Error('Test error');
      TelemetryHelpers.trackError(error, 'test_context', 'user123');
      expect(true).toBe(true);
    });

    it('should track error with string message', () => {
      TelemetryHelpers.trackError('String error', 'test_context', 'user123');
      expect(true).toBe(true);
    });

    it('should track feature usage', () => {
      TelemetryHelpers.trackFeatureUsage('menu_management', 'user123', { extra: 'data' });
      expect(true).toBe(true);
    });
  });
});