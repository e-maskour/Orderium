import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeDeliveryPersonEmailNullable1744195200000 implements MigrationInterface {
  name = 'MakeDeliveryPersonEmailNullable1744195200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: InitialMigration (1774300911703) already creates this column as
    // nullable, so on a fresh tenant DB this migration runs before the table
    // exists. Skip — the column will already be nullable after InitialMigration.
    const tableExists = await queryRunner.hasTable('delivery_persons');
    if (!tableExists) return;
    await queryRunner.query(
      `ALTER TABLE "delivery_persons" ALTER COLUMN "email" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('delivery_persons');
    if (!tableExists) return;
    // First clear nulls to avoid constraint violation on revert
    await queryRunner.query(
      `UPDATE "delivery_persons" SET "email" = '' WHERE "email" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_persons" ALTER COLUMN "email" SET NOT NULL`,
    );
  }
}
