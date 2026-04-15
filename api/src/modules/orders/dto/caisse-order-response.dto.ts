import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CaisseOrderResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiPropertyOptional()
  @Expose()
  orderNumber: string | null;

  @ApiPropertyOptional()
  @Expose()
  customerName: string | null;

  @ApiPropertyOptional()
  @Expose()
  customerId: number | null;

  @ApiProperty()
  @Expose()
  total: number;

  @ApiProperty()
  @Expose()
  paidAmount: number;

  @ApiProperty()
  @Expose()
  remainingAmount: number;

  @ApiProperty()
  @Expose()
  paymentStatus: 'paid' | 'partial' | 'unpaid';

  @ApiPropertyOptional()
  @Expose()
  date: string;

  @ApiProperty()
  @Expose()
  dateCreated: Date;
}
