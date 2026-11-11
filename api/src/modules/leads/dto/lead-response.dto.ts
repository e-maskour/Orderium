import { ApiProperty } from '@nestjs/swagger';
import { LEAD_STATUSES, type LeadStatus } from '../entities/lead.entity';

/** Public answer to the landing form: nothing about other leads leaks. */
export class LeadReceivedDto {
  @ApiProperty() received: true;
}

export class LeadListDto {
  @ApiProperty({ description: 'Leads on this page (newest first)' })
  items: unknown[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;

  @ApiProperty({
    description: 'Lead count per status, for the filter chips',
    example: Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])),
  })
  counts: Record<LeadStatus, number>;
}
