// DTOs for geocoding API endpoints
import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export enum GeocodeProvider {
  NOMINATIM = 'nominatim',
  GOOGLE = 'google'
}

export class GeocodeRowDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  postcode?: string;

  @IsString()
  @IsNotEmpty()
  country: string;
}

export class GeocodeRequestDto {
  @IsOptional()
  @IsEnum(GeocodeProvider)
  providerPreference?: GeocodeProvider;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeocodeRowDto)
  rows: GeocodeRowDto[];
}

export class GeocodeResultDto {
  @IsString()
  id: string;

  @IsOptional()
  lat?: number;

  @IsOptional()
  lng?: number;

  @IsOptional()
  @IsString()
  precision?: string;

  @IsOptional()
  @IsEnum(GeocodeProvider)
  provider?: GeocodeProvider;

  @IsOptional()
  @IsString()
  error?: string;
}

export class GeocodeResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeocodeResultDto)
  results: GeocodeResultDto[];
}