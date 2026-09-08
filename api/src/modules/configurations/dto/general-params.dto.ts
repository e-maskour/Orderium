import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import {
  TENANT_LANGUAGES,
  type TenantLanguage,
} from '../general-params.constants';

export class GeneralParamsDto {
  @ApiPropertyOptional({
    description:
      'Enable the on-screen virtual keyboard and its floating toggle button',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  keyboardEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Language the backoffice starts in until a user picks one explicitly',
    enum: TENANT_LANGUAGES,
    default: 'ar',
  })
  @IsOptional()
  @IsIn(TENANT_LANGUAGES as readonly string[])
  defaultLanguage?: TenantLanguage;
}
