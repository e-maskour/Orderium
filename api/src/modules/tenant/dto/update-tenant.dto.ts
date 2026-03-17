import {
    IsOptional,
    IsString,
    IsObject,
    IsEmail,
    IsInt,
    IsIn,
    MinLength,
    MaxLength,
    Matches,
    Min,
    Max,
} from 'class-validator';

/** All fields optional — only provided fields are applied. */
export class UpdateTenantDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    logoUrl?: string;

    @IsOptional()
    @IsString()
    @Matches(/^#[0-9A-Fa-f]{6}$/, {
        message: 'primaryColor must be a 6-digit hex color code',
    })
    primaryColor?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    contactEmail?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    contactPhone?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsIn(['basic', 'pro', 'enterprise'])
    subscriptionPlan?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10000)
    maxUsers?: number;

    /** Merge-update the settings JSON (replaces the whole object). */
    @IsOptional()
    @IsObject()
    settings?: Record<string, unknown>;
}
