import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { LEAD_CHANNELS, type LeadChannel } from '../entities/lead.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Public payload sent by the landing page contact form. */
export class CreateLeadDto {
  @ApiProperty({ example: 'Youssef Alaoui' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Épicerie Al Amal' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @ApiProperty({ example: '06 61 23 45 67' })
  @Transform(trim)
  @IsString()
  @Matches(/^(?=(?:\D*\d){9,15}\D*$)[\d\s()+.-]+$/, {
    message: 'phone must contain 9 to 15 digits',
  })
  phone: string;

  @ApiPropertyOptional({ example: 'contact@example.ma' })
  @Transform(trim)
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'Distribution' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  activity?: string;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ enum: ['fr', 'ar'] })
  @IsOptional()
  @IsIn(['fr', 'ar'])
  locale?: string;

  @ApiPropertyOptional({ enum: LEAD_CHANNELS })
  @IsOptional()
  @IsIn(LEAD_CHANNELS as unknown as string[])
  channel?: LeadChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmMedium?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  utmCampaign?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  utmTerm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  utmContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  landingPath?: string;

  /** Honeypot: hidden from people, filled by bots. Must stay empty. */
  @ApiPropertyOptional({ description: 'Leave empty (anti-spam)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
