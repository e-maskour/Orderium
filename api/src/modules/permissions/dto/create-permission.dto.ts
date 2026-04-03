import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ example: 'invoices.create' })
  @IsString()
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: 'Create Invoices' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'invoices' })
  @IsString()
  @MaxLength(100)
  module: string;

  @ApiProperty({ example: 'create' })
  @IsString()
  @MaxLength(50)
  action: string;
}
