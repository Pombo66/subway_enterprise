/**
 * Enhanced configuration management with environment-specific settings
 */

export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  ui: {
    drawer: {
      animationDuration: number;
      width: string;
      zIndexBackdrop: string;
      zIndexDrawer: string;
    };
    form: {
      autoFocusDelay: number;
      validationDebounce: number;
      refocusDelay: number;
    };
    toast: {
      defaultDuration: number;
      successDuration: number;
      errorDuration: number;
      maxToasts: number;
    };
    validation: {
      nameMinLength: number;
      nameMaxLength: number;
      priceMaxValue: number;
      descriptionMaxLength: number;
    };
  };
  performance: {
    cacheDefaultTTL: number;
    cacheMaxEntries: number;
    metricsMaxEntries: number;
    debounceDelay: number;
  };
  features: {
    enableTelemetry: boolean;
    enablePerformanceMonitoring: boolean;
    enableCaching: boolean;
    enableDebugMode: boolean;
  };
}

const baseConfig: AppConfig = {
  api: {
    baseUrl: '/api',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  ui: {
    drawer: {
      animationDuration: 300,
      width: 'w-96',
      zIndexBackdrop: 'z-40',
      zIndexDrawer: 'z-50',
    },
    form: {
      autoFocusDelay: 300,
      validationDebounce: 300,
      refocusDelay: 100,
    },
    toast: {
      defaultDuration: 5000,
      successDuration: 3000,
      errorDuration: 7000,
      maxToasts: 5,
    },
    validation: {
      nameMinLength: 2,
      nameMaxLength: 100,
      priceMaxValue: 999.99,
      descriptionMaxLength: 500,
    },
  },
  performance: {
    cacheDefaultTTL: 5 * 60 * 1000, // 5 minutes
    cacheMaxEntries: 1000,
    metricsMaxEntries: 1000,
    debounceDelay: 300,
  },
  features: {
    enableTelemetry: true,
    enablePerformanceMonitoring: true,
    enableCaching: true,
    enableDebugMode: false,
  },
};

// Environment-specific overrides
const environmentConfigs: Record<string, Partial<AppConfig>> = {
  development: {
    features: {
      enableTelemetry: true,
      enablePerformanceMonitoring: true,
      enableCaching: true,
      enableDebugMode: true,
    },
    performance: {
      cacheDefaultTTL: 1 * 60 * 1000, // 1 minute in dev
      cacheMaxEntries: 1000,
      metricsMaxEntries: 1000,
      debounceDelay: 300,
    },
  },
  test: {
    features: {
      enableTelemetry: false,
      enablePerformanceMonitoring: false,
      enableCaching: false,
      enableDebugMode: false,
    },
    ui: {
      drawer: {
        animationDuration: 300,
        width: 'w-96',
        zIndexBackdrop: 'z-40',
        zIndexDrawer: 'z-50',
      },
      form: {
        autoFocusDelay: 300,
        validationDebounce: 300,
        refocusDelay: 100,
      },
      toast: {
        defaultDuration: 100, // Faster for tests
        successDuration: 100,
        errorDuration: 100,
        maxToasts: 5,
      },
      validation: {
        nameMinLength: 2,
        nameMaxLength: 100,
        priceMaxValue: 999.99,
        descriptionMaxLength: 500,
      },
    },
  },
  production: {
    features: {
      enableTelemetry: true,
      enablePerformanceMonitoring: true,
      enableCaching: true,
      enableDebugMode: false,
    },
    performance: {
      cacheDefaultTTL: 10 * 60 * 1000, // 10 minutes in prod
      cacheMaxEntries: 5000,
      metricsMaxEntries: 1000,
      debounceDelay: 300,
    },
  },
};

// Deep merge utility
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key], source[key] as any);
    } else if (source[key] !== undefined) {
      result[key] = source[key] as any;
    }
  }
  
  return result;
}

// Get current environment
function getCurrentEnvironment(): string {
  if (typeof window !== 'undefined') {
    return process.env.NODE_ENV || 'development';
  }
  return process.env.NODE_ENV || 'development';
}

// Create final configuration
function createConfig(): AppConfig {
  const environment = getCurrentEnvironment();
  const envConfig = environmentConfigs[environment] || {};
  
  return deepMerge(baseConfig, envConfig);
}

export const APP_CONFIG = createConfig();

// Typed constants for better IDE support
export const API_CONFIG = APP_CONFIG.api;
export const UI_CONFIG = APP_CONFIG.ui;
export const PERFORMANCE_CONFIG = APP_CONFIG.performance;
export const FEATURE_FLAGS = APP_CONFIG.features;

// Legacy constants for backward compatibility
export const UI_CONSTANTS = {
  DRAWER: APP_CONFIG.ui.drawer,
  FORM: APP_CONFIG.ui.form,
  TOAST: APP_CONFIG.ui.toast,
  VALIDATION: APP_CONFIG.ui.validation,
} as const;

export const FORM_MESSAGES = {
  VALIDATION: {
    NAME_REQUIRED: 'Item name is required',
    NAME_MIN_LENGTH: `Item name must be at least ${UI_CONFIG.validation.nameMinLength} characters`,
    NAME_MAX_LENGTH: `Item name cannot exceed ${UI_CONFIG.validation.nameMaxLength} characters`,
    PRICE_REQUIRED: 'Price is required',
    PRICE_DECIMAL: 'Price must be a valid decimal (e.g., 12.99)',
    PRICE_POSITIVE: 'Price must be greater than 0',
    PRICE_MAX_VALUE: `Price cannot exceed ${UI_CONFIG.validation.priceMaxValue}`,
    STORE_REQUIRED: 'Store selection is required',
    DESCRIPTION_MAX_LENGTH: `Description cannot exceed ${UI_CONFIG.validation.descriptionMaxLength} characters`,
  },
  SUCCESS: {
    ITEM_CREATED: 'Menu item created successfully!',
    ITEM_UPDATED: 'Menu item updated successfully!',
    ITEM_DELETED: 'Menu item deleted successfully!',
  },
  ERROR: {
    CREATION_FAILED: 'Failed to create menu item. Please try again.',
    UPDATE_FAILED: 'Failed to update menu item. Please try again.',
    DELETE_FAILED: 'Failed to delete menu item. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    VALIDATION_FAILED: 'Please fix the validation errors and try again.',
  },
} as const;

// Configuration utilities
export class ConfigManager {
  static get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return APP_CONFIG[key];
  }

  static getFeatureFlag(flag: keyof AppConfig['features']): boolean {
    return APP_CONFIG.features[flag];
  }

  static isProduction(): boolean {
    return getCurrentEnvironment() === 'production';
  }

  static isDevelopment(): boolean {
    return getCurrentEnvironment() === 'development';
  }

  static isTest(): boolean {
    return getCurrentEnvironment() === 'test';
  }

  static getApiUrl(endpoint: string): string {
    return `${APP_CONFIG.api.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  static exportConfig(): string {
    return JSON.stringify(APP_CONFIG, null, 2);
  }
}