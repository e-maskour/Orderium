import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleSummaryDto } from '../../../common/dto/summary.dto';

/**
 * Portal profile response — returned after login and from GET /portal/me.
 * Never exposes password. Used by client portal and delivery portal.
 */
export class PortalProfileResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiPropertyOptional()
  @Expose()
  name: string | null;

  @ApiProperty()
  @Expose()
  phoneNumber: string;

  @ApiPropertyOptional()
  @Expose()
  email: string | null;

  @ApiProperty()
  @Expose()
  isAdmin: boolean;

  @ApiProperty()
  @Expose()
  isCustomer: boolean;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  userType: string;

  @ApiPropertyOptional()
  @Expose()
  avatarUrl: string | null;

  @ApiPropertyOptional()
  @Expose()
  customerId: number | null;

  @ApiPropertyOptional({ type: RoleSummaryDto })
  @Expose()
  @Type(() => RoleSummaryDto)
  role: RoleSummaryDto | null;
}
