import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
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

  @ApiProperty({
    required: false,
    description:
      'Token from a previous "remember this device" sign-in; skips the 2FA step while valid',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deviceToken?: string;
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

  @ApiProperty({
    required: false,
    description: 'Trust this browser for 30 days (no code at next sign-in)',
  })
  @IsOptional()
  @IsBoolean()
  rememberDevice?: boolean;
}

export class VerifyApiKeyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  apiKey: string;

  @ApiProperty({
    required: false,
    description:
      'Return a 30-day grant so this browser does not ask for the key again',
  })
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
