import { IsOptional, IsIn, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListTenantsDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsIn(['trial', 'active', 'expired', 'suspended', 'disabled', 'archived', 'deleted', 'all'])
    status?: string;

    @IsOptional()
    @IsIn(['trial', 'basic', 'pro', 'enterprise', 'all'])
    plan?: string;

    @IsOptional()
    @IsIn(['name', 'createdAt', 'subscriptionPlan', 'status'])
    sortBy?: string;

    @IsOptional()
    @IsIn(['ASC', 'DESC', 'asc', 'desc'])
    sortOrder?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;
}
