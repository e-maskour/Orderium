import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionSummaryDto } from '../../../common/dto/summary.dto';

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

  @ApiProperty({ type: [PermissionSummaryDto] })
  @Expose()
  @Type(() => PermissionSummaryDto)
  permissions: PermissionSummaryDto[];

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}
