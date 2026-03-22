import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReceiptNumberToOrders1769522000000 implements MigrationInterface {
  name = 'AddReceiptNumberToOrders1769522000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "receiptNumber" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "receiptNumber"`);
  }
}
