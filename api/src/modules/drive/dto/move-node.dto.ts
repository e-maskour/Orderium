import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class MoveNodeDto {
    /** null or omitted → move to root */
    @ValidateIf((o) => o.newParentId !== null)
    @IsOptional()
    @IsUUID('4')
    newParentId?: string | null;
}
