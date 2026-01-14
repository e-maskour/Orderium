import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Phone number', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

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

  @ApiPropertyOptional({ description: 'Is customer enabled?', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
