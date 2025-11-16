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
    this.config = {
      bff: {
        baseUrl: this.getString('NEXT_PUBLIC_BFF_URL', 'https://subwaybff-production.up.railway.app'),
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
    // Fallback to hardcoded production URL if config is undefined
    const url = this.config.bff.baseUrl;
    if (!url || url === 'undefined') {
      console.warn('[Config] BFF URL is undefined, using hardcoded production URL');
      return 'https://subwaybff-production.up.railway.app';
    }
    return url;
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