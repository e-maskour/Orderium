import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PrinterReachabilityDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Whether the agent could reach the device' })
  @IsBoolean()
  reachable: boolean;
}

export class HeartbeatDto {
  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @MaxLength(20)
  version: string;

  @ApiProperty({ example: 'win32', description: 'win32 | linux | darwin' })
  @IsString()
  @MaxLength(20)
  platform: string;

  @ApiPropertyOptional({ type: [PrinterReachabilityDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrinterReachabilityDto)
  printers?: PrinterReachabilityDto[];
}
