import { IsString, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConfigurationDto {
  @ApiProperty({ example: 'taxes', description: 'Configuration entity name' })
  @IsString()
  @IsNotEmpty()
  entity: string;

  @ApiProperty({
    example: {
      defaultRate: 20,
      rates: [
        { name: 'Standard', rate: 20, isDefault: true },
        { name: 'Reduced', rate: 10, isDefault: false },
        { name: 'Zero', rate: 0, isDefault: false },
      ],
    },
    description: 'Configuration values as JSON object',
  })
  @IsObject()
  @IsNotEmpty()
  values: any;
}
