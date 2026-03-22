import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUomIdColumnsToProducts1769214070271 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add saleUnitId column
    await queryRunner.query(`
            ALTER TABLE "products"
            ADD COLUMN "saleUnitId" integer NULL
        `);

    // Add purchaseUnitId column
    await queryRunner.query(`
            ALTER TABLE "products"
            ADD COLUMN "purchaseUnitId" integer NULL
        `);

    // Add foreign key for saleUnitId
    await queryRunner.query(`
            ALTER TABLE "products"
            ADD CONSTRAINT "FK_products_saleUnitId"
            FOREIGN KEY ("saleUnitId")
            REFERENCES "unit_of_measures"("id")
            ON DELETE SET NULL
        `);

    // Add foreign key for purchaseUnitId
    await queryRunner.query(`
            ALTER TABLE "products"
            ADD CONSTRAINT "FK_products_purchaseUnitId"
            FOREIGN KEY ("purchaseUnitId")
            REFERENCES "unit_of_measures"("id")
            ON DELETE SET NULL
        `);

    // Migrate existing data: match saleUnit/purchaseUnit names to UOM IDs
    await queryRunner.query(`
            UPDATE products p
            SET "saleUnitId" = uom.id
            FROM unit_of_measures uom
            WHERE p."saleUnit" = uom.name
        `);

    await queryRunner.query(`
            UPDATE products p
            SET "purchaseUnitId" = uom.id
            FROM unit_of_measures uom
            WHERE p."purchaseUnit" = uom.name
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`
            ALTER TABLE "products"
            DROP CONSTRAINT IF EXISTS "FK_products_purchaseUnitId"
        `);

    await queryRunner.query(`
            ALTER TABLE "products"
            DROP CONSTRAINT IF EXISTS "FK_products_saleUnitId"
        `);

    // Drop columns
    await queryRunner.query(`
            ALTER TABLE "products"
            DROP COLUMN "purchaseUnitId"
        `);

    await queryRunner.query(`
            ALTER TABLE "products"
            DROP COLUMN "saleUnitId"
        `);
  }
}
