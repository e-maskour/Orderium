import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const SEQUENCE_ENTITY_TYPES = [
  'invoice_sale',
  'invoice_purchase',
  'quote',
  'delivery_note',
  'purchase_order',
  'payment',
  'receipt',
  'order',
  'price_request',
] as const;

export type SequenceEntityType = (typeof SEQUENCE_ENTITY_TYPES)[number];

export class CreateSequenceDto {
  @ApiProperty({ example: 'invoice_sale', enum: SEQUENCE_ENTITY_TYPES })
  @IsString()
  @IsIn(SEQUENCE_ENTITY_TYPES)
  entityType: string;

  @ApiProperty({ example: 'Factures de vente' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'FA' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  prefix?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  suffix?: string;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  numberLength?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  yearInFormat?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  monthInFormat?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  dayInFormat?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  trimesterInFormat?: boolean;

  @ApiPropertyOptional({ example: 'FA-YYYY-MM-XXXX' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  formatTemplate?: string;

  @ApiPropertyOptional({
    example: 'yearly',
    enum: ['never', 'daily', 'monthly', 'yearly'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['never', 'daily', 'monthly', 'yearly'])
  resetPeriod?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
