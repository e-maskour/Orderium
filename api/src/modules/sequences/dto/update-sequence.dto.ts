import { PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSequenceDto } from './create-sequence.dto';

export class UpdateSequenceDto extends PartialType(CreateSequenceDto) {
  @ApiPropertyOptional({
    description: 'Manually set the next counter value (admin reset)',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  nextNumber?: number;
}
