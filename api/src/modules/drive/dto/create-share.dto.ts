import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DrivePermission } from '../enums/drive-permission.enum';
import { DriveShareTarget } from '../enums/drive-share-target.enum';

export class CreateShareDto {
    @IsEnum(DriveShareTarget)
    targetType: DriveShareTarget;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    targetUserId?: number;

    @IsEnum(DrivePermission)
    permission: DrivePermission;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    message?: string;

    @IsOptional()
    expiresAt?: Date;
}
