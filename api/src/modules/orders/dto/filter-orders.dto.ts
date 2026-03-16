import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FilterOrdersDto {
  @ApiProperty({
    required: false,
    description: 'Start date for filtering orders',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    required: false,
    description: 'End date for filtering orders',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    required: false,
    description: 'Delivery status filter',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  deliveryStatus?: string[];

  @ApiProperty({ required: false, description: 'Order number filter' })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiProperty({ required: false, description: 'Customer ID filter' })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiProperty({ required: false, description: 'Supplier ID filter' })
  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @ApiProperty({ required: false, description: 'Delivery person ID filter' })
  @IsOptional()
  @IsNumber()
  deliveryPersonId?: number;

  @ApiProperty({
    required: false,
    description: 'Filter by order source - client app or local',
  })
  @IsOptional()
  @IsBoolean()
  fromClient?: boolean;
}
