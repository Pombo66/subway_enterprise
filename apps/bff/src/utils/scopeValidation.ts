/**
 * Validation utilities for scope boundaries and geographic data
 */

export interface ScopeSelection {
  type: 'country' | 'state' | 'custom_area';
  value: string;
  polygon?: any; // GeoJSON.Polygon
  area?: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

// Valid country codes
const VALID_COUNTRIES = [
  'US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'AU', 'JP', 'KR', 'SG', 'NZ', 'HK'
];

// Valid US state codes
const VALID_US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

/**
 * Validate scope selection
 */
export function validateScope(scope: ScopeSelection): ValidationResult {
  const warnings: string[] = [];

  // Validate scope type
  if (!['country', 'state', 'custom_area'].includes(scope.type)) {
    return {
      isValid: false,
      error: 'Invalid scope type. Must be one of: country, state, custom_area'
    };
  }

  // Validate scope value
  if (!scope.value || typeof scope.value !== 'string') {
    return {
      isValid: false,
      error: 'Scope value is required and must be a string'
    };
  }

  // Type-specific validation
  switch (scope.type) {
    case 'country':
      return validateCountryScope(scope.value, warnings);
    case 'state':
      return validateStateScope(scope.value, warnings);
    case 'custom_area':
      return validateCustomAreaScope(scope, warnings);
    default:
      return {
        isValid: false,
        error: 'Unknown scope type'
      };
  }
}

/**
 * Validate country scope
 */
function validateCountryScope(countryCode: string, warnings: string[]): ValidationResult {
  const upperCode = countryCode.toUpperCase();
  
  if (!VALID_COUNTRIES.includes(upperCode)) {
    return {
      isValid: false,
      error: `Invalid country code: ${countryCode}. Valid codes: ${VALID_COUNTRIES.join(', ')}`
    };
  }

  // Add warnings for countries with limited data
  if (['HK', 'SG'].includes(upperCode)) {
    warnings.push('Limited expansion data available for this country');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate US state scope
 */
function validateStateScope(stateCode: string, warnings: string[]): ValidationResult {
  const upperCode = stateCode.toUpperCase();
  
  if (!VALID_US_STATES.includes(upperCode)) {
    return {
      isValid: false,
      error: `Invalid US state code: ${stateCode}. Must be a valid 2-letter state code`
    };
  }

  // Add warnings for states with limited Subway presence
  const limitedPresenceStates = ['AK', 'HI', 'WY', 'VT', 'ND', 'SD'];
  if (limitedPresenceStates.includes(upperCode)) {
    warnings.push('Limited Subway presence in this state may affect prediction accuracy');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate custom area scope
 */
function validateCustomAreaScope(scope: ScopeSelection, warnings: string[]): ValidationResult {
  if (!scope.polygon) {
    return {
      isValid: false,
      error: 'Custom area requires a polygon definition'
    };
  }

  // Validate polygon structure
  const polygonValidation = validatePolygon(scope.polygon);
  if (!polygonValidation.isValid) {
    return polygonValidation;
  }

  // Validate area if provided
  if (scope.area !== undefined) {
    const areaValidation = validateArea(scope.area);
    if (!areaValidation.isValid) {
      return areaValidation;
    }

    // Add warnings for extreme areas
    if (scope.area < 10) {
      warnings.push('Very small area may not provide meaningful expansion insights');
    } else if (scope.area > 1000000) {
      warnings.push('Very large area may result in less precise recommendations');
    }
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate GeoJSON polygon
 */
function validatePolygon(polygon: any): ValidationResult {
  if (!polygon || typeof polygon !== 'object') {
    return {
      isValid: false,
      error: 'Polygon must be a valid GeoJSON object'
    };
  }

  if (polygon.type !== 'Polygon') {
    return {
      isValid: false,
      error: 'Geometry type must be "Polygon"'
    };
  }

  if (!Array.isArray(polygon.coordinates) || polygon.coordinates.length === 0) {
    return {
      isValid: false,
      error: 'Polygon coordinates are required'
    };
  }

  const outerRing = polygon.coordinates[0];
  if (!Array.isArray(outerRing) || outerRing.length < 4) {
    return {
      isValid: false,
      error: 'Polygon must have at least 4 coordinate pairs (including closing point)'
    };
  }

  // Validate coordinate format
  for (let i = 0; i < outerRing.length; i++) {
    const coord = outerRing[i];
    if (!Array.isArray(coord) || coord.length !== 2) {
      return {
        isValid: false,
        error: `Invalid coordinate at index ${i}: must be [longitude, latitude]`
      };
    }

    const [lng, lat] = coord;
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return {
        isValid: false,
        error: `Invalid coordinate at index ${i}: longitude and latitude must be numbers`
      };
    }

    if (lng < -180 || lng > 180) {
      return {
        isValid: false,
        error: `Invalid longitude at index ${i}: must be between -180 and 180`
      };
    }

    if (lat < -90 || lat > 90) {
      return {
        isValid: false,
        error: `Invalid latitude at index ${i}: must be between -90 and 90`
      };
    }
  }

  // Check if polygon is closed
  const firstPoint = outerRing[0];
  const lastPoint = outerRing[outerRing.length - 1];
  if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
    return {
      isValid: false,
      error: 'Polygon must be closed (first and last coordinates must be identical)'
    };
  }

  return { isValid: true };
}

/**
 * Validate area value
 */
function validateArea(area: number): ValidationResult {
  if (typeof area !== 'number' || isNaN(area)) {
    return {
      isValid: false,
      error: 'Area must be a valid number'
    };
  }

  if (area <= 0) {
    return {
      isValid: false,
      error: 'Area must be greater than 0'
    };
  }

  if (area > 20000000) { // Larger than Russia
    return {
      isValid: false,
      error: 'Area is unrealistically large (maximum 20M km²)'
    };
  }

  return { isValid: true };
}

/**
 * Validate intensity parameter
 */
export function validateIntensity(intensity: number): ValidationResult {
  if (typeof intensity !== 'number' || isNaN(intensity)) {
    return {
      isValid: false,
      error: 'Intensity must be a valid number'
    };
  }

  if (intensity < 0 || intensity > 100) {
    return {
      isValid: false,
      error: 'Intensity must be between 0 and 100'
    };
  }

  return { isValid: true };
}

/**
 * Validate data mode parameter
 */
export function validateDataMode(dataMode: string): ValidationResult {
  if (!['live', 'modelled'].includes(dataMode)) {
    return {
      isValid: false,
      error: 'Data mode must be either "live" or "modelled"'
    };
  }

  return { isValid: true };
}

/**
 * Validate minimum distance parameter
 */
export function validateMinDistance(minDistance: number): ValidationResult {
  if (typeof minDistance !== 'number' || isNaN(minDistance)) {
    return {
      isValid: false,
      error: 'Minimum distance must be a valid number'
    };
  }

  if (minDistance < 0) {
    return {
      isValid: false,
      error: 'Minimum distance cannot be negative'
    };
  }

  if (minDistance > 50) {
    return {
      isValid: false,
      error: 'Minimum distance cannot exceed 50km (too restrictive)'
    };
  }

  return { isValid: true };
}

/**
 * Comprehensive validation for scope expansion parameters
 */
export function validateScopeExpansionParams(params: {
  scope: ScopeSelection;
  intensity: number;
  dataMode: string;
  minDistance?: number;
  maxPerCity?: number;
}): ValidationResult {
  const warnings: string[] = [];

  // Validate scope
  const scopeValidation = validateScope(params.scope);
  if (!scopeValidation.isValid) {
    return scopeValidation;
  }
  if (scopeValidation.warnings) {
    warnings.push(...scopeValidation.warnings);
  }

  // Validate intensity
  const intensityValidation = validateIntensity(params.intensity);
  if (!intensityValidation.isValid) {
    return intensityValidation;
  }

  // Validate data mode
  const dataModeValidation = validateDataMode(params.dataMode);
  if (!dataModeValidation.isValid) {
    return dataModeValidation;
  }

  // Validate optional parameters
  if (params.minDistance !== undefined) {
    const minDistanceValidation = validateMinDistance(params.minDistance);
    if (!minDistanceValidation.isValid) {
      return minDistanceValidation;
    }
  }

  if (params.maxPerCity !== undefined) {
    if (typeof params.maxPerCity !== 'number' || params.maxPerCity < 1 || params.maxPerCity > 100) {
      return {
        isValid: false,
        error: 'Max per city must be between 1 and 100'
      };
    }
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}