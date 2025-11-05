import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100, { message: 'Store name must be between 2 and 100 characters' })
  name: string;

  @IsString()
  @IsNotEmpty()
  country: string;
}

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 100, { message: 'Store name must be between 2 and 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class StoreQueryDto {
  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  take?: string;

  @IsOptional()
  @IsString()
  skip?: string;
}