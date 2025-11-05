import { StoreUploadSchema, ValidationResult } from '../validation/store-upload';
import { NormalizedStore, DuplicateInfo } from '../types/store-upload';
import { ValidationError, ErrorLogger } from '../errors/upload-errors';
import { z } from 'zod';

export class ValidationService {
  /**
   * Validate store data against schema
   */
  validateStoreData(data: any, mapping: Record<string, string>): ValidationResult {
    try {
      // Map the data using the provided column mapping
      const mappedData = this.applyColumnMapping(data, mapping);
      
      // Log validation attempt for debugging
      console.log('🔍 Validating store data:', {
        originalData: data,
        mappedData: mappedData,
        mapping: mapping
      });
      
      // Validate against schema
      const result = StoreUploadSchema.safeParse(mappedData);
      
      if (result.success) {
        console.log('✅ Validation successful');
        return {
          isValid: true,
          errors: [],
          warnings: this.generateWarnings(mappedData)
        };
      } else {
        console.error('❌ Validation failed:', {
          errors: result.error.errors,
          mappedData: mappedData,
          zodErrors: result.error.format()
        });
        return {
          isValid: false,
          errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
          warnings: []
        };
      }
    } catch (error) {
      console.error('❌ Validation exception:', error, { data, mapping });
      ErrorLogger.logError(error as Error, { data, mapping });
      return {
        isValid: false,
        errors: ['Validation failed due to unexpected error'],
        warnings: []
      };
    }
  }

  /**
   * Normalize store data
   */
  normalizeStoreData(data: any, mapping: Record<string, string>): NormalizedStore {
    const mappedData = this.applyColumnMapping(data, mapping);
    
    // If name is empty but address exists, use address as name
    const name = mappedData.name || mappedData.address || '';
    const address = mappedData.address || '';
    
    // Handle combined "City, State ZIP" field if city is in that format
    let city = mappedData.city || '';
    let postcode = mappedData.postcode;
    
    // If postcode is missing but city contains comma (likely "City, State ZIP" format)
    if (!postcode && city.includes(',')) {
      postcode = this.extractPostcodeFromCityStateZip(city);
      console.log(`📍 Extracted postcode "${postcode}" from combined field "${city}"`);
    }
    
    return {
      name: this.normalizeText(name),
      address: this.normalizeText(address),
      city: this.normalizeCityName(city),
      postcode: postcode ? this.normalizePostcode(postcode) : undefined,
      country: this.normalizeCountryName(mappedData.country || ''),
      latitude: this.normalizeCoordinate(mappedData.latitude),
      longitude: this.normalizeCoordinate(mappedData.longitude),
      externalId: mappedData.externalId ? this.normalizeText(mappedData.externalId) : undefined,
      status: this.normalizeStatus(mappedData.status),
      ownerName: mappedData.ownerName ? this.normalizeText(mappedData.ownerName) : undefined,
      region: this.inferRegionFromCountry(mappedData.country || '')
    };
  }

  /**
   * Detect duplicates in a list of stores
   */
  detectDuplicates(stores: NormalizedStore[]): DuplicateInfo[] {
    const duplicates: DuplicateInfo[] = [];
    const seenStores = new Map<string, number>();
    
    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      
      // Check for external ID duplicates first (highest priority)
      if (store.externalId) {
        const externalIdKey = `ext_${store.externalId.toLowerCase()}`;
        const existingIndex = seenStores.get(externalIdKey);
        
        if (existingIndex !== undefined) {
          duplicates.push({
            rowIndex: i,
            duplicateOf: `Row ${existingIndex + 1}`,
            matchType: 'external_id',
            confidence: 1.0
          });
          continue;
        }
        
        seenStores.set(externalIdKey, i);
      }
      
      // Check for address-based duplicates
      const addressKey = this.generateAddressKey(store);
      const existingIndex = seenStores.get(addressKey);
      
      if (existingIndex !== undefined) {
        const confidence = this.calculateDuplicateConfidence(store, stores[existingIndex]);
        
        if (confidence >= 0.8) {
          duplicates.push({
            rowIndex: i,
            duplicateOf: `Row ${existingIndex + 1}`,
            matchType: 'address_match',
            confidence
          });
          continue;
        }
      }
      
      seenStores.set(addressKey, i);
    }
    
    return duplicates;
  }

  /**
   * Apply column mapping to raw data
   */
  private applyColumnMapping(data: any, mapping: Record<string, string>): any {
    const mappedData: any = {};
    
    for (const [field, column] of Object.entries(mapping)) {
      // Only include field if column is mapped AND exists in data
      // Don't set undefined explicitly - let schema handle missing fields
      if (column && column in data) {
        mappedData[field] = data[column];
      }
    }
    
    return mappedData;
  }

  /**
   * Normalize text fields
   */
  private normalizeText(text: string): string {
    if (!text) return '';
    
    // Convert to string if it's a number (handles numeric store IDs)
    const textStr = typeof text === 'string' ? text : String(text);
    
    return textStr
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s\-.,#&()]/g, '') // Remove special characters except common ones
      .substring(0, 255); // Limit length
  }

  /**
   * Normalize city names (title case)
   */
  private normalizeCityName(city: string): string {
    if (!city || typeof city !== 'string') return '';
    
    // Handle "City, State ZIP" format - extract just the city
    // Example: "Berlin, BLN 10707" -> "Berlin"
    const cityPart = city.split(',')[0].trim();
    
    return cityPart
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .substring(0, 100);
  }

  /**
   * Extract postcode from combined "City, State ZIP" format
   */
  private extractPostcodeFromCityStateZip(cityStateZip: string): string | undefined {
    if (!cityStateZip || typeof cityStateZip !== 'string') return undefined;
    
    // Handle "City, State ZIP" format - extract ZIP
    // Example: "Berlin, BLN 10707" -> "10707"
    const parts = cityStateZip.split(',');
    if (parts.length > 1) {
      const stateZipPart = parts[1].trim();
      // Extract the last word (ZIP code)
      const words = stateZipPart.split(/\s+/);
      if (words.length > 0) {
        return words[words.length - 1];
      }
    }
    
    return undefined;
  }

  /**
   * Normalize country names and codes
   */
  private normalizeCountryName(country: string): string {
    if (!country || typeof country !== 'string') return '';
    
    const normalized = country.trim();
    
    // Convert common country codes to full names
    const countryCodeMap: Record<string, string> = {
      'US': 'United States',
      'USA': 'United States',
      'UK': 'United Kingdom',
      'GB': 'United Kingdom',
      'DE': 'Germany',
      'FR': 'France',
      'ES': 'Spain',
      'IT': 'Italy',
      'CA': 'Canada',
      'AU': 'Australia',
      'JP': 'Japan',
      'CN': 'China',
      'IN': 'India',
      'BR': 'Brazil',
      'MX': 'Mexico'
    };
    
    const upperCode = normalized.toUpperCase();
    if (countryCodeMap[upperCode]) {
      return countryCodeMap[upperCode];
    }
    
    // Title case for full country names
    return normalized
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .substring(0, 100);
  }

  /**
   * Normalize postcode
   */
  private normalizePostcode(postcode: string): string {
    if (!postcode || typeof postcode !== 'string') return '';
    
    return postcode
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .substring(0, 20);
  }

  /**
   * Normalize coordinates
   */
  private normalizeCoordinate(coord: any): number | undefined {
    if (coord === null || coord === undefined || coord === '') return undefined;
    
    const num = typeof coord === 'string' ? parseFloat(coord) : Number(coord);
    
    if (isNaN(num)) return undefined;
    
    return num;
  }

  /**
   * Normalize status
   */
  private normalizeStatus(status: any): string | undefined {
    if (!status || typeof status !== 'string') return undefined;
    
    const normalized = status.toLowerCase().trim();
    
    // Map common status variations
    const statusMap: Record<string, string> = {
      'open': 'Open',
      'active': 'Open',
      'operational': 'Open',
      'open & operating': 'Open',
      'open and operating': 'Open',
      'operating': 'Open',
      'closed': 'Closed',
      'inactive': 'Closed',
      'temporarily closed': 'Closed',
      'planned': 'Planned',
      'coming soon': 'Planned',
      'under construction': 'Planned',
      'in development': 'Planned'
    };
    
    // Check for exact match first
    if (statusMap[normalized]) {
      return statusMap[normalized];
    }
    
    // Check if status contains key words
    if (normalized.includes('open') || normalized.includes('operating')) {
      return 'Open';
    }
    if (normalized.includes('closed')) {
      return 'Closed';
    }
    if (normalized.includes('planned') || normalized.includes('coming')) {
      return 'Planned';
    }
    
    // Return original if no match (title case)
    return status.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  /**
   * Infer region from country
   */
  private inferRegionFromCountry(country: string): string | undefined {
    const regionMap: Record<string, string> = {
      // AMER
      'United States': 'AMER',
      'Canada': 'AMER',
      'Mexico': 'AMER',
      'Brazil': 'AMER',
      'Argentina': 'AMER',
      'Chile': 'AMER',
      'Colombia': 'AMER',
      'Peru': 'AMER',
      
      // EMEA
      'United Kingdom': 'EMEA',
      'Germany': 'EMEA',
      'France': 'EMEA',
      'Spain': 'EMEA',
      'Italy': 'EMEA',
      'Netherlands': 'EMEA',
      'Belgium': 'EMEA',
      'Switzerland': 'EMEA',
      'Austria': 'EMEA',
      'Sweden': 'EMEA',
      'Norway': 'EMEA',
      'Denmark': 'EMEA',
      'Finland': 'EMEA',
      'Poland': 'EMEA',
      'Czech Republic': 'EMEA',
      'Hungary': 'EMEA',
      'Romania': 'EMEA',
      'Bulgaria': 'EMEA',
      'Croatia': 'EMEA',
      'Serbia': 'EMEA',
      'Greece': 'EMEA',
      'Turkey': 'EMEA',
      'Russia': 'EMEA',
      'Ukraine': 'EMEA',
      'South Africa': 'EMEA',
      'Nigeria': 'EMEA',
      'Kenya': 'EMEA',
      'Egypt': 'EMEA',
      'Morocco': 'EMEA',
      'Israel': 'EMEA',
      'UAE': 'EMEA',
      'Saudi Arabia': 'EMEA',
      
      // APAC
      'Japan': 'APAC',
      'China': 'APAC',
      'South Korea': 'APAC',
      'India': 'APAC',
      'Australia': 'APAC',
      'New Zealand': 'APAC',
      'Singapore': 'APAC',
      'Malaysia': 'APAC',
      'Thailand': 'APAC',
      'Vietnam': 'APAC',
      'Philippines': 'APAC',
      'Indonesia': 'APAC',
      'Taiwan': 'APAC',
      'Hong Kong': 'APAC'
    };
    
    return regionMap[country];
  }

  /**
   * Generate address key for duplicate detection
   */
  private generateAddressKey(store: NormalizedStore): string {
    const parts = [
      store.name.toLowerCase().replace(/[^\w]/g, ''),
      store.address.toLowerCase().replace(/[^\w]/g, ''),
      store.city.toLowerCase().replace(/[^\w]/g, ''),
      store.postcode?.toLowerCase().replace(/[^\w]/g, '') || '',
      store.country.toLowerCase().replace(/[^\w]/g, '')
    ];
    
    return parts.join('|');
  }

  /**
   * Calculate duplicate confidence score
   */
  private calculateDuplicateConfidence(store1: NormalizedStore, store2: NormalizedStore): number {
    let score = 0;
    let factors = 0;
    
    // Name similarity
    const nameSimilarity = this.calculateStringSimilarity(store1.name, store2.name);
    score += nameSimilarity * 0.4;
    factors += 0.4;
    
    // Address similarity
    const addressSimilarity = this.calculateStringSimilarity(store1.address, store2.address);
    score += addressSimilarity * 0.3;
    factors += 0.3;
    
    // City match
    if (store1.city.toLowerCase() === store2.city.toLowerCase()) {
      score += 0.2;
    }
    factors += 0.2;
    
    // Country match
    if (store1.country.toLowerCase() === store2.country.toLowerCase()) {
      score += 0.1;
    }
    factors += 0.1;
    
    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }

  /**
   * Generate validation warnings
   */
  private generateWarnings(data: any): string[] {
    const warnings: string[] = [];
    
    // Check for missing optional but recommended fields
    if (!data.postcode) {
      warnings.push('Postcode is missing - this may affect geocoding accuracy');
    }
    
    if (!data.latitude || !data.longitude) {
      warnings.push('Coordinates are missing - geocoding will be attempted');
    }
    
    if (!data.externalId) {
      warnings.push('External ID is missing - duplicate detection will rely on address matching');
    }
    
    // Check for potential data quality issues
    if (data.name && data.name.length < 3) {
      warnings.push('Store name is very short - please verify');
    }
    
    if (data.address && data.address.length < 10) {
      warnings.push('Address is very short - please verify');
    }
    
    return warnings;
  }

  /**
   * Batch validate multiple stores
   */
  validateBatch(dataRows: any[], mapping: Record<string, string>, inferredCountry?: string): ValidationResult[] {
    if (inferredCountry) {
      console.log(`🌍 Country inference active: ${inferredCountry}`);
    }
    
    return dataRows.map((data, index) => {
      // If we have an inferred country and the data doesn't have one, add it temporarily for validation
      if (inferredCountry) {
        const mappedData = this.applyColumnMapping(data, mapping);
        if (!mappedData.country || mappedData.country === '') {
          console.log(`🌍 Row ${index + 1}: Using inferred country "${inferredCountry}" (no country in data)`);
          // Create a temporary mapping that includes the inferred country
          const tempData = { ...data, __inferred_country__: inferredCountry };
          const tempMapping = { ...mapping, country: '__inferred_country__' };
          return this.validateStoreData(tempData, tempMapping);
        } else {
          console.log(`🌍 Row ${index + 1}: Using mapped country "${mappedData.country}" (overrides inferred)`);
        }
      }
      return this.validateStoreData(data, mapping);
    });
  }

  /**
   * Batch normalize multiple stores
   */
  normalizeBatch(dataRows: any[], mapping: Record<string, string>, inferredCountry?: string): NormalizedStore[] {
    return dataRows.map((data, index) => {
      const normalized = this.normalizeStoreData(data, mapping);
      
      // Apply inferred country if store doesn't have one
      if (inferredCountry && (!normalized.country || normalized.country === '')) {
        console.log(`🌍 Row ${index + 1}: Applying inferred country "${inferredCountry}" to normalized data`);
        normalized.country = this.normalizeCountryName(inferredCountry);
        normalized.region = this.inferRegionFromCountry(normalized.country);
      }
      
      return normalized;
    });
  }
}