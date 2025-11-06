// Address normalization service using OpenAI (optional feature)
import { AddressNormalizationError, ErrorHandler } from './errors';
import smartImportConfig, { featureFlags } from './config';

interface NormalizedAddress {
  address: string;
  city: string;
  postcode: string;
  country: string;
  confidence: 'high' | 'medium' | 'low';
  changes: string[];
}

interface AddressNormalizationResult {
  success: boolean;
  normalized?: NormalizedAddress;
  error?: string;
  fallbackUsed: boolean;
}

export class AddressNormalizer {
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly enabled: boolean;

  constructor() {
    this.apiKey = smartImportConfig.addressNormalization.apiKey || '';
    this.timeout = smartImportConfig.addressNormalization.timeout;
    this.enabled = featureFlags.isAddressNormalizationEnabled();
  }

  /**
   * Normalize an address using OpenAI
   */
  async normalizeAddress(
    address: string,
    city: string,
    postcode: string,
    country: string
  ): Promise<AddressNormalizationResult> {
    // Return original if feature is disabled
    if (!this.enabled) {
      return {
        success: true,
        normalized: {
          address,
          city,
          postcode,
          country,
          confidence: 'high',
          changes: []
        },
        fallbackUsed: false
      };
    }

    // Return original if no API key
    if (!this.apiKey) {
      return {
        success: true,
        normalized: {
          address,
          city,
          postcode,
          country,
          confidence: 'high',
          changes: []
        },
        fallbackUsed: true
      };
    }

    try {
      const result = await this.callOpenAI(address, city, postcode, country);
      return {
        success: true,
        normalized: result,
        fallbackUsed: false
      };
    } catch (error) {
      ErrorHandler.logError(error, { 
        context: 'AddressNormalizer.normalizeAddress',
        address: `${address}, ${city}, ${postcode}, ${country}`
      });

      // Always fall back to original address on error
      if (smartImportConfig.addressNormalization.fallbackOnError) {
        return {
          success: true,
          normalized: {
            address,
            city,
            postcode,
            country,
            confidence: 'low',
            changes: []
          },
          error: error instanceof Error ? error.message : 'Normalization failed',
          fallbackUsed: true
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Normalization failed',
        fallbackUsed: false
      };
    }
  }

  /**
   * Batch normalize multiple addresses
   */
  async batchNormalizeAddresses(
    addresses: Array<{
      id: string;
      address: string;
      city: string;
      postcode: string;
      country: string;
    }>
  ): Promise<Array<{
    id: string;
    result: AddressNormalizationResult;
  }>> {
    const results = [];

    for (const addr of addresses) {
      try {
        const result = await this.normalizeAddress(
          addr.address,
          addr.city,
          addr.postcode,
          addr.country
        );
        results.push({ id: addr.id, result });
      } catch (error) {
        ErrorHandler.logError(error, { 
          context: 'AddressNormalizer.batchNormalizeAddresses',
          addressId: addr.id
        });

        results.push({
          id: addr.id,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Normalization failed',
            fallbackUsed: false
          }
        });
      }

      // Small delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Call OpenAI API for address normalization
   */
  private async callOpenAI(
    address: string,
    city: string,
    postcode: string,
    country: string
  ): Promise<NormalizedAddress> {
    const prompt = this.buildNormalizationPrompt(address, city, postcode, country);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an address normalization assistant. Standardize addresses for geocoding accuracy. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200
          // GPT-5 models use current API parameters until new parameters are released
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new AddressNormalizationError(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      
      if (!data.output || !data.output.content) {
        throw new AddressNormalizationError('Invalid response from OpenAI API');
      }

      const content = data.output.content.trim();
      
      try {
        const parsed = JSON.parse(content);
        return this.validateNormalizedAddress(parsed, address, city, postcode, country);
      } catch (parseError) {
        throw new AddressNormalizationError('Failed to parse OpenAI response as JSON');
      }

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AddressNormalizationError('Address normalization timeout');
      }
      
      throw error;
    }
  }

  /**
   * Build normalization prompt for OpenAI
   */
  private buildNormalizationPrompt(
    address: string,
    city: string,
    postcode: string,
    country: string
  ): string {
    return `Normalize this address for geocoding accuracy:

Address: ${address}
City: ${city}
Postcode: ${postcode}
Country: ${country}

Please standardize:
1. Street abbreviations (St -> Street, Ave -> Avenue, etc.)
2. Proper capitalization
3. Remove extra spaces and special characters
4. Fix common typos
5. Ensure postcode format matches country standards

Return ONLY a JSON object with this exact structure:
{
  "address": "normalized street address",
  "city": "normalized city name",
  "postcode": "normalized postcode",
  "country": "normalized country name",
  "confidence": "high|medium|low",
  "changes": ["list of changes made"]
}`;
  }

  /**
   * Validate and sanitize normalized address response
   */
  private validateNormalizedAddress(
    parsed: any,
    originalAddress: string,
    originalCity: string,
    originalPostcode: string,
    originalCountry: string
  ): NormalizedAddress {
    // Ensure all required fields exist
    const normalized: NormalizedAddress = {
      address: this.sanitizeString(parsed.address) || originalAddress,
      city: this.sanitizeString(parsed.city) || originalCity,
      postcode: this.sanitizeString(parsed.postcode) || originalPostcode,
      country: this.sanitizeString(parsed.country) || originalCountry,
      confidence: this.validateConfidence(parsed.confidence),
      changes: Array.isArray(parsed.changes) ? parsed.changes.filter(c => typeof c === 'string') : []
    };

    // Validate that we haven't lost essential information
    if (!normalized.address || !normalized.city || !normalized.country) {
      throw new AddressNormalizationError('Normalized address is missing essential components');
    }

    return normalized;
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(input: any): string {
    if (typeof input !== 'string') return '';
    return input.trim().substring(0, 200); // Limit length for safety
  }

  /**
   * Validate confidence level
   */
  private validateConfidence(confidence: any): 'high' | 'medium' | 'low' {
    if (['high', 'medium', 'low'].includes(confidence)) {
      return confidence;
    }
    return 'medium'; // Default fallback
  }

  /**
   * Check if normalization is enabled and configured
   */
  isEnabled(): boolean {
    return this.enabled && !!this.apiKey;
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    enabled: boolean;
    configured: boolean;
    hasApiKey: boolean;
    timeout: number;
  } {
    return {
      enabled: this.enabled,
      configured: this.isEnabled(),
      hasApiKey: !!this.apiKey,
      timeout: this.timeout
    };
  }

  /**
   * Test the normalization service
   */
  async testNormalization(): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
  }> {
    if (!this.isEnabled()) {
      return {
        success: false,
        message: 'Address normalization is not enabled or configured'
      };
    }

    const startTime = Date.now();

    try {
      const result = await this.normalizeAddress(
        '123 main st',
        'new york',
        '10001',
        'usa'
      );

      const responseTime = Date.now() - startTime;

      if (result.success && result.normalized) {
        return {
          success: true,
          message: 'Address normalization test successful',
          responseTime
        };
      } else {
        return {
          success: false,
          message: `Test failed: ${result.error}`,
          responseTime
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime
      };
    }
  }
}

// Export default instance
export const addressNormalizer = new AddressNormalizer();