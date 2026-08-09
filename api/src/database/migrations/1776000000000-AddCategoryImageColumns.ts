import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds image columns to `categories`, mirroring the shape already used by
 * `brands` (logoUrl / logoPublicId) and `products` (imageUrl / imagePublicId).
 *
 *  ┌─────────────────┬────────────────────────────────────────────────────────┐
 *  │ Column          │ Purpose                                                │
 *  ├─────────────────┼────────────────────────────────────────────────────────┤
 *  │ imageUrl        │ Public URL / object key rendered by the client portal   │
 *  │ imagePublicId   │ Storage key, kept so the old object can be removed      │
 *  │                 │ when the image is replaced or the category is deleted   │
 *  └─────────────────┴────────────────────────────────────────────────────────┘
 *
 * Both are nullable — existing categories simply render a placeholder.
 */
export class AddCategoryImageColumns1776000000000 implements MigrationInterface {
  name = 'AddCategoryImageColumns1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "imageUrl" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "imagePublicId" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN IF EXISTS "imagePublicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN IF EXISTS "imageUrl"`,
    );
  }
}
