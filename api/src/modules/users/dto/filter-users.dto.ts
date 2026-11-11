import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserType, UserStatus } from './create-user.dto';

/** Hard cap on `perPage` — larger requests are clamped, not rejected. */
export const USERS_MAX_PER_PAGE = 100;

/** Columns the user list may be sorted by. */
export const USER_SORT_FIELDS = [
  'name',
  'email',
  'phoneNumber',
  'dateCreated',
] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export class FilterUsersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserType })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Only users holding this role' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  roleId?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
    description: `Clamped to ${USERS_MAX_PER_PAGE}`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  perPage?: number = 20;

  @ApiPropertyOptional({
    enum: USER_SORT_FIELDS,
    description: 'Column to sort by (default: dateCreated)',
  })
  @IsOptional()
  @IsIn(USER_SORT_FIELDS)
  sortField?: UserSortField;

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    description: 'Sort direction (default: DESC)',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
