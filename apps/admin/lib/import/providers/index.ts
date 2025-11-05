// Geocoding provider management and selection
import { GeocodeResult, GeocodeErrorDetails, GeocodeProvider as GeocodeProviderType } from '../types';
import { GeocodeProvider } from './base';
import { NominatimProvider, nominatimProvider } from './nominatim';
import { GoogleMapsProvider, googleMapsProvider } from './google';
import { ErrorHandler, GeocodeError } from '../errors';
import { rateLimiterManager } from '../rateLimiter';
import smartImportConfig, { getPreferredGeocodeProvider } from '../config';

/**
 * Provider registry and management
 */
export class GeocodeProviderManager {
  private providers: Map<GeocodeProviderType, GeocodeProvider> = new Map();
  private fallbackOrder: GeocodeProviderType[] = ['google', 'nominatim'];

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize available providers
   */
  private initializeProviders(): void {
    // Register Nominatim provider
    if (smartImportConfig.geocoding.providers.nominatim.enabled) {
      this.providers.set('nominatim', nominatimProvider);
      
      // Initialize rate limiter for Nominatim
      rateLimiterManager.getLimiter(
        'nominatim',
        smartImportConfig.geocoding.providers.nominatim.rateLimit,
        Math.max(smartImportConfig.geocoding.providers.nominatim.rateLimit * 2, 5)
      );
    }

    // Register Google Maps provider
    if (smartImportConfig.geocoding.providers.google.enabled && smartImportConfig.geocoding.providers.google.apiKey) {
      this.providers.set('google', googleMapsProvider);
      
      // Initialize rate limiter for Google Maps
      rateLimiterManager.getLimiter(
        'google',
        smartImportConfig.geocoding.providers.google.rateLimit,
        Math.max(smartImportConfig.geocoding.providers.google.rateLimit * 2, 10)
      );
    }
  }

  /**
   * Get a specific provider
   */
  getProvider(providerName: GeocodeProviderType): GeocodeProvider | null {
    return this.providers.get(providerName) || null;
  }

  /**
   * Get the preferred provider based on configuration
   */
  getPreferredProvider(): GeocodeProvider | null {
    const preferredName = getPreferredGeocodeProvider();
    return this.getProvider(preferredName);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): GeocodeProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is available and configured
   */
  isProviderAvailable(providerName: GeocodeProviderType): boolean {
    const provider = this.providers.get(providerName);
    return provider ? provider.isConfigured() : false;
  }

  /**
   * Geocode with automatic provider selection and fallback
   */
  async geocode(
    address: string,
    preferredProvider?: GeocodeProviderType
  ): Promise<GeocodeResult | GeocodeErrorDetails> {
    const providersToTry = this.getProviderFallbackOrder(preferredProvider);
    
    let lastError: GeocodeErrorDetails | null = null;

    for (const providerName of providersToTry) {
      const provider = this.providers.get(providerName);
      if (!provider || !provider.isConfigured()) {
        continue;
      }

      try {
        // Acquire rate limit token
        await rateLimiterManager.acquireToken(providerName);
        
        // Attempt geocoding
        const result = await provider.geocode(address);
        
        // If successful, return result
        if ('lat' in result && 'lng' in result) {
          return result;
        }
        
        // If error is not retryable, try next provider
        if (!result.retryable) {
          lastError = result;
          continue;
        }
        
        // If retryable error, store it but continue to next provider
        lastError = result;
        
      } catch (error: any) {
        ErrorHandler.logError(error, { 
          context: 'GeocodeProviderManager.geocode', 
          provider: providerName,
          address 
        });
        
        lastError = {
          error: `Provider ${providerName} failed: ${error.message}`,
          retryable: ErrorHandler.isRetryable(error),
          provider: providerName
        };
      }
    }

    // If all providers failed, return the last error
    return lastError || {
      error: 'No geocoding providers available',
      retryable: false
    };
  }

  /**
   * Batch geocode with provider selection
   */
  async batchGeocode(
    addresses: string[],
    preferredProvider?: GeocodeProviderType,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<GeocodeResult | GeocodeErrorDetails>> {
    const results: Array<GeocodeResult | GeocodeErrorDetails> = [];
    
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      const result = await this.geocode(address, preferredProvider);
      results.push(result);
      
      // Report progress
      if (onProgress) {
        onProgress(i + 1, addresses.length);
      }
    }
    
    return results;
  }

  /**
   * Get provider fallback order
   */
  private getProviderFallbackOrder(preferredProvider?: GeocodeProviderType): GeocodeProviderType[] {
    if (preferredProvider && this.providers.has(preferredProvider)) {
      // Put preferred provider first, then others
      const others = this.fallbackOrder.filter(p => p !== preferredProvider);
      return [preferredProvider, ...others];
    }
    
    return [...this.fallbackOrder];
  }

  /**
   * Test all providers
   */
  async testAllProviders(): Promise<Record<GeocodeProviderType, {
    available: boolean;
    configured: boolean;
    connectionTest?: { success: boolean; message: string; responseTime?: number };
  }>> {
    const results: Record<string, any> = {};
    
    for (const [providerName, provider] of this.providers) {
      results[providerName] = {
        available: true,
        configured: provider.isConfigured()
      };
      
      if (provider.isConfigured()) {
        try {
          results[providerName].connectionTest = await provider.testConnection();
        } catch (error: any) {
          results[providerName].connectionTest = {
            success: false,
            message: `Test failed: ${error.message}`
          };
        }
      }
    }
    
    return results;
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): Record<GeocodeProviderType, {
    configured: boolean;
    rateLimit: number;
    currentTokens: number;
    timeUntilNextToken: number;
  }> {
    const stats: Record<string, any> = {};
    const rateLimiterStats = rateLimiterManager.getStatus();
    
    for (const [providerName, provider] of this.providers) {
      const rateLimitInfo = rateLimiterStats[providerName] || {
        tokensPerSecond: 0,
        currentTokens: 0,
        timeUntilNextToken: 0
      };
      
      stats[providerName] = {
        configured: provider.isConfigured(),
        rateLimit: provider.getRateLimit(),
        currentTokens: rateLimitInfo.currentTokens,
        timeUntilNextToken: rateLimitInfo.timeUntilNextToken
      };
    }
    
    return stats;
  }

  /**
   * Reset rate limiters for all providers
   */
  resetRateLimiters(): void {
    rateLimiterManager.resetAll();
  }

  /**
   * Get configuration summary
   */
  getConfigurationSummary(): {
    availableProviders: GeocodeProviderType[];
    preferredProvider: GeocodeProviderType;
    fallbackOrder: GeocodeProviderType[];
    rateLimits: Record<GeocodeProviderType, number>;
  } {
    const rateLimits: Record<string, number> = {};
    
    for (const [providerName, provider] of this.providers) {
      rateLimits[providerName] = provider.getRateLimit();
    }
    
    return {
      availableProviders: this.getAvailableProviders(),
      preferredProvider: getPreferredGeocodeProvider(),
      fallbackOrder: this.fallbackOrder,
      rateLimits
    };
  }
}

// Export provider instances
export { nominatimProvider, googleMapsProvider };

// Export provider classes
export { NominatimProvider, GoogleMapsProvider };

// Export default manager instance
export const geocodeProviderManager = new GeocodeProviderManager();

// Convenience functions
export async function geocodeAddress(
  address: string,
  preferredProvider?: GeocodeProviderType
): Promise<GeocodeResult | GeocodeErrorDetails> {
  return geocodeProviderManager.geocode(address, preferredProvider);
}

export async function batchGeocodeAddresses(
  addresses: string[],
  preferredProvider?: GeocodeProviderType,
  onProgress?: (completed: number, total: number) => void
): Promise<Array<GeocodeResult | GeocodeErrorDetails>> {
  return geocodeProviderManager.batchGeocode(addresses, preferredProvider, onProgress);
}