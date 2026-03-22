import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaxToInvoiceItems1768568920641 implements MigrationInterface {
  name = 'AddTaxToInvoiceItems1768568920641';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoice_items" ADD "tax" numeric(5,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoice_items" DROP COLUMN "tax"`);
  }
}
