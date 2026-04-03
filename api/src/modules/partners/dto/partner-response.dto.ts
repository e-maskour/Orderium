import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerSummaryDto } from '../../../common/dto/summary.dto';

/**
 * Full partner response — admin/backoffice only.
 * Used on GET /partners and GET /partners/:id.
 */
export class PartnerResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  phoneNumber: string;

  @ApiPropertyOptional()
  @Expose()
  email: string | null;

  @ApiPropertyOptional()
  @Expose()
  address: string | null;

  @ApiPropertyOptional()
  @Expose()
  deliveryAddress: string | null;

  @ApiProperty()
  @Expose()
  isCompany: boolean;

  @ApiProperty()
  @Expose()
  isCustomer: boolean;

  @ApiProperty()
  @Expose()
  isSupplier: boolean;

  @ApiProperty()
  @Expose()
  isEnabled: boolean;

  @ApiPropertyOptional()
  @Expose()
  ice: string | null;

  /** Mapped from entity field `if` (reserved keyword) */
  @ApiPropertyOptional()
  @Expose({ name: 'if' })
  identifiantFiscal: string | null;

  @ApiPropertyOptional()
  @Expose()
  cnss: string | null;

  @ApiPropertyOptional()
  @Expose()
  rc: string | null;

  @ApiPropertyOptional()
  @Expose()
  patente: string | null;

  @ApiPropertyOptional()
  @Expose()
  tvaNumber: string | null;

  @ApiPropertyOptional()
  @Expose()
  latitude: number | null;

  @ApiPropertyOptional()
  @Expose()
  longitude: number | null;

  @ApiPropertyOptional()
  @Expose()
  googleMapsUrl: string | null;

  @ApiPropertyOptional()
  @Expose()
  wazeUrl: string | null;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}
