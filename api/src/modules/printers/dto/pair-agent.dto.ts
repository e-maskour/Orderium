import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PairAgentDto {
  @ApiProperty({
    description: 'The pairing string shown in the backoffice, `<tenantSlug>-<code>`',
    example: 'acme-4F7K2Q9X',
  })
  @IsString()
  @MaxLength(40)
  pairingCode: string;
}
