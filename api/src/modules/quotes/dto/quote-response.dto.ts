import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerSummaryDto, ProductSummaryDto } from '../../../common/dto/summary.dto';

/**
 * Nested quote item — used inside QuoteDetailResponseDto.
 */
export class QuoteItemResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  quoteId: number;

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
 * Quote list response — used by POST /quotes/list.
 * No items array, no full nested partners.
 */
export class QuoteListResponseDto {
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
  expirationDate: Date | null;

  @ApiPropertyOptional()
  @Expose()
  dueDate: Date | null;

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
 * Full quote detail response — used by GET /quotes/:id.
 * Includes items, signing metadata, and share token for admin portal.
 */
export class QuoteDetailResponseDto extends QuoteListResponseDto {
  @ApiPropertyOptional({ type: PartnerSummaryDto })
  @Expose()
  @Type(() => PartnerSummaryDto)
  customer: PartnerSummaryDto | null;

  @ApiPropertyOptional({ type: PartnerSummaryDto })
  @Expose()
  @Type(() => PartnerSummaryDto)
  supplier: PartnerSummaryDto | null;

  @ApiProperty({ type: [QuoteItemResponseDto] })
  @Expose()
  @Type(() => QuoteItemResponseDto)
  items: QuoteItemResponseDto[];

  @ApiPropertyOptional()
  @Expose()
  notes: string | null;

  @ApiPropertyOptional()
  @Expose()
  pdfUrl: string | null;

  @ApiPropertyOptional()
  @Expose()
  shareToken: string | null;

  @ApiPropertyOptional()
  @Expose()
  signedBy: string | null;

  @ApiPropertyOptional()
  @Expose()
  signedDate: Date | null;

  @ApiPropertyOptional()
  @Expose()
  clientNotes: string | null;

  @ApiPropertyOptional()
  @Expose()
  convertedToInvoiceId: number | null;

  @ApiPropertyOptional()
  @Expose()
  convertedToOrderId: number | null;
}
