import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateNodeDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @IsOptional()
    @IsBoolean()
    isStarred?: boolean;
}
