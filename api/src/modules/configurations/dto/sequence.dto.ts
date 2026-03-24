import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSequenceDto {
  @ApiProperty({ description: 'Entity type for the sequence' })
  @IsString()
  @IsIn([
    'invoice_sale',
    'invoice_purchase',
    'quote',
    'delivery_note',
    'purchase_order',
    'payment',
  ])
  entityType: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  suffix?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  numberLength?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  yearInPrefix?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  monthInPrefix?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  dayInPrefix?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  trimesterInPrefix?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSequenceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsIn([
    'invoice_sale',
    'invoice_purchase',
    'quote',
    'delivery_note',
    'purchase_order',
    'payment',
  ])
  entityType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  suffix?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  numberLength?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  yearInPrefix?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  monthInPrefix?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  dayInPrefix?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  trimesterInPrefix?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SequencePreviewDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsIn([
    'invoice_sale',
    'invoice_purchase',
    'quote',
    'delivery_note',
    'purchase_order',
    'payment',
  ])
  entityType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  suffix?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  numberLength?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  yearInPrefix?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  monthInPrefix?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  dayInPrefix?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  trimesterInPrefix?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  nextNumber?: number;
}
