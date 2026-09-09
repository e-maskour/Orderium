import { IsInt, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePrintAgentDto {
  @ApiProperty({ example: 'Caisse principale' })
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiProperty({
    description: 'The shop this agent serves. It receives only this warehouse’s jobs.',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  warehouseId: number;
}
