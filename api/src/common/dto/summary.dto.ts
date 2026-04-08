import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Slim product reference — used whenever a product appears nested inside
 * another entity (order items, invoice items, stock movements, etc.)
 * Contains only the fields the frontend needs to render a line item.
 */
export class ProductSummaryDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  code: string | null;

  @ApiPropertyOptional()
  @Expose()
  imageUrl: string | null;

  @ApiProperty()
  @Expose()
  isService: boolean;
}

/**
 * Slim partner reference — used when a customer/supplier appears nested
 * inside orders, invoices, payments, etc.
 */
export class PartnerSummaryDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  phoneNumber: string | null;

  @ApiPropertyOptional()
  @Expose()
  ice: string | null;
}

/**
 * Slim category reference — used inside product response nested categories.
 */
export class CategorySummaryDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  type: string;
}

/**
 * Slim unit-of-measure reference — used inside product response nested UoM.
 */
export class UomSummaryDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  code: string;
}

/**
 * Slim warehouse reference — used inside stock movements, adjustments, and quants.
 */
export class WarehouseSummaryDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  code: string;
}

/**
 * Slim permission — used inside role responses.
 */
export class PermissionSummaryDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  key: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  module: string;

  @ApiProperty()
  @Expose()
  action: string;
}

/**
 * Slim role reference — used inside user responses.
 */
export class RoleSummaryDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  isSuperAdmin: boolean;

  @ApiProperty({ type: [PermissionSummaryDto] })
  @Expose()
  @Type(() => PermissionSummaryDto)
  permissions: PermissionSummaryDto[];
}
