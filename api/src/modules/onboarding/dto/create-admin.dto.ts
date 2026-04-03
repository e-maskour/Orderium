import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ example: 'Ahmed Benali' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: 'ahmed@acme.ma' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+212600000000' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @ApiProperty({ required: false, description: 'Base64 profile photo' })
  @IsString()
  @IsOptional()
  profilePhoto?: string;
}
