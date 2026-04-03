import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerSummaryDto, ProductSummaryDto } from '../../../common/dto/summary.dto';

/**
 * Nested invoice item — used inside InvoiceDetailResponseDto.
 */
export class InvoiceItemResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  invoiceId: number;

  @ApiPropertyOptional()
  @Expose()
  productId: number | null;

  @ApiProperty()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  quantity: number;

  @ApiProperty()
  @Expose()
  unitPrice: number;

  @ApiProperty()
  @Expose()
  tax: number;

  @ApiProperty()
  @Expose()
  discount: number;

  @ApiProperty()
  @Expose()
  discountType: number;

  @ApiProperty()
  @Expose()
  total: number;

  @ApiPropertyOptional({ type: ProductSummaryDto })
  @Expose()
  @Type(() => ProductSummaryDto)
  product: ProductSummaryDto | null;
}

/**
 * Invoice list response — used by POST /invoices/list.
 * No items array, no full nested partners.
 */
export class InvoiceListResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  documentNumber: string;

  @ApiProperty()
  @Expose()
  direction: string;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  date: Date;

  @ApiPropertyOptional()
  @Expose()
  dueDate: Date | null;

  @ApiPropertyOptional()
  @Expose()
  amountDueDate: Date | null;

  @ApiProperty()
  @Expose()
  subtotal: number;

  @ApiProperty()
  @Expose()
  tax: number;

  @ApiProperty()
  @Expose()
  discount: number;

  @ApiProperty()
  @Expose()
  discountType: number;

  @ApiProperty()
  @Expose()
  total: number;

  @ApiPropertyOptional()
  @Expose()
  customerId: number | null;

  @ApiPropertyOptional()
  @Expose()
  customerName: string | null;

  @ApiPropertyOptional()
  @Expose()
  customerPhone: string | null;

  @ApiPropertyOptional()
  @Expose()
  supplierId: number | null;

  @ApiPropertyOptional()
  @Expose()
  supplierName: string | null;

  @ApiProperty()
  @Expose()
  paidAmount: number;

  @ApiProperty()
  @Expose()
  remainingAmount: number;

  @ApiProperty()
  @Expose()
  isValidated: boolean;

  @ApiPropertyOptional()
  @Expose()
  validationDate: Date | null;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}

/**
 * Full invoice detail response — used by GET /invoices/:id.
 * Includes items and slim partner references.
 * shareToken is exposed for admin to forward the client-facing link.
 */
export class InvoiceDetailResponseDto extends InvoiceListResponseDto {
  @ApiPropertyOptional({ type: PartnerSummaryDto })
  @Expose()
  @Type(() => PartnerSummaryDto)
  customer: PartnerSummaryDto | null;

  @ApiPropertyOptional({ type: PartnerSummaryDto })
  @Expose()
  @Type(() => PartnerSummaryDto)
  supplier: PartnerSummaryDto | null;

  @ApiProperty({ type: [InvoiceItemResponseDto] })
  @Expose()
  @Type(() => InvoiceItemResponseDto)
  items: InvoiceItemResponseDto[];

  @ApiPropertyOptional()
  @Expose()
  notes: string | null;

  @ApiPropertyOptional()
  @Expose()
  pdfUrl: string | null;

  @ApiPropertyOptional()
  @Expose()
  shareToken: string | null;
}
