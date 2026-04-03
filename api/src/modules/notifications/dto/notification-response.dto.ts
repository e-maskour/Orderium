import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Notification response — used by all portals (GET /notifications).
 * Excludes the `data` jsonb blob and full `user` relation.
 */
export class NotificationResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiPropertyOptional()
  @Expose()
  userId: number | null;

  @ApiProperty()
  @Expose()
  type: string;

  @ApiProperty()
  @Expose()
  title: string;

  @ApiProperty()
  @Expose()
  message: string;

  @ApiProperty()
  @Expose()
  priority: string;

  @ApiProperty()
  @Expose()
  isRead: boolean;

  @ApiProperty()
  @Expose()
  isArchived: boolean;

  @ApiProperty()
  @Expose()
  dateCreated: Date;
}

/**
 * Notification template response — admin/backoffice only (GET /notifications/templates).
 */
export class NotificationTemplateResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  key: string;

  @ApiProperty()
  @Expose()
  category: string;

  @ApiProperty()
  @Expose()
  portal: string;

  @ApiProperty()
  @Expose()
  titleFr: string;

  @ApiProperty()
  @Expose()
  bodyFr: string;

  @ApiPropertyOptional()
  @Expose()
  titleAr: string | null;

  @ApiPropertyOptional()
  @Expose()
  bodyAr: string | null;

  @ApiPropertyOptional()
  @Expose()
  description: string | null;

  @ApiProperty()
  @Expose()
  enabled: boolean;

  @ApiProperty()
  @Expose()
  priority: string;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}
