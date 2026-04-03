import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Delivery person response — admin/backoffice (GET /delivery/persons).
 * Never exposes the password field.
 */
export class DeliveryPersonResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  email: string | null;

  @ApiPropertyOptional()
  @Expose()
  phoneNumber: string | null;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}

/**
 * Delivery assignment response for admin view (GET /delivery/orders).
 * Shows assignment status and timestamps without full order details.
 */
export class OrderDeliveryAdminResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  orderId: number;

  @ApiPropertyOptional()
  @Expose()
  deliveryPersonId: number | null;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiPropertyOptional()
  @Expose()
  notes: string | null;

  @ApiPropertyOptional()
  @Expose()
  pendingAt: Date | null;

  @ApiPropertyOptional()
  @Expose()
  assignedAt: Date | null;

  @ApiPropertyOptional()
  @Expose()
  confirmedAt: Date | null;

  @ApiPropertyOptional()
  @Expose()
  pickedUpAt: Date | null;

  @ApiPropertyOptional()
  @Expose()
  toDeliveryAt: Date | null;

  @ApiPropertyOptional()
  @Expose()
  inDeliveryAt: Date | null;

  @ApiPropertyOptional()
  @Expose()
  deliveredAt: Date | null;

  @ApiPropertyOptional()
  @Expose()
  canceledAt: Date | null;

  @ApiProperty()
  @Expose()
  dateCreated: Date;
}
