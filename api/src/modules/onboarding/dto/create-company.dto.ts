import {
    IsString,
    IsOptional,
    IsNumber,
    IsEmail,
    Min,
    Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCompanyDto {
    @ApiProperty({ example: 'Acme SARL' })
    @IsString()
    companyName: string;

    @ApiProperty({ required: false, example: 'Distribution, Commerce' })
    @IsString()
    @IsOptional()
    professions?: string;

    @ApiProperty({ required: false, description: 'Base64 encoded logo or URL' })
    @IsString()
    @IsOptional()
    logo?: string;

    @ApiProperty({ required: false, example: '+212 6XX-XXXXXX' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ required: false, example: 'contact@acme.ma' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    fax?: string;

    @ApiProperty({ required: false, example: 'https://acme.ma' })
    @IsString()
    @IsOptional()
    website?: string;

    @ApiProperty({ required: false, example: '123 Avenue Hassan II' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ required: false, example: '20000' })
    @IsString()
    @IsOptional()
    zipCode?: string;

    @ApiProperty({ required: false, example: 'Casablanca' })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiProperty({ required: false, example: 'Casablanca-Settat' })
    @IsString()
    @IsOptional()
    state?: string;

    @ApiProperty({ required: false, example: 'Maroc', default: 'Maroc' })
    @IsString()
    @IsOptional()
    country?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    vatNumber?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    ice?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    taxId?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    registrationNumber?: string;

    @ApiProperty({ required: false, example: 'SARL' })
    @IsString()
    @IsOptional()
    legalStructure?: string;

    @ApiProperty({ required: false, example: 100000 })
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : undefined))
    capital?: number;

    @ApiProperty({ required: false, example: 1, description: 'Month 1-12' })
    @IsNumber()
    @Min(1)
    @Max(12)
    @IsOptional()
    @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : undefined))
    fiscalYearStartMonth?: number;
}
