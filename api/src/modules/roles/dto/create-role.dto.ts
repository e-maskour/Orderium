import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Sales Manager' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Registry category used to group this role in the UI',
    example: 'sales',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Array of permission IDs',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  permissionIds?: number[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Permission keys such as "invoices.create". Takes precedence over permissionIds — the role matrix uses this form.',
    example: ['invoices.view', 'invoices.create'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[];

  @ApiPropertyOptional({
    type: [Number],
    description:
      'Roles whose permissions this role also grants (Odoo `implied_ids`)',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  impliedRoleIds?: number[];
}
