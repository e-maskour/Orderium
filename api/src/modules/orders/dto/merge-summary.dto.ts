import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/** Maximum number of orders that can be consolidated in a single recap. */
export const MERGE_SUMMARY_MAX_ORDERS = 100;

export class MergeSummaryDto {
  @ApiProperty({
    description: 'Ids of the orders to consolidate',
    type: [Number],
    minItems: 2,
    maxItems: MERGE_SUMMARY_MAX_ORDERS,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(MERGE_SUMMARY_MAX_ORDERS)
  @IsInt({ each: true })
  @Type(() => Number)
  ids: number[];
}

export class MergeSummaryItemDto {
  @ApiProperty()
  description: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  total: number;
}

export class MergeSummaryOrderDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty()
  partnerName: string;

  @ApiProperty()
  total: number;

  @ApiProperty({ type: [MergeSummaryItemDto] })
  items: MergeSummaryItemDto[];
}

export class OrdersMergeSummaryDto {
  @ApiProperty({ type: [MergeSummaryOrderDto] })
  orders: MergeSummaryOrderDto[];

  @ApiProperty()
  orderCount: number;

  @ApiProperty()
  grandTotal: number;

  @ApiProperty()
  totalQuantity: number;

  @ApiProperty({
    type: [Number],
    description: 'Requested ids that no longer exist',
  })
  missingIds: number[];
}
