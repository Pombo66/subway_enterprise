import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMenuItemDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999.99)
  price: number;

  @IsString()
  storeId: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}

export class AttachModifierDto {
  @IsString()
  modifierGroupId: string;
}

export class MenuItemQueryDto {
  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(1000)
  take?: number = 100;
}

export class CreateCategoryDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number = 0;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ReorderCategoriesDto {
  @IsString({ each: true })
  categoryIds: string[];
}

export class CategoryItemAssignmentDto {
  @IsString()
  menuItemId: string;
}

export class CreateModifierGroupDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minSelection?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSelection?: number;

  @IsOptional()
  @IsBoolean()
  required?: boolean = false;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}

export class UpdateModifierGroupDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minSelection?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSelection?: number;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateModifierDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-99.99)
  @Max(99.99)
  priceAdjustment?: number = 0;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}

export class UpdateModifierDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-99.99)
  @Max(99.99)
  priceAdjustment?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateMenuItemPricingDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999.99)
  basePrice: number;
}