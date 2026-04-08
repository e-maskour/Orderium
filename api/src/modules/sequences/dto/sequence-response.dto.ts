import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SequenceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() entityType: string;
  @ApiProperty() name: string;
  @ApiProperty() prefix: string;
  @ApiProperty() suffix: string;
  @ApiProperty() numberLength: number;
  @ApiProperty() yearInFormat: boolean;
  @ApiProperty() monthInFormat: boolean;
  @ApiProperty() dayInFormat: boolean;
  @ApiProperty() trimesterInFormat: boolean;
  @ApiProperty() formatTemplate: string;
  @ApiProperty() resetPeriod: string;
  @ApiProperty() currentPeriodKey: string;
  @ApiProperty() nextNumber: number;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() lastGeneratedAt: Date | null;
  @ApiPropertyOptional() lastResetAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  /** Computed preview of the next document number (not guaranteed — may advance by the time you submit) */
  @ApiProperty() previewNextNumber: string;
}
