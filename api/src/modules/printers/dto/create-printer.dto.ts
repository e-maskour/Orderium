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
  PrinterKind,
} from '../entities/printer.entity';

const BRANDS: PrinterBrand[] = ['epson', 'star', 'generic'];
const CONN: ConnectionType[] = ['network', 'usb', 'system'];
const KINDS: PrinterKind[] = ['thermal', 'document'];
const WIDTHS: PaperWidth[] = [80, 148];
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

  @ApiProperty({ enum: CONN, example: 'network' })
  @IsEnum(CONN)
  connectionType: ConnectionType;

  @ApiProperty({
    description: 'Which shop this printer stands in. Jobs route by warehouse.',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  warehouseId: number;

  @ApiProperty({
    enum: KINDS,
    example: 'thermal',
    description:
      'thermal speaks ESC/POS; document takes a PDF via the OS spooler',
  })
  @IsEnum(KINDS)
  kind: PrinterKind;

  @ApiPropertyOptional({
    description: 'OS spooler queue name, for usb/system devices',
    example: 'EPSON TM-T20III Receipt',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  systemName?: string;

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
