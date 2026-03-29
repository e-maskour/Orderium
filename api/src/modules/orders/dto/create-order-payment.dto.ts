import {
    IsNumber,
    IsString,
    IsEnum,
    IsOptional,
    IsDateString,
    Min,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderPaymentType } from '../entities/order-payment.entity';

export class CreateOrderPaymentDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    orderId: number;

    @ApiPropertyOptional({ example: 5 })
    @IsOptional()
    @IsNumber()
    customerId?: number;

    @ApiProperty({ example: 500.0 })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({ example: '2026-03-29' })
    @IsDateString()
    paymentDate: string;

    @ApiProperty({ enum: OrderPaymentType, default: OrderPaymentType.CASH })
    @IsEnum(OrderPaymentType)
    paymentType: OrderPaymentType;

    @ApiPropertyOptional({ example: 'Paiement partiel' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ example: 'CHQ-001' })
    @IsOptional()
    @IsString()
    referenceNumber?: string;
}

export class UpdateOrderPaymentDto extends PartialType(CreateOrderPaymentDto) { }
