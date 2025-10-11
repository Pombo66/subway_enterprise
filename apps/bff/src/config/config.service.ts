import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  private readonly config = {
    port: this.getNumber('PORT', 3001),
    nodeEnv: this.getString('NODE_ENV', 'development'),
    database: {
      url: this.getString('DATABASE_URL'),
    },
    cors: {
      enabled: this.getBoolean('CORS_ENABLED', true),
      origin: this.getString('CORS_ORIGIN', '*'),
    },
    logging: {
      level: this.getString('LOG_LEVEL', 'info'),
    },
  };

  private getString(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value || defaultValue!;
  }

  private getNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (!value) {
      if (defaultValue === undefined) {
        throw new Error(`Required environment variable ${key} is not set`);
      }
      return defaultValue;
    }
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
    }
    return parsed;
  }

  private getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = process.env[key];
    if (!value) {
      if (defaultValue === undefined) {
        throw new Error(`Required environment variable ${key} is not set`);
      }
      return defaultValue;
    }
    
    const normalized = value.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
    
    throw new Error(`Environment variable ${key} must be a boolean, got: ${value}`);
  }

  get port(): number {
    return this.config.port;
  }

  get nodeEnv(): string {
    return this.config.nodeEnv;
  }

  get isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  get databaseUrl(): string {
    return this.config.database.url;
  }

  get corsEnabled(): boolean {
    return this.config.cors.enabled;
  }

  get corsOrigin(): string {
    return this.config.cors.origin;
  }

  get logLevel(): string {
    return this.config.logging.level;
  }
}