// Export BFF URL as a constant for guaranteed availability
export const BFF_URL = process.env.NEXT_PUBLIC_BFF_URL || 'https://subwaybff-production.up.railway.app';

console.log('[Config] BFF_URL constant:', BFF_URL);

interface AppConfig {
  bff: {
    baseUrl: string;
  };
  auth: {
    devBypass: boolean;
  };
  features: {
    debugMode: boolean;
    subMind: boolean;
  };
  environment: 'development' | 'production' | 'test';
}

class ConfigService {
  private config: AppConfig;

  constructor() {
    console.log('[ConfigService] Constructor called');
    console.log('[ConfigService] Using BFF_URL:', BFF_URL);
    
    this.config = {
      bff: {
        baseUrl: BFF_URL,
      },
      auth: {
        devBypass: this.getBoolean('NEXT_PUBLIC_DEV_AUTH_BYPASS', false),
      },
      features: {
        debugMode: this.getBoolean('NEXT_PUBLIC_DEBUG_MODE', false),
        subMind: this.getBoolean('NEXT_PUBLIC_FEATURE_SUBMIND', true),
      },
      environment: this.getEnvironment(),
    };
  }

  private getString(key: string, defaultValue: string): string {
    // In browser, process.env values are replaced at build time by Next.js
    // If undefined, use the default value
    const value = process.env[key];
    if (!value || value === 'undefined') {
      console.log(`[Config] Using default for ${key}:`, defaultValue);
      return defaultValue;
    }
    console.log(`[Config] Using env value for ${key}:`, value);
    return value;
  }

  private getBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined || value === null || value === '') return defaultValue;
    
    const normalized = String(value).toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }

  private getEnvironment(): 'development' | 'production' | 'test' {
    const env = process.env.NODE_ENV;
    if (env === 'production' || env === 'test') return env;
    return 'development';
  }

  get bffBaseUrl(): string {
    // Return the constant which is guaranteed to have a value
    return BFF_URL;
  }

  get isDevAuthBypass(): boolean {
    return this.config.auth.devBypass || this.config.environment !== 'production';
  }

  get isDebugMode(): boolean {
    return this.config.features.debugMode;
  }

  get isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  get isProduction(): boolean {
    return this.config.environment === 'production';
  }

  get environment(): string {
    return this.config.environment;
  }

  get isSubMindEnabled(): boolean {
    return this.config.features.subMind;
  }
}

export const config = new ConfigService();
export type { AppConfig };