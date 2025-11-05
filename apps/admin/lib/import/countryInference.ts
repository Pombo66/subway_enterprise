// Country inference functionality for Smart Store Importer v1
import { 
  CountryInference, 
  ConfidenceLevel, 
  InferenceMethod,
  POSTCODE_PATTERNS,
  COUNTRY_INFO,
  CountryCode 
} from './types';
import { CountryInferenceError, ErrorHandler } from './errors';

// Extended country mapping for filename detection
const COUNTRY_FILENAME_PATTERNS = {
  // Germany
  DE: [
    'germany', 'deutschland', 'german', 'de', 'deu',
    'berlin', 'munich', 'hamburg', 'cologne', 'frankfurt'
  ],
  // United States
  US: [
    'usa', 'us', 'united states', 'america', 'american',
    'new york', 'california', 'texas', 'florida'
  ],
  // United Kingdom
  UK: [
    'uk', 'united kingdom', 'britain', 'british', 'england',
    'london', 'manchester', 'birmingham', 'glasgow'
  ],
  // France
  FR: [
    'france', 'french', 'fr', 'fra',
    'paris', 'lyon', 'marseille', 'toulouse'
  ],
  // Canada
  CA: [
    'canada', 'canadian', 'ca', 'can',
    'toronto', 'vancouver', 'montreal', 'calgary'
  ],
  // Australia
  AU: [
    'australia', 'australian', 'au', 'aus',
    'sydney', 'melbourne', 'brisbane', 'perth'
  ],
  // Netherlands
  NL: [
    'netherlands', 'holland', 'dutch', 'nl', 'nld',
    'amsterdam', 'rotterdam', 'utrecht', 'eindhoven'
  ],
  // Italy
  IT: [
    'italy', 'italian', 'it', 'ita',
    'rome', 'milan', 'naples', 'turin'
  ],
  // Spain
  ES: [
    'spain', 'spanish', 'es', 'esp',
    'madrid', 'barcelona', 'valencia', 'seville'
  ],
  // Switzerland
  CH: [
    'switzerland', 'swiss', 'ch', 'che',
    'zurich', 'geneva', 'basel', 'bern'
  ]
} as const;

// State/region patterns for additional inference
const STATE_REGION_PATTERNS = {
  DE: [
    'bayern', 'bavaria', 'nrw', 'nordrhein-westfalen', 'baden-württemberg',
    'niedersachsen', 'hessen', 'sachsen', 'berlin', 'hamburg'
  ],
  US: [
    'california', 'ca', 'texas', 'tx', 'florida', 'fl', 'new york', 'ny',
    'pennsylvania', 'pa', 'illinois', 'il', 'ohio', 'oh'
  ],
  UK: [
    'england', 'scotland', 'wales', 'northern ireland',
    'london', 'manchester', 'birmingham', 'liverpool'
  ],
  FR: [
    'île-de-france', 'provence', 'rhône-alpes', 'aquitaine',
    'languedoc', 'bretagne', 'normandie'
  ],
  CA: [
    'ontario', 'quebec', 'british columbia', 'alberta',
    'manitoba', 'saskatchewan', 'nova scotia'
  ]
} as const;

export class CountryInferrer {
  /**
   * Infer country from filename patterns
   */
  inferFromFilename(filename: string): CountryInference | null {
    try {
      const normalizedFilename = filename.toLowerCase()
        .replace(/[_-]/g, ' ')
        .replace(/\.(xlsx?|csv)$/i, '');

      let bestMatch: {
        country: CountryCode;
        confidence: number;
        matchedTerm: string;
      } | null = null;

      // Check each country's patterns
      for (const [countryCode, patterns] of Object.entries(COUNTRY_FILENAME_PATTERNS)) {
        for (const pattern of patterns) {
          if (normalizedFilename.includes(pattern.toLowerCase())) {
            // Calculate confidence based on pattern specificity and position
            let confidence = 0.6; // Base confidence for filename match
            
            // Higher confidence for exact country names
            if (['germany', 'deutschland', 'usa', 'united states', 'france', 'canada'].includes(pattern.toLowerCase())) {
              confidence = 0.8;
            }
            
            // Higher confidence for country codes in specific positions
            if (pattern.length === 2 && /\b[a-z]{2}\b/.test(normalizedFilename)) {
              confidence = 0.7;
            }
            
            // Boost confidence if pattern appears at word boundaries
            const wordBoundaryRegex = new RegExp(`\\b${pattern.toLowerCase()}\\b`);
            if (wordBoundaryRegex.test(normalizedFilename)) {
              confidence += 0.1;
            }

            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = {
                country: countryCode as CountryCode,
                confidence,
                matchedTerm: pattern
              };
            }
          }
        }
      }

      if (bestMatch) {
        const countryInfo = COUNTRY_INFO[bestMatch.country];
        return {
          country: bestMatch.country,
          confidence: bestMatch.confidence >= 0.8 ? 'high' : 'medium',
          method: 'filename',
          displayText: `Detected: ${countryInfo.name} ${countryInfo.flag} (from filename "${bestMatch.matchedTerm}")`,
          countryCode: bestMatch.country,
          flagEmoji: countryInfo.flag
        };
      }

      return null;
    } catch (error) {
      ErrorHandler.logError(error, { context: 'inferFromFilename', filename });
      return null;
    }
  }

  /**
   * Infer country from data patterns (postcodes, state codes, etc.)
   */
  inferFromDataPatterns(sampleRows: any[]): CountryInference | null {
    try {
      const countryScores: Record<CountryCode, number> = {} as Record<CountryCode, number>;
      const evidenceDetails: Record<CountryCode, string[]> = {} as Record<CountryCode, string[]>;

      // Analyze postcode patterns
      const postcodes = this.extractPostcodes(sampleRows);
      for (const postcode of postcodes.slice(0, 10)) { // Limit to first 10 for performance
        for (const [countryCode, pattern] of Object.entries(POSTCODE_PATTERNS)) {
          if (pattern.test(postcode)) {
            const country = countryCode as CountryCode;
            countryScores[country] = (countryScores[country] || 0) + 0.3;
            if (!evidenceDetails[country]) evidenceDetails[country] = [];
            evidenceDetails[country].push(`postcode: ${postcode}`);
          }
        }
      }

      // Analyze state/region patterns
      const regions = this.extractRegions(sampleRows);
      for (const region of regions.slice(0, 10)) {
        for (const [countryCode, patterns] of Object.entries(STATE_REGION_PATTERNS)) {
          for (const pattern of patterns) {
            if (region.toLowerCase().includes(pattern.toLowerCase())) {
              const country = countryCode as CountryCode;
              countryScores[country] = (countryScores[country] || 0) + 0.2;
              if (!evidenceDetails[country]) evidenceDetails[country] = [];
              evidenceDetails[country].push(`region: ${region}`);
            }
          }
        }
      }

      // Find the country with the highest score
      let bestCountry: CountryCode | null = null;
      let bestScore = 0;

      for (const [country, score] of Object.entries(countryScores)) {
        if (score > bestScore) {
          bestScore = score;
          bestCountry = country as CountryCode;
        }
      }

      if (bestCountry && bestScore >= 0.3) {
        const countryInfo = COUNTRY_INFO[bestCountry];
        const evidence = evidenceDetails[bestCountry].slice(0, 3).join(', ');
        
        return {
          country: bestCountry,
          confidence: bestScore >= 0.6 ? 'high' : 'medium',
          method: 'format',
          displayText: `Detected: ${countryInfo.name} ${countryInfo.flag} (from data patterns: ${evidence})`,
          countryCode: bestCountry,
          flagEmoji: countryInfo.flag
        };
      }

      return null;
    } catch (error) {
      ErrorHandler.logError(error, { context: 'inferFromDataPatterns', sampleRowCount: sampleRows.length });
      return null;
    }
  }

  /**
   * Infer country from user region fallback
   */
  inferFromRegionFallback(userRegion?: string): CountryInference | null {
    try {
      if (!userRegion) return null;

      // Map common region names to countries
      const regionToCountry: Record<string, CountryCode> = {
        'emea': 'DE', // Default to Germany for EMEA
        'europe': 'DE',
        'amer': 'US', // Default to US for Americas
        'americas': 'US',
        'north america': 'US',
        'apac': 'AU', // Default to Australia for APAC
        'asia pacific': 'AU',
        'germany': 'DE',
        'united states': 'US',
        'usa': 'US',
        'uk': 'UK',
        'united kingdom': 'UK',
        'france': 'FR',
        'canada': 'CA',
        'australia': 'AU'
      };

      const normalizedRegion = userRegion.toLowerCase().trim();
      const countryCode = regionToCountry[normalizedRegion];

      if (countryCode) {
        const countryInfo = COUNTRY_INFO[countryCode];
        return {
          country: countryCode,
          confidence: 'medium',
          method: 'fallback',
          displayText: `Detected: ${countryInfo.name} ${countryInfo.flag} (from user region: ${userRegion})`,
          countryCode,
          flagEmoji: countryInfo.flag
        };
      }

      return null;
    } catch (error) {
      ErrorHandler.logError(error, { context: 'inferFromRegionFallback', userRegion });
      return null;
    }
  }

  /**
   * Main country inference method that tries all approaches
   */
  inferCountry(
    filename: string, 
    sampleRows: any[], 
    userRegion?: string,
    existingCountryColumn?: string
  ): CountryInference {
    try {
      // If there's already a country column mapped, use it with high confidence
      if (existingCountryColumn) {
        // Try to determine which country from the column data
        const countryValues = this.extractCountryValues(sampleRows, existingCountryColumn);
        const inferredCountry = this.inferFromCountryValues(countryValues);
        
        if (inferredCountry) {
          return {
            ...inferredCountry,
            confidence: 'high',
            method: 'column',
            displayText: `Detected: ${COUNTRY_INFO[inferredCountry.country].name} ${COUNTRY_INFO[inferredCountry.country].flag} (from country column)`
          };
        }
      }

      // Try filename inference first (most reliable)
      const filenameInference = this.inferFromFilename(filename);
      if (filenameInference && filenameInference.confidence === 'high') {
        return filenameInference;
      }

      // Try data pattern inference
      const patternInference = this.inferFromDataPatterns(sampleRows);
      if (patternInference && patternInference.confidence === 'high') {
        return patternInference;
      }

      // Return the best medium confidence result
      if (filenameInference) return filenameInference;
      if (patternInference) return patternInference;

      // Fall back to user region
      const fallbackInference = this.inferFromRegionFallback(userRegion);
      if (fallbackInference) return fallbackInference;

      // Default fallback to Germany (most common in our use case)
      return {
        country: 'DE',
        confidence: 'low',
        method: 'fallback',
        displayText: 'Detected: Germany 🇩🇪 (default fallback)',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      };

    } catch (error) {
      ErrorHandler.logError(error, { 
        context: 'inferCountry', 
        filename, 
        sampleRowCount: sampleRows.length, 
        userRegion 
      });
      
      // Return safe fallback on error
      return {
        country: 'DE',
        confidence: 'low',
        method: 'fallback',
        displayText: 'Detected: Germany 🇩🇪 (error fallback)',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      };
    }
  }

  /**
   * Extract postcode-like values from sample rows
   */
  private extractPostcodes(sampleRows: any[]): string[] {
    const postcodes: string[] = [];
    
    for (const row of sampleRows.slice(0, 20)) {
      if (!Array.isArray(row)) continue;
      
      for (const cell of row) {
        if (!cell) continue;
        
        const value = cell.toString().trim();
        // Look for postcode-like patterns
        if (/^[\d\w\s-]{3,10}$/.test(value) && !/^[a-zA-Z\s]+$/.test(value)) {
          postcodes.push(value);
        }
      }
    }
    
    return [...new Set(postcodes)]; // Remove duplicates
  }

  /**
   * Extract region/state-like values from sample rows
   */
  private extractRegions(sampleRows: any[]): string[] {
    const regions: string[] = [];
    
    for (const row of sampleRows.slice(0, 20)) {
      if (!Array.isArray(row)) continue;
      
      for (const cell of row) {
        if (!cell || typeof cell !== 'string') continue;
        
        const value = cell.toString().trim();
        // Look for region-like patterns (text, reasonable length)
        if (value.length >= 3 && value.length <= 30 && /^[a-zA-Z\s-]+$/.test(value)) {
          regions.push(value);
        }
      }
    }
    
    return [...new Set(regions)]; // Remove duplicates
  }

  /**
   * Extract country values from a specific column
   */
  private extractCountryValues(sampleRows: any[], columnIndex: string | number): string[] {
    const countries: string[] = [];
    const colIndex = typeof columnIndex === 'string' ? 
      parseInt(columnIndex, 10) : columnIndex;
    
    for (const row of sampleRows.slice(0, 10)) {
      if (!Array.isArray(row) || !row[colIndex]) continue;
      
      const value = row[colIndex].toString().trim();
      if (value) {
        countries.push(value);
      }
    }
    
    return [...new Set(countries)];
  }

  /**
   * Infer country from explicit country values
   */
  private inferFromCountryValues(countryValues: string[]): CountryInference | null {
    const countryScores: Record<CountryCode, number> = {} as Record<CountryCode, number>;
    
    for (const value of countryValues) {
      const normalized = value.toLowerCase().trim();
      
      // Check against country patterns
      for (const [countryCode, patterns] of Object.entries(COUNTRY_FILENAME_PATTERNS)) {
        for (const pattern of patterns) {
          if (normalized === pattern.toLowerCase() || 
              (pattern.length === 2 && normalized === pattern.toLowerCase())) {
            const country = countryCode as CountryCode;
            countryScores[country] = (countryScores[country] || 0) + 1;
          }
        }
      }
    }
    
    // Find most common country
    let bestCountry: CountryCode | null = null;
    let bestScore = 0;
    
    for (const [country, score] of Object.entries(countryScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestCountry = country as CountryCode;
      }
    }
    
    if (bestCountry) {
      const countryInfo = COUNTRY_INFO[bestCountry];
      return {
        country: bestCountry,
        confidence: 'high',
        method: 'column',
        displayText: `${countryInfo.name} ${countryInfo.flag}`,
        countryCode: bestCountry,
        flagEmoji: countryInfo.flag
      };
    }
    
    return null;
  }
}

// Export default instance
export const countryInferrer = new CountryInferrer();