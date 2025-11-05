import { IsString, IsOptional, IsIn, IsNumberString } from 'class-validator';

// Legacy DTOs for backward compatibility
export class ExpansionRecommendationsDto {
  @IsOptional()
  @IsString()
  @IsIn(['AMER', 'EMEA', 'APAC'], { message: 'Region must be one of: AMER, EMEA, APAC' })
  region?: string;

  @IsOptional()
  @IsString()
  country?: string; // NEW: Country filtering (e.g., 'DE', 'FR', 'GB')

  @IsOptional()
  @IsString()
  target?: string;

  @IsString()
  @IsIn(['live', 'model'], { message: 'Mode must be either "live" or "model"' })
  mode: 'live' | 'model';

  @IsOptional()
  @IsString()
  limit?: string;
}

export class ExpansionRecomputeDto {
  @IsOptional()
  @IsString()
  @IsIn(['AMER', 'EMEA', 'APAC'], { message: 'Region must be one of: AMER, EMEA, APAC' })
  region?: string;
}

// New scope-based DTOs
export class ScopeExpansionDto {
  @IsString()
  @IsIn(['country', 'state', 'custom_area'], { message: 'Scope type must be one of: country, state, custom_area' })
  scopeType: string;

  @IsString()
  scopeValue: string;

  @IsOptional()
  @IsString()
  scopePolygon?: string; // JSON string of GeoJSON polygon

  @IsOptional()
  @IsNumberString()
  scopeArea?: string; // Area in km²

  @IsNumberString()
  intensity: string; // 0-100

  @IsString()
  @IsIn(['live', 'modelled'], { message: 'Data mode must be either "live" or "modelled"' })
  dataMode: string;

  @IsOptional()
  @IsNumberString()
  minDistance?: string; // Anti-cannibalization distance in km

  @IsOptional()
  @IsNumberString()
  maxPerCity?: string; // Maximum suggestions per city
}

export class CapacityEstimateDto {
  @IsString()
  @IsIn(['country', 'state', 'custom_area'], { message: 'Scope type must be one of: country, state, custom_area' })
  scopeType: string;

  @IsString()
  scopeValue: string;

  @IsOptional()
  @IsString()
  scopePolygon?: string; // JSON string of GeoJSON polygon

  @IsOptional()
  @IsNumberString()
  scopeArea?: string; // Area in km²
}

export class ScopeRecomputeDto {
  @IsString()
  @IsIn(['country', 'state', 'custom_area'], { message: 'Scope type must be one of: country, state, custom_area' })
  scopeType: string;

  @IsString()
  scopeValue: string;

  @IsOptional()
  @IsString()
  scopePolygon?: string; // JSON string of GeoJSON polygon

  @IsOptional()
  @IsNumberString()
  scopeArea?: string; // Area in km²
}