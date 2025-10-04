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