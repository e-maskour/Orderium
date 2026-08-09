import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CellAlign, CellFormat } from '../../../pdf-report';

/**
 * Cell formatters supported by the PDF table renderer.
 *
 * Declared as a const tuple rather than a TS enum so the DTO's types *are* the
 * engine's `CellFormat` union — no mapping layer between the wire format and
 * the renderer.
 */
export const PDF_CELL_FORMATS = [
  'text',
  'number',
  'integer',
  'currency',
  'percent',
  'date',
  'datetime',
] as const satisfies readonly CellFormat[];

export const PDF_CELL_ALIGNS = [
  'left',
  'center',
  'right',
] as const satisfies readonly CellAlign[];

/** Upper bounds — a report spec is client-supplied and must stay bounded. */
const MAX_COLUMNS = 40;
const MAX_KPIS = 12;
const MAX_META = 12;
const MAX_LABEL = 120;

export class ReportPdfColumnDto {
  @ApiProperty({ description: 'Key looked up on each data row' })
  @IsString()
  @MaxLength(80)
  key: string;

  @ApiProperty({ description: 'Translated column header' })
  @IsString()
  @MaxLength(MAX_LABEL)
  header: string;

  @ApiPropertyOptional({ enum: PDF_CELL_FORMATS })
  @IsOptional()
  @IsIn(PDF_CELL_FORMATS)
  format?: CellFormat;

  @ApiPropertyOptional({ enum: PDF_CELL_ALIGNS })
  @IsOptional()
  @IsIn(PDF_CELL_ALIGNS)
  align?: CellAlign;

  @ApiPropertyOptional({ description: 'CSS width, e.g. "16%"' })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  width?: string;

  @ApiPropertyOptional({ description: 'Render the column in a heavier weight' })
  @IsOptional()
  @IsBoolean()
  emphasis?: boolean;

  @ApiPropertyOptional({ description: 'Colour negative values' })
  @IsOptional()
  @IsBoolean()
  signed?: boolean;

  @ApiPropertyOptional({ description: 'Sum this column into a totals row' })
  @IsOptional()
  @IsBoolean()
  total?: boolean;

  @ApiPropertyOptional({
    description:
      'Map of raw value → badge tone (neutral/positive/negative/warning/info)',
  })
  @IsOptional()
  @IsObject()
  badgeMap?: Record<string, string>;
}

export class ReportPdfKpiDto {
  @ApiProperty({ description: "Key inside the report's kpis object" })
  @IsString()
  @MaxLength(80)
  key: string;

  @ApiProperty({ description: 'Translated KPI label' })
  @IsString()
  @MaxLength(MAX_LABEL)
  label: string;

  @ApiPropertyOptional({ enum: PDF_CELL_FORMATS })
  @IsOptional()
  @IsIn(PDF_CELL_FORMATS)
  format?: CellFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LABEL)
  hint?: string;
}

export class ReportPdfMetaDto {
  @ApiProperty()
  @IsString()
  @MaxLength(MAX_LABEL)
  label: string;

  @ApiProperty()
  @IsString()
  @MaxLength(MAX_LABEL)
  value: string;
}

/**
 * Presentation spec for a report PDF.
 *
 * The client sends *how* to present the report (translated title, column order,
 * number formats); the server supplies *what* to present by re-running the
 * report query. No figure in the resulting PDF comes from this payload.
 */
export class GenerateReportPdfDto {
  @ApiProperty({ description: 'Translated report title' })
  @IsString()
  @MaxLength(MAX_LABEL)
  title: string;

  @ApiPropertyOptional({ description: 'Translated sub-title' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @ApiPropertyOptional({ description: 'Heading for the table section' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LABEL)
  tableTitle?: string;

  @ApiProperty({ type: [ReportPdfColumnDto] })
  @IsArray()
  @ArrayMaxSize(MAX_COLUMNS)
  @ValidateNested({ each: true })
  @Type(() => ReportPdfColumnDto)
  columns: ReportPdfColumnDto[];

  @ApiPropertyOptional({ type: [ReportPdfKpiDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_KPIS)
  @ValidateNested({ each: true })
  @Type(() => ReportPdfKpiDto)
  kpis?: ReportPdfKpiDto[];

  @ApiPropertyOptional({
    type: [ReportPdfMetaDto],
    description: 'Criteria chips printed under the title',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_META)
  @ValidateNested({ each: true })
  @Type(() => ReportPdfMetaDto)
  meta?: ReportPdfMetaDto[];

  @ApiPropertyOptional({
    description: 'Message shown when the report is empty',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  emptyMessage?: string;

  @ApiPropertyOptional({ description: 'Landscape orientation for wide tables' })
  @IsOptional()
  @IsBoolean()
  landscape?: boolean;

  @ApiPropertyOptional({
    description: 'Confidentiality line in the page footer',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  footerNote?: string;

  @ApiPropertyOptional({ description: 'Download file name, without extension' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fileName?: string;

  @ApiPropertyOptional({ description: 'BCP-47 locale, e.g. fr-MA or ar-MA' })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  locale?: string;
}
