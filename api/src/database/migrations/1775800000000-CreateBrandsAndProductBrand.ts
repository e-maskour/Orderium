import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `brands` table and adds the optional `brandId` foreign key on
 * `products`.
 *
 * A product may have zero or one brand — `products.brandId` is nullable and
 * set to NULL when its brand is deleted.
 */
export class CreateBrandsAndProductBrand1775800000000 implements MigrationInterface {
  name = 'CreateBrandsAndProductBrand1775800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "brands" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "logoUrl" text,
        "logoPublicId" character varying(500),
        "website" character varying(500),
        "isActive" boolean NOT NULL DEFAULT true,
        "dateCreated" TIMESTAMP NOT NULL DEFAULT now(),
        "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_brands_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_brands_name" ON "brands" ("name")`,
    );

    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brandId" integer`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_brandId" ON "products" ("brandId")`,
    );

    // Guard against re-running on a database where the FK already exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_products_brandId'
        ) THEN
          ALTER TABLE "products"
            ADD CONSTRAINT "FK_products_brandId"
            FOREIGN KEY ("brandId") REFERENCES "brands"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_products_brandId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_brandId"`);
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "brandId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_brands_name"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brands"`);
  }
}
