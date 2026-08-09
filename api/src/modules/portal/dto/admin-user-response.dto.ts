import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Portal } from '../entities/portal.entity';

/**
 * Portal user as returned by the admin listing (GET /portal/admin/users).
 * Built through `fromEntity` so the password hash can never leak, whatever
 * the repository happens to select.
 */
export class AdminUserResponseDto {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional()
  name: string | null;

  @ApiProperty()
  phoneNumber: string;

  @ApiPropertyOptional()
  email: string | null;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
  status: 'pending' | 'approved' | 'rejected';

  @ApiProperty({ enum: ['admin', 'client'] })
  userType: 'admin' | 'client';

  @ApiProperty()
  isAdmin: boolean;

  @ApiProperty()
  isCustomer: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  customerId: number | null;

  @ApiPropertyOptional()
  customerName: string | null;

  @ApiPropertyOptional()
  avatarUrl: string | null;

  @ApiProperty()
  dateCreated: Date;

  @ApiProperty()
  dateUpdated: Date;

  static fromEntity(user: Portal): AdminUserResponseDto {
    return {
      id: user.id,
      name: user.name ?? null,
      phoneNumber: user.phoneNumber,
      email: user.email ?? null,
      status: user.status,
      userType: user.userType,
      isAdmin: user.isAdmin,
      isCustomer: user.isCustomer,
      isActive: user.isActive,
      customerId: user.customerId ?? null,
      customerName: user.customer?.name ?? null,
      avatarUrl: user.avatarUrl ?? null,
      dateCreated: user.dateCreated,
      dateUpdated: user.dateUpdated,
    };
  }
}
