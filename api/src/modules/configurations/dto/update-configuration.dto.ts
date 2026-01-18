import { IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfigurationDto {
  @ApiProperty({ example: 'taxes', required: false })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiProperty({
    example: {
      defaultRate: 20,
      rates: [
        { name: 'Standard', rate: 20, isDefault: true },
        { name: 'Reduced', rate: 10, isDefault: false },
      ],
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  values?: any;
}
