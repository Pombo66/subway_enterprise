import { PrismaClient } from '@prisma/client';
import { ExpansionLogger } from '../logging/expansion-logger';

export interface ExpansionConfig {
  database: {
    url: string;
    connected: boolean;
  };
  mapbox: {
    enabled: boolean;
    token?: string;
  };
  openai: {
    enabled: boolean;
    apiKey?: string;
  };
  features: {
    mapboxFiltering: boolean;
    aiRationale: boolean;
  };
}

export class ExpansionConfigValidator {
  private static instance: ExpansionConfig | null = null;

  static async validate(): Promise<ExpansionConfig> {
    if (this.instance) {
      return this.instance;
    }

    const config: ExpansionConfig = {
      database: {
        url: process.env.DATABASE_URL || '',
        connected: false
      },
      mapbox: {
        enabled: false,
        token: process.env.MAPBOX_ACCESS_TOKEN
      },
      openai: {
        enabled: false,
        apiKey: process.env.OPENAI_API_KEY
      },
      features: {
        mapboxFiltering: false,
        aiRationale: false
      }
    };

    // Validate database
    if (!config.database.url) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    try {
      const prisma = new PrismaClient();
      await prisma.$connect();
      config.database.connected = true;
      await prisma.$disconnect();
    } catch (error) {
      console.error('Database connection failed:', error);
      config.database.connected = false;
    }

    // Check optional features
    if (config.mapbox.token) {
      config.mapbox.enabled = true;
      config.features.mapboxFiltering = true;
    } else {
      this.logMissingDependency(
        'MAPBOX_ACCESS_TOKEN',
        'Urban suitability filtering will be disabled'
      );
    }

    // Check if OpenAI is explicitly enabled via environment variable
    const openaiExplicitlyEnabled = process.env.EXPANSION_OPENAI_ENABLED === 'true';
    
    if (config.openai.apiKey && config.openai.apiKey !== 'sk-your-openai-api-key-here') {
      // Validate API key format
      if (config.openai.apiKey.startsWith('sk-') && config.openai.apiKey.length > 20) {
        // Enable OpenAI if API key is valid and either explicitly enabled or not explicitly disabled
        config.openai.enabled = openaiExplicitlyEnabled || process.env.EXPANSION_OPENAI_ENABLED !== 'false';
        config.features.aiRationale = config.openai.enabled;
      } else {
        this.logMissingDependency(
          'OPENAI_API_KEY',
          'Invalid API key format - AI-generated rationales will be disabled'
        );
      }
    } else {
      this.logMissingDependency(
        'OPENAI_API_KEY',
        'AI-generated rationales will be disabled'
      );
    }

    this.logServiceInitialization({
      mapboxEnabled: config.mapbox.enabled,
      openaiEnabled: config.openai.enabled,
      databaseConnected: config.database.connected
    });

    this.instance = config;
    return config;
  }

  static getConfig(): ExpansionConfig | null {
    return this.instance;
  }

  static reset() {
    this.instance = null;
  }

  private static logServiceInitialization(config: {
    mapboxEnabled: boolean;
    openaiEnabled: boolean;
    databaseConnected: boolean;
  }) {
    console.log('🔧 Expansion Service Initialization:', {
      timestamp: new Date().toISOString(),
      mapbox: config.mapboxEnabled ? '✅ Enabled' : '⚠️  Disabled',
      openai: config.openaiEnabled ? '✅ Enabled' : '⚠️  Disabled',
      database: config.databaseConnected ? '✅ Connected' : '❌ Disconnected',
      environment: {
        EXPANSION_OPENAI_ENABLED: process.env.EXPANSION_OPENAI_ENABLED,
        OPENAI_API_KEY_SET: !!process.env.OPENAI_API_KEY,
        OPENAI_API_KEY_VALID: process.env.OPENAI_API_KEY?.startsWith('sk-') && process.env.OPENAI_API_KEY.length > 20
      }
    });
  }

  private static logMissingDependency(dependency: string, impact: string) {
    console.warn('⚠️  Missing Dependency:', {
      timestamp: new Date().toISOString(),
      dependency,
      impact,
      action: 'Feature will be disabled'
    });
  }
}
