import { IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DocumentType } from '../entities/printer.entity';

const DOC_TYPES: DocumentType[] = [
  'receipt',
  'bl',
  'devis',
  'bon_commande',
  'pos',
  'stock',
];

export class CreatePrintJobDto {
  @ApiProperty({ enum: DOC_TYPES, example: 'receipt' })
  @IsIn(DOC_TYPES)
  documentType: DocumentType;

  @ApiProperty({ description: 'Integer id of the source document', example: 42 })
  @IsInt()
  @Type(() => Number)
  documentRef: number;

  @ApiPropertyOptional({
    description: 'Target printer. If omitted, warehouseId selects the default.',
  })
  @IsOptional()
  @IsUUID()
  printerId?: string;

  @ApiPropertyOptional({
    description: 'Shop to print in. Required when printerId is omitted.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  warehouseId?: number;

  @ApiPropertyOptional({
    description:
      'Set by an explicit Reprint action to produce a fresh idempotency key.',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  reprintSeq?: number;
}
