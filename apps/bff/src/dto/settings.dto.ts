import { IsString, IsBoolean, IsOptional, IsEmail, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

// User Management DTOs
export class CreateUserDto {
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsString()
  @IsIn(['ADMIN', 'MANAGER', 'STAFF'])
  role: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ADMIN', 'MANAGER', 'STAFF'])
  role?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// Audit Log Query DTOs
export class AuditLogQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  actor?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 50;
}

// Feature Flag DTOs
export class UpdateFeatureFlagDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;
}