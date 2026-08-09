import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionSummaryDto } from '../../../common/dto/summary.dto';

/** Slim representation of an implied role, to avoid recursing the graph. */
export class ImpliedRoleDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;
}

/**
 * Full role response — admin/backoffice only (GET /roles, GET /roles/:id).
 * Permissions exposed as slim PermissionSummaryDto.
 */
export class RoleResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  description: string | null;

  @ApiProperty()
  @Expose()
  isSuperAdmin: boolean;

  @ApiProperty({
    description: 'Seeded preset role — cannot be renamed or deleted',
  })
  @Expose()
  isSystem: boolean;

  @ApiPropertyOptional()
  @Expose()
  category: string | null;

  @ApiProperty({ type: [PermissionSummaryDto] })
  @Expose()
  @Type(() => PermissionSummaryDto)
  permissions: PermissionSummaryDto[];

  @ApiProperty({
    type: [ImpliedRoleDto],
    description: 'Roles whose permissions this role also grants',
  })
  @Expose()
  @Type(() => ImpliedRoleDto)
  implies: ImpliedRoleDto[];

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}
