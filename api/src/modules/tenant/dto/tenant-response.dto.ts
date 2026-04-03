import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Tenant response — super-admin and tenant admin dashboard only.
 * Never exposes infrastructure secrets (databaseName, databaseHost, databasePort).
 */
export class TenantResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  slug: string;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  subscriptionPlan: string;

  @ApiProperty()
  @Expose()
  trialDays: number;

  @ApiPropertyOptional()
  @Expose()
  trialEndsAt: Date | null;

  @ApiPropertyOptional()
  @Expose()
  subscriptionEndsAt: Date | null;

  @ApiProperty()
  @Expose()
  autoRenew: boolean;

  @ApiPropertyOptional()
  @Expose()
  logoUrl: string | null;

  @ApiPropertyOptional()
  @Expose()
  primaryColor: string | null;

  @ApiPropertyOptional()
  @Expose()
  contactName: string | null;

  @ApiPropertyOptional()
  @Expose()
  contactEmail: string | null;

  @ApiPropertyOptional()
  @Expose()
  contactPhone: string | null;

  @ApiPropertyOptional()
  @Expose()
  address: string | null;

  @ApiProperty()
  @Expose()
  maxUsers: number;

  @ApiProperty()
  @Expose()
  maxProducts: number;

  @ApiProperty()
  @Expose()
  maxOrdersPerMonth: number;

  @ApiProperty()
  @Expose()
  maxStorageMb: number;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}
