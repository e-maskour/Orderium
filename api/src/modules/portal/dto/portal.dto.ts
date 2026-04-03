import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Matches,
  MinLength,
  IsEmail,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ required: false, description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Phone number' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Invalid phone number format' })
  phoneNumber?: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @MinLength(4)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ description: 'Phone number' })
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Invalid phone number format' })
  phoneNumber: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @MinLength(4)
  password: string;

  @ApiProperty({ description: 'Full name (used to create customer record)' })
  @IsString()
  fullName: string;

  @ApiProperty({ required: false, description: 'Customer ID to link' })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiProperty({ required: false, description: 'Is customer account' })
  @IsOptional()
  @IsBoolean()
  isCustomer?: boolean;
}
