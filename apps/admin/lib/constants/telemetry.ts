/**
 * Telemetry configuration and constants
 */

export const TELEMETRY_CONFIG = {
  // Default session duration in milliseconds
  SESSION_DURATION: 30 * 60 * 1000, // 30 minutes
  
  // Maximum properties size in bytes
  MAX_PROPERTIES_SIZE: 10 * 1024, // 10KB
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Batch configuration
  BATCH_SIZE: 10,
  BATCH_TIMEOUT: 5000, // 5 seconds
} as const;

export const TELEMETRY_ENDPOINTS = {
  EVENTS: '/telemetry',
  FEATURE_FLAGS: '/feature-flags',
  EXPERIMENTS: '/experiments',
} as const;

export const DEBUG_CONFIG = {
  // Debug panel configuration
  PANEL_WIDTH: 'max-w-2xl',
  PANEL_HEIGHT: 'max-h-[90vh]',
  
  // Quick test event templates
  QUICK_TESTS: [
    { key: 'page_view', label: 'Page View', color: 'blue' },
    { key: 'user_action', label: 'User Action', color: 'green' },
    { key: 'error_event', label: 'Error Event', color: 'red' },
  ] as const,
} as const;

// Validation constants
export const VALIDATION_LIMITS = {
  EVENT_TYPE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
  },
  USER_ID: {
    MAX_LENGTH: 100,
  },
  SESSION_ID: {
    MAX_LENGTH: 100,
  },
  PROPERTIES: {
    MAX_SIZE: TELEMETRY_CONFIG.MAX_PROPERTIES_SIZE,
  },
} as const;