import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PortalAccessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  clientPortal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  deliveryPortal?: boolean;
}

export class UpdateTenantModulesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  commandes?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pos?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  caisse?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  devis?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  factures?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bonLivraison?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  paiements?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  clients?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fournisseurs?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  livreurs?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  factureAchat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  demandeDesPrix?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bonAchat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  paiementsAchat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  products?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  warehouse?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  category?: boolean;

  @ApiPropertyOptional({ type: () => PortalAccessDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PortalAccessDto)
  portals?: PortalAccessDto;
}
