import { IsString, IsOptional, IsNumber, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompanyDto {
  // Basic Company Information
  @ApiProperty({ description: 'Company name', example: 'ORDERIUM SARL' })
  @IsString()
  companyName: string;

  @ApiProperty({ description: 'Company address', example: '123 Avenue Mohammed V', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'Zip code', example: '20000', required: false })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiProperty({ description: 'City', example: 'Casablanca', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'Country', example: 'Maroc', default: 'Maroc', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ description: 'State/Province', example: 'Casablanca-Settat', required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ description: 'Phone number', example: '+212 5XX-XXXXXX', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Fax number', example: '+212 5XX-XXXXXX', required: false })
  @IsString()
  @IsOptional()
  fax?: string;

  @ApiProperty({ description: 'Email address', example: 'contact@orderium.ma', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Website URL', example: 'https://www.orderium.ma', required: false })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ description: 'Company logo URL or base64', required: false })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty({ description: 'Professions or keywords', example: 'Distribution, Vente en gros', required: false })
  @IsString()
  @IsOptional()
  professions?: string;

  // Legal & Administrative Information
  @ApiProperty({ description: 'VAT Number (TVA)', example: 'MA12345678', required: false })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiProperty({ description: 'ICE (Identifiant Commun de l\'Entreprise)', example: '000000000000000', required: false })
  @IsString()
  @IsOptional()
  ice?: string;

  @ApiProperty({ description: 'Tax ID (IF - Identifiant Fiscal)', example: '12345678', required: false })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({ description: 'Company Registration Number (RC)', example: 'RC123456', required: false })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiProperty({ description: 'Legal structure', example: 'SARL', required: false })
  @IsString()
  @IsOptional()
  legalStructure?: string;

  @ApiProperty({ description: 'Capital in MAD', example: 100000, required: false })
  @IsNumber()
  @IsOptional()
  capital?: number;

  @ApiProperty({ description: 'Fiscal year start month (1-12)', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  fiscalYearStartMonth?: number;
}

export class UpdateCompanyDto {
  @ApiProperty({ type: CompanyDto })
  values: CompanyDto;
}
