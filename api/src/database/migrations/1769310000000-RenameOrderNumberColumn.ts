import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameOrderNumberColumn1769310000000 implements MigrationInterface {
  name = 'RenameOrderNumberColumn1769310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Copy data from 'number' to 'orderNumber' where orderNumber is null
    await queryRunner.query(`
            UPDATE "orders" 
            SET "orderNumber" = "number" 
            WHERE "orderNumber" IS NULL OR "orderNumber" = ''
        `);

    // Drop the unique constraint on 'number'
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "UQ_orders_number"`,
    );

    // Drop the index on 'number' (using the actual hash-based index name)
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4e174e347d448617acdf98fef0"`,
    );

    // Drop the index on 'orderNumber' (we'll recreate it if we still need it)
    await queryRunner.query(
      `DROP INDEX "public"."IDX_59b0c3b34ea0fa5562342f2414"`,
    );

    // Drop the 'number' column
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "number"`);

    // Make 'orderNumber' NOT NULL
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "orderNumber" SET NOT NULL`,
    );

    // Add unique constraint to 'orderNumber'
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_orderNumber" UNIQUE ("orderNumber")`,
    );

    // Recreate index on 'orderNumber'
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_orderNumber" ON "orders" ("orderNumber")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index on 'orderNumber'
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_orderNumber"`);

    // Drop unique constraint on 'orderNumber'
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "UQ_orders_orderNumber"`,
    );

    // Make 'orderNumber' nullable again
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "orderNumber" DROP NOT NULL`,
    );

    // Add 'number' column back
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "number" character varying(50)`,
    );

    // Copy data from 'orderNumber' to 'number'
    await queryRunner.query(`
            UPDATE "orders" 
            SET "number" = "orderNumber"
        `);

    // Make 'number' NOT NULL
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "number" SET NOT NULL`,
    );

    // Add unique constraint to 'number'
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_number" UNIQUE ("number")`,
    );

    // Recreate index on 'number'
    await queryRunner.query(
      `CREATE INDEX "IDX_4e174e347d448617acdf98fef0" ON "orders" ("number")`,
    );

    // Recreate index on 'orderNumber'
    await queryRunner.query(
      `CREATE INDEX "IDX_59b0c3b34ea0fa5562342f2414" ON "orders" ("orderNumber")`,
    );
  }
}
