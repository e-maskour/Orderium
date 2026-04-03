import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Configuration response — admin/backoffice only (GET /configurations).
 * Returns the entity key and its JSON value blob.
 */
export class ConfigurationResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  entity: string;

  @ApiProperty()
  @Expose()
  values: Record<string, unknown>;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  dateUpdated: Date;
}
