import { IsNumber, IsString, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';
import { PaymentType } from './payment.entity';

export class CreatePaymentDto {
  @IsNumber()
  invoiceId: number;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  paymentDate: string;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;
}
