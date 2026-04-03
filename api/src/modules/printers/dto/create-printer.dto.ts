import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIP,
  IsArray,
  ArrayNotEmpty,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  PrinterBrand,
  ConnectionType,
  PaperWidth,
  DocumentType,
} from '../entities/printer.entity';

const BRANDS: PrinterBrand[] = [
  'epson',
  'star',
  'generic',
  'qztray',
  'browser',
];
const CONN: ConnectionType[] = ['wifi', 'usb', 'network', 'browser'];
const WIDTHS: PaperWidth[] = [58, 80, 210];
const DOC_TYPES: DocumentType[] = [
  'receipt',
  'bl',
  'devis',
  'bon_commande',
  'pos',
  'stock',
];

export class CreatePrinterDto {
  @ApiProperty({ example: 'Caisse principale' })
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiProperty({ enum: BRANDS, example: 'epson' })
  @IsEnum(BRANDS)
  brand: PrinterBrand;

  @ApiProperty({ enum: CONN, example: 'wifi' })
  @IsEnum(CONN)
  connectionType: ConnectionType;

  @ApiPropertyOptional({ example: 'TM-T20III' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  model?: string;

  @ApiPropertyOptional({ example: '192.168.1.100' })
  @IsOptional()
  @IsIP()
  ip?: string;

  @ApiPropertyOptional({ example: 8008 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiProperty({ enum: WIDTHS, example: 80 })
  @IsEnum(WIDTHS)
  @Type(() => Number)
  paperWidth: PaperWidth;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ enum: DOC_TYPES, isArray: true, example: ['receipt', 'bl'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(DOC_TYPES, { each: true })
  documentTypes: DocumentType[];
}
