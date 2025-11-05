// Auto-mapping functionality for Smart Store Importer v1
import { 
  FieldMapping, 
  AutoMapResult, 
  ConfidenceLevel, 
  FIELD_ALIASES, 
  FieldAlias,
  POSTCODE_PATTERNS,
  CountryCode 
} from './types';
import { AutoMappingError, ErrorHandler } from './errors';

// Fuzzy string matching utility
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Levenshtein distance calculation
  const matrix: number[][] = [];
  const len1 = s1.length;
  const len2 = s2.length;
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1.0 : (maxLen - matrix[len1][len2]) / maxLen;
}

// Sample data validators for different field types
class SampleDataValidator {
  /**
   * Validate if samples look like names/restaurant names
   */
  static validateName(samples: any[]): number {
    let score = 0;
    let validSamples = 0;
    
    for (const sample of samples.slice(0, 5)) {
      if (typeof sample !== 'string' || !sample.trim()) continue;
      
      const text = sample.trim();
      validSamples++;
      
      // Check for common restaurant/store indicators
      if (/\b(restaurant|cafe|store|shop|bar|grill|pizza|burger|subway)\b/i.test(text)) {
        score += 0.3;
      }
      
      // Check for proper capitalization
      if (/^[A-Z]/.test(text)) {
        score += 0.1;
      }
      
      // Check length (names are usually 5-50 characters)
      if (text.length >= 5 && text.length <= 50) {
        score += 0.1;
      }
      
      // Avoid numeric-only values
      if (!/^\d+$/.test(text)) {
        score += 0.1;
      }
    }
    
    return validSamples > 0 ? Math.min(score / validSamples, 1.0) : 0;
  }

  /**
   * Validate if samples look like addresses
   */
  static validateAddress(samples: any[]): number {
    let score = 0;
    let validSamples = 0;
    
    for (const sample of samples.slice(0, 5)) {
      if (typeof sample !== 'string' || !sample.trim()) continue;
      
      const text = sample.trim();
      validSamples++;
      
      // Check for street number at beginning
      if (/^\d+\s/.test(text)) {
        score += 0.3;
      }
      
      // Check for common street types
      if (/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|place|pl)\b/i.test(text)) {
        score += 0.3;
      }
      
      // Check for reasonable length
      if (text.length >= 10 && text.length <= 100) {
        score += 0.2;
      }
      
      // Check for multiple words
      if (text.split(/\s+/).length >= 2) {
        score += 0.2;
      }
    }
    
    return validSamples > 0 ? Math.min(score / validSamples, 1.0) : 0;
  }

  /**
   * Validate if samples look like city names
   */
  static validateCity(samples: any[]): number {
    let score = 0;
    let validSamples = 0;
    
    for (const sample of samples.slice(0, 5)) {
      if (typeof sample !== 'string' || !sample.trim()) continue;
      
      const text = sample.trim();
      validSamples++;
      
      // Check for proper capitalization
      if (/^[A-Z]/.test(text)) {
        score += 0.2;
      }
      
      // Check for reasonable length (cities are usually 2-30 characters)
      if (text.length >= 2 && text.length <= 30) {
        score += 0.3;
      }
      
      // Avoid numeric-only values
      if (!/^\d+$/.test(text)) {
        score += 0.2;
      }
      
      // Check for common city patterns (avoid addresses)
      if (!/^\d+\s/.test(text) && !text.includes('@')) {
        score += 0.3;
      }
    }
    
    return validSamples > 0 ? Math.min(score / validSamples, 1.0) : 0;
  }

  /**
   * Validate if samples look like postcodes
   */
  static validatePostcode(samples: any[]): number {
    let score = 0;
    let validSamples = 0;
    
    for (const sample of samples.slice(0, 5)) {
      if (!sample || typeof sample !== 'string') continue;
      
      const text = sample.toString().trim();
      if (!text) continue;
      
      validSamples++;
      
      // Check against known postcode patterns
      for (const [country, pattern] of Object.entries(POSTCODE_PATTERNS)) {
        if (pattern.test(text)) {
          score += 0.8;
          break;
        }
      }
      
      // General postcode characteristics
      if (/^[\d\w\s-]{3,10}$/.test(text)) {
        score += 0.2;
      }
    }
    
    return validSamples > 0 ? Math.min(score / validSamples, 1.0) : 0;
  }

  /**
   * Validate if samples look like country names or codes
   */
  static validateCountry(samples: any[]): number {
    let score = 0;
    let validSamples = 0;
    
    const commonCountries = [
      'germany', 'deutschland', 'de', 'usa', 'us', 'united states',
      'uk', 'united kingdom', 'france', 'fr', 'canada', 'ca',
      'australia', 'au', 'italy', 'it', 'spain', 'es', 'netherlands', 'nl'
    ];
    
    for (const sample of samples.slice(0, 5)) {
      if (typeof sample !== 'string' || !sample.trim()) continue;
      
      const text = sample.trim().toLowerCase();
      validSamples++;
      
      // Check for known country names/codes
      if (commonCountries.includes(text)) {
        score += 0.8;
      }
      
      // Check for 2-letter country codes
      if (/^[a-z]{2}$/i.test(text)) {
        score += 0.6;
      }
      
      // Check for reasonable length for country names
      if (text.length >= 2 && text.length <= 20) {
        score += 0.2;
      }
    }
    
    return validSamples > 0 ? Math.min(score / validSamples, 1.0) : 0;
  }

  /**
   * Validate if samples look like latitude values
   */
  static validateLatitude(samples: any[]): number {
    let score = 0;
    let validSamples = 0;
    
    for (const sample of samples.slice(0, 5)) {
      const num = parseFloat(sample);
      if (isNaN(num)) continue;
      
      validSamples++;
      
      // Latitude range is -90 to 90
      if (num >= -90 && num <= 90) {
        score += 0.8;
        
        // More specific ranges for common regions
        if ((num >= 40 && num <= 60) || (num >= -40 && num <= 40)) {
          score += 0.2;
        }
      }
    }
    
    return validSamples > 0 ? Math.min(score / validSamples, 1.0) : 0;
  }

  /**
   * Validate if samples look like longitude values
   */
  static validateLongitude(samples: any[]): number {
    let score = 0;
    let validSamples = 0;
    
    for (const sample of samples.slice(0, 5)) {
      const num = parseFloat(sample);
      if (isNaN(num)) continue;
      
      validSamples++;
      
      // Longitude range is -180 to 180
      if (num >= -180 && num <= 180) {
        score += 0.8;
        
        // More specific ranges for common regions
        if ((num >= -130 && num <= 30) || (num >= 100 && num <= 150)) {
          score += 0.2;
        }
      }
    }
    
    return validSamples > 0 ? Math.min(score / validSamples, 1.0) : 0;
  }

  /**
   * Validate if samples look like status values
   */
  static validateStatus(samples: any[]): number {
    let score = 0;
    let validSamples = 0;
    
    const commonStatuses = [
      'active', 'inactive', 'open', 'closed', 'pending', 'approved',
      'operational', 'non-operational', 'live', 'draft'
    ];
    
    for (const sample of samples.slice(0, 5)) {
      if (typeof sample !== 'string' || !sample.trim()) continue;
      
      const text = sample.trim().toLowerCase();
      validSamples++;
      
      // Check for known status values
      if (commonStatuses.includes(text)) {
        score += 0.8;
      }
      
      // Check for short, simple values
      if (text.length >= 3 && text.length <= 15 && !/\s/.test(text)) {
        score += 0.2;
      }
    }
    
    return validSamples > 0 ? Math.min(score / validSamples, 1.0) : 0;
  }

  /**
   * Validate if samples look like external IDs
   */
  static validateExternalId(samples: any[]): number {
    let score = 0;
    let validSamples = 0;
    
    for (const sample of samples.slice(0, 5)) {
      if (!sample) continue;
      
      const text = sample.toString().trim();
      if (!text) continue;
      
      validSamples++;
      
      // Check for numeric IDs
      if (/^\d+$/.test(text)) {
        score += 0.6;
      }
      
      // Check for alphanumeric IDs
      if (/^[a-z0-9_-]+$/i.test(text)) {
        score += 0.4;
      }
      
      // Check for reasonable length
      if (text.length >= 1 && text.length <= 20) {
        score += 0.2;
      }
      
      // Prefer shorter, simpler values
      if (text.length <= 10) {
        score += 0.2;
      }
    }
    
    return validSamples > 0 ? Math.min(score / validSamples, 1.0) : 0;
  }
}

// Main AutoMapper class
export class AutoMapper {
  private readonly fuzzyMatchThreshold: number;

  constructor(fuzzyMatchThreshold: number = 0.7) {
    this.fuzzyMatchThreshold = fuzzyMatchThreshold;
  }

  /**
   * Analyze headers and return similarity scores for each field
   */
  analyzeHeaders(headers: string[]): Record<string, Record<string, number>> {
    const scores: Record<string, Record<string, number>> = {};
    
    try {
      for (const header of headers) {
        scores[header] = {};
        
        for (const [fieldName, aliases] of Object.entries(FIELD_ALIASES)) {
          let bestScore = 0;
          
          for (const alias of aliases) {
            const similarity = calculateSimilarity(header, alias);
            bestScore = Math.max(bestScore, similarity);
          }
          
          scores[header][fieldName] = bestScore;
        }
      }
      
      return scores;
    } catch (error) {
      ErrorHandler.logError(error, { context: 'analyzeHeaders', headers });
      throw new AutoMappingError('Failed to analyze headers', { headers });
    }
  }

  /**
   * Validate sample data for a specific field type
   */
  validateSampleData(fieldName: FieldAlias, samples: any[]): number {
    try {
      switch (fieldName) {
        case 'name':
          return SampleDataValidator.validateName(samples);
        case 'address':
          return SampleDataValidator.validateAddress(samples);
        case 'city':
          return SampleDataValidator.validateCity(samples);
        case 'postcode':
          return SampleDataValidator.validatePostcode(samples);
        case 'country':
          return SampleDataValidator.validateCountry(samples);
        case 'latitude':
          return SampleDataValidator.validateLatitude(samples);
        case 'longitude':
          return SampleDataValidator.validateLongitude(samples);
        case 'status':
          return SampleDataValidator.validateStatus(samples);
        case 'externalId':
          return SampleDataValidator.validateExternalId(samples);
        default:
          return 0;
      }
    } catch (error) {
      ErrorHandler.logError(error, { context: 'validateSampleData', fieldName, sampleCount: samples.length });
      return 0;
    }
  }

  /**
   * Generate confidence level based on combined scores
   */
  private getConfidenceLevel(headerScore: number, sampleScore: number): ConfidenceLevel {
    const combinedScore = (headerScore * 0.7) + (sampleScore * 0.3);
    
    if (combinedScore >= 0.8) return 'high';
    if (combinedScore >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Generate reason text for confidence rating
   */
  private getConfidenceReason(
    fieldName: string, 
    headerScore: number, 
    sampleScore: number, 
    suggestedColumn: string
  ): string {
    const confidence = this.getConfidenceLevel(headerScore, sampleScore);
    
    if (confidence === 'high') {
      if (headerScore >= 0.9) {
        return `Header "${suggestedColumn}" exactly matches expected ${fieldName} field`;
      } else {
        return `Header "${suggestedColumn}" closely matches ${fieldName} and sample data looks correct`;
      }
    } else if (confidence === 'medium') {
      if (headerScore >= 0.6) {
        return `Header "${suggestedColumn}" partially matches ${fieldName} field`;
      } else {
        return `Sample data suggests this could be ${fieldName} field`;
      }
    } else {
      return `Uncertain match - please review "${suggestedColumn}" for ${fieldName} field`;
    }
  }

  /**
   * Generate complete field mappings with confidence scores
   */
  generateMappings(headers: string[], sampleRows: any[]): AutoMapResult {
    try {
      const headerScores = this.analyzeHeaders(headers);
      const mappings: Record<string, FieldMapping> = {};
      const usedColumns = new Set<string>();
      const unmappedColumns: string[] = [];
      
      // Get sample data for each column
      const sampleData: Record<string, any[]> = {};
      headers.forEach((header, index) => {
        sampleData[header] = sampleRows.map(row => row[index]).filter(val => val != null);
      });

      // For each field type, find the best matching column
      for (const fieldName of Object.keys(FIELD_ALIASES) as FieldAlias[]) {
        let bestMatch: {
          column: string;
          headerScore: number;
          sampleScore: number;
          combinedScore: number;
        } | null = null;

        for (const header of headers) {
          if (usedColumns.has(header)) continue;

          const headerScore = headerScores[header][fieldName] || 0;
          const sampleScore = this.validateSampleData(fieldName, sampleData[header] || []);
          const combinedScore = (headerScore * 0.7) + (sampleScore * 0.3);

          if (combinedScore >= this.fuzzyMatchThreshold && 
              (!bestMatch || combinedScore > bestMatch.combinedScore)) {
            bestMatch = {
              column: header,
              headerScore,
              sampleScore,
              combinedScore
            };
          }
        }

        if (bestMatch) {
          usedColumns.add(bestMatch.column);
          mappings[fieldName] = {
            field: fieldName,
            confidence: this.getConfidenceLevel(bestMatch.headerScore, bestMatch.sampleScore),
            reason: this.getConfidenceReason(fieldName, bestMatch.headerScore, bestMatch.sampleScore, bestMatch.column),
            suggestedColumn: bestMatch.column
          };
        }
      }

      // Identify unmapped columns
      for (const header of headers) {
        if (!usedColumns.has(header)) {
          unmappedColumns.push(header);
        }
      }

      // Calculate confidence summary
      const confidenceSummary = {
        high: Object.values(mappings).filter(m => m.confidence === 'high').length,
        medium: Object.values(mappings).filter(m => m.confidence === 'medium').length,
        low: Object.values(mappings).filter(m => m.confidence === 'low').length,
      };

      return {
        mappings,
        unmappedColumns,
        confidenceSummary
      };

    } catch (error) {
      ErrorHandler.logError(error, { 
        context: 'generateMappings', 
        headerCount: headers.length, 
        sampleRowCount: sampleRows.length 
      });
      throw new AutoMappingError('Failed to generate field mappings', { 
        headers, 
        sampleRowCount: sampleRows.length 
      });
    }
  }
}

// Export default instance
export const autoMapper = new AutoMapper();