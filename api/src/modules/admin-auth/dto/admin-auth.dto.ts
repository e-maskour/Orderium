import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type { TwoFactorMethod } from '../entities/platform-admin.entity';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password: string;
}

export class ChallengeDto {
  @ApiProperty({ description: 'Token returned by the previous sign-in step' })
  @IsString()
  @IsNotEmpty()
  challengeToken: string;
}

export class SetupTwoFactorDto extends ChallengeDto {
  @ApiProperty({ enum: ['totp', 'email'] })
  @IsIn(['totp', 'email'])
  method: TwoFactorMethod;
}

export class VerifyCodeDto extends ChallengeDto {
  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

export class VerifyApiKeyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  apiKey: string;
}
