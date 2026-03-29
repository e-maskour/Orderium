import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
    @ApiPropertyOptional({ description: 'New password (optional)', minLength: 8 })
    @IsOptional()
    @IsString()
    @MinLength(8)
    password?: string;

    @ApiPropertyOptional({ description: 'Current password (required when changing via profile)' })
    @IsOptional()
    @IsString()
    currentPassword?: string;

    @ApiPropertyOptional({ description: 'New password via profile update', minLength: 8 })
    @IsOptional()
    @IsString()
    @MinLength(8)
    newPassword?: string;
}
