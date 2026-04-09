import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeDeliveryPersonEmailNullable1744195200000
  implements MigrationInterface {
  name = 'MakeDeliveryPersonEmailNullable1744195200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery_persons" ALTER COLUMN "email" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // First clear nulls to avoid constraint violation on revert
    await queryRunner.query(
      `UPDATE "delivery_persons" SET "email" = '' WHERE "email" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_persons" ALTER COLUMN "email" SET NOT NULL`,
    );
  }
}
