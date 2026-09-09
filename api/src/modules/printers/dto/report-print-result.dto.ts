import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportPrintResultDto {
  @ApiProperty({ enum: ['done', 'failed'], example: 'done' })
  @IsIn(['done', 'failed'])
  status: 'done' | 'failed';

  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(0)
  durationMs: number;

  @ApiPropertyOptional({ example: 'Printer out of paper' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  error?: string;
}
