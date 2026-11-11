import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { LEAD_STATUSES, type LeadStatus } from '../entities/lead.entity';

/** Super-admin follow-up on a lead. */
export class UpdateLeadDto {
  @ApiPropertyOptional({ enum: LEAD_STATUSES })
  @IsOptional()
  @IsIn(LEAD_STATUSES as unknown as string[])
  status?: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
