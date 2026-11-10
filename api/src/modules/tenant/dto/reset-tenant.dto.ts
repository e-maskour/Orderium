import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetTenantDto {
  @ApiProperty({ example: 'RESET', description: 'Must be exactly "RESET"' })
  @IsString()
  confirmation: string;

  @ApiProperty({
    description:
      "Signed-in admin's account password, re-entered to authorise the reset",
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
