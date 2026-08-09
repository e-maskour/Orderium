import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class RunSeederDto {
  @ApiPropertyOptional({
    description:
      'Values for the options this seeder declares. Never logged — only the ' +
      'option names are recorded in the audit trail.',
    example: { backfillAdministrators: true },
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

export class RunPendingSeedersDto {
  @ApiPropertyOptional({
    description:
      'Options per seeder key. A privileged seeder runs in this bulk operation ' +
      'only when its key appears here.',
    example: { portal: { name: 'admin', password: '••••••••••••' } },
  })
  @IsOptional()
  @IsObject()
  optionsByKey?: Record<string, Record<string, unknown>>;
}

export class SeederLogsFilterDto {
  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seederKey?: string;

  @ApiPropertyOptional({ enum: ['success', 'failed'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}
