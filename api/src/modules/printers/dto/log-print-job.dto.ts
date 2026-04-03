import { IsString, IsUUID, IsOptional, IsInt, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LogPrintJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  printerId?: string;

  @ApiProperty({ example: 'receipt' })
  @IsString()
  documentType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiPropertyOptional({
    enum: ['epson-epos', 'star-webprnt', 'qztray', 'browser'],
  })
  @IsOptional()
  @IsEnum(['epson-epos', 'star-webprnt', 'qztray', 'browser'])
  method?: string;

  @ApiProperty({ enum: ['success', 'failed', 'fallback'] })
  @IsEnum(['success', 'failed', 'fallback'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  durationMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
