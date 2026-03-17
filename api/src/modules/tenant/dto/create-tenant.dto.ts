import {
    IsString,
    Matches,
    MaxLength,
    MinLength,
    IsOptional,
    IsObject,
    IsEmail,
    IsInt,
    IsIn,
    Min,
    Max,
} from 'class-validator';

export class CreateTenantDto {
    /** Display name, e.g. "ACME Corporation" */
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    /**
     * URL-safe slug, lowercase alphanumeric + hyphens.
     * Becomes the subdomain prefix and the database name suffix.
     * e.g. "acme" → orderium_acme DB, acme-admin.mar-nova.com subdomain
     */
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
        message:
            'slug must be lowercase alphanumeric, may contain hyphens, and must start/end with alphanumeric',
    })
    slug: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    logoUrl?: string;

    /** Hex color code e.g. "#FF5733" */
    @IsOptional()
    @IsString()
    @Matches(/^#[0-9A-Fa-f]{6}$/, {
        message: 'primaryColor must be a 6-digit hex color code',
    })
    primaryColor?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    contactName?: string;

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
    @IsString()
    notes?: string;

    @IsOptional()
    @IsIn(['trial', 'basic', 'pro', 'enterprise'])
    subscriptionPlan?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(365)
    trialDays?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10000)
    maxUsers?: number;

    /** Arbitrary JSON settings (timezone, locale, enabled features, …) */
    @IsOptional()
    @IsObject()
    settings?: Record<string, unknown>;
}
