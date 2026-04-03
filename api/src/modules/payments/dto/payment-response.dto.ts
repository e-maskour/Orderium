import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerSummaryDto } from '../../../common/dto/summary.dto';

/**
 * Payment response — admin/backoffice only (GET /payments, GET /payments/:id).
 * Invoice payments linked to invoices.
 */
export class PaymentResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiPropertyOptional()
  @Expose()
  invoiceId: number | null;

  @ApiPropertyOptional()
  @Expose()
  customerId: number | null;

  @ApiPropertyOptional()
  @Expose()
  supplierId: number | null;

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

  @ApiPropertyOptional({ type: PartnerSummaryDto })
  @Expose()
  @Type(() => PartnerSummaryDto)
  supplier: PartnerSummaryDto | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
