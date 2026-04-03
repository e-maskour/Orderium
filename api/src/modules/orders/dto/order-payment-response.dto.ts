import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerSummaryDto } from '../../../common/dto/summary.dto';

/**
 * Order payment response — admin/backoffice (GET /orders/:id/payments).
 */
export class OrderPaymentResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  orderId: number;

  @ApiPropertyOptional()
  @Expose()
  customerId: number | null;

  @ApiProperty()
  @Expose()
  amount: number;

  @ApiProperty()
  @Expose()
  paymentDate: string;

  @ApiProperty()
  @Expose()
  paymentType: string;

  @ApiPropertyOptional()
  @Expose()
  notes: string | null;

  @ApiPropertyOptional()
  @Expose()
  referenceNumber: string | null;

  @ApiPropertyOptional({ type: PartnerSummaryDto })
  @Expose()
  @Type(() => PartnerSummaryDto)
  customer: PartnerSummaryDto | null;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}
