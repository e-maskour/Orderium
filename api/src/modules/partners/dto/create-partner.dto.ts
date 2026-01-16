import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePartnerDto {
  @ApiProperty({ description: 'Partner name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Phone number', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'ICE number (Moroccan business ID)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ice?: string;

  @ApiPropertyOptional({ description: 'IF number (Tax ID)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  if?: string;

  @ApiPropertyOptional({ description: 'CNSS number (Social security)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cnss?: string;

  @ApiPropertyOptional({ description: 'RC number (Commercial register)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rc?: string;

  @ApiPropertyOptional({ description: 'Patente number (Business license)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  patente?: string;

  @ApiPropertyOptional({ description: 'TVA number (VAT number)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tvaNumber?: string;

  @ApiPropertyOptional({ description: 'Delivery address' })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Is company?', default: false })
  @IsOptional()
  @IsBoolean()
  isCompany?: boolean;

  @ApiPropertyOptional({ description: 'Latitude coordinate' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude coordinate' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Google Maps URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  googleMapsUrl?: string;

  @ApiPropertyOptional({ description: 'Waze URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  wazeUrl?: string;

  @ApiPropertyOptional({ description: 'Is partner enabled?', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Is customer?', default: true })
  @IsOptional()
  @IsBoolean()
  isCustomer?: boolean;

  @ApiPropertyOptional({ description: 'Is supplier?', default: false })
  @IsOptional()
  @IsBoolean()
  isSupplier?: boolean;
}
