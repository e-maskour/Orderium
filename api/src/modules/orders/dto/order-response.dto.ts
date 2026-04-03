import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PartnerSummaryDto,
  ProductSummaryDto,
} from '../../../common/dto/summary.dto';

/**
 * Nested order item — used inside OrderDetailResponseDto.
 * Slim: product relation serialized through ProductSummaryDto.
 */
export class OrderItemResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  orderId: number;

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
 * Order list response — used by POST /orders/filter (admin + portal list views).
 * No items, no full nested relations — just the fields list views render.
 */
export class OrderListResponseDto {
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

  @ApiPropertyOptional()
  @Expose()
  deliveryStatus: string | null;

  @ApiProperty()
  @Expose()
  date: Date;

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
  originType: string;

  @ApiProperty()
  @Expose()
  isValidated: boolean;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}

/**
 * Full order detail response — used by GET /orders/:id.
 * Includes nested items with slim product references.
 */
export class OrderDetailResponseDto extends OrderListResponseDto {
  @ApiPropertyOptional({ type: PartnerSummaryDto })
  @Expose()
  @Type(() => PartnerSummaryDto)
  customer: PartnerSummaryDto | null;

  @ApiPropertyOptional({ type: PartnerSummaryDto })
  @Expose()
  @Type(() => PartnerSummaryDto)
  supplier: PartnerSummaryDto | null;

  @ApiProperty({ type: [OrderItemResponseDto] })
  @Expose()
  @Type(() => OrderItemResponseDto)
  items: OrderItemResponseDto[];

  @ApiPropertyOptional()
  @Expose()
  validationDate: Date | null;

  @ApiPropertyOptional()
  @Expose()
  dueDate: Date | null;

  @ApiPropertyOptional()
  @Expose()
  amountDueDate: Date | null;

  @ApiPropertyOptional()
  @Expose()
  notes: string | null;

  @ApiPropertyOptional()
  @Expose()
  pdfUrl: string | null;

  @ApiPropertyOptional()
  @Expose()
  receiptNumber: string | null;

  @ApiPropertyOptional()
  @Expose()
  pendingAt: Date | null;

  @ApiPropertyOptional()
  @Expose()
  canceledAt: Date | null;
}

/**
 * Nested order item for portal/client — minimal fields for client order view.
 */
export class OrderClientItemResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

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
  total: number;

  @ApiPropertyOptional({ type: ProductSummaryDto })
  @Expose()
  @Type(() => ProductSummaryDto)
  product: ProductSummaryDto | null;
}

/**
 * Client portal order response — only what the client needs to display their orders.
 * No pricing internals, no supplier/payment fields.
 */
export class OrderClientResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  documentNumber: string;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  date: Date;

  @ApiProperty()
  @Expose()
  total: number;

  @ApiPropertyOptional()
  @Expose()
  customerName: string | null;

  @ApiProperty({ type: [OrderClientItemResponseDto] })
  @Expose()
  @Type(() => OrderClientItemResponseDto)
  items: OrderClientItemResponseDto[];
}
