import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GalleryImageDto {
  @ApiProperty() @IsString() @IsNotEmpty() id!: string;
  @ApiProperty() @IsString() @IsNotEmpty() url!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() alt?: string;
}

export class VariantOptionDto {
  @ApiProperty() @IsString() @IsNotEmpty() id!: string;
  @ApiProperty() @IsString() @IsNotEmpty() label!: string;
  @ApiPropertyOptional({ nullable: true }) @IsString() @IsOptional() swatchHex?: string | null;
}

export class VariantAxisDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() displayName!: string;
  @ApiProperty({ type: [VariantOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantOptionDto)
  options!: VariantOptionDto[];
}

export class ProductVariantDto {
  @ApiProperty() @IsString() @IsNotEmpty() id!: string;
  @ApiProperty() @IsString() @IsNotEmpty() sku!: string;
  @ApiProperty() @IsObject() attributes!: Record<string, string>;
  @ApiProperty() @IsNumber() @Min(0) priceAmount!: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Min(0) stockQty?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isInStock?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() @IsString({ each: true }) images?: string[];
}

export class ProductTabDto {
  @ApiProperty() @IsString() @IsNotEmpty() label!: string;
  @ApiProperty() @IsString() @IsNotEmpty() contentHtml!: string;
}

export class SpecificationDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() value!: string;
}

export class BreadcrumbDto {
  @ApiProperty() @IsString() @IsNotEmpty() label!: string;
  @ApiPropertyOptional({ nullable: true }) @IsString() @IsOptional() url?: string | null;
}

export class CreateProductDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() brand?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() sku?: string;

  @ApiProperty({ description: 'Store ID this product belongs to' })
  @IsString()
  @IsNotEmpty()
  storeId!: string;

  @ApiPropertyOptional() @IsString() @IsOptional() categoryId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() subCategoryId?: string;

  @ApiProperty({ description: 'Selling price in NGN (kobo or naira depending on convention)' })
  @IsNumber()
  @Min(0)
  priceAmount!: number;

  @ApiPropertyOptional({ description: 'Original/compare-at price (if on sale)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  originalPriceAmount?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional() @IsString() @IsOptional() thumbnailUrl?: string;

  @ApiPropertyOptional({ type: [GalleryImageDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => GalleryImageDto)
  gallery?: GalleryImageDto[];

  @ApiPropertyOptional({ type: [VariantAxisDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VariantAxisDto)
  variantAxes?: VariantAxisDto[];

  @ApiPropertyOptional({ type: [ProductVariantDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @ApiPropertyOptional() @IsString() @IsOptional() defaultVariantId?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() descriptionHtml?: string;

  @ApiPropertyOptional({ type: [ProductTabDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductTabDto)
  tabs?: ProductTabDto[];

  @ApiPropertyOptional({ type: [SpecificationDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SpecificationDto)
  specifications?: SpecificationDto[];

  @ApiPropertyOptional({ type: [BreadcrumbDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BreadcrumbDto)
  breadcrumbs?: BreadcrumbDto[];

  @ApiPropertyOptional() @IsString() @IsOptional() badge?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  sections?: string[];

  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;

  @ApiPropertyOptional() @IsString() @IsOptional() inventoryStatus?: string;
}
