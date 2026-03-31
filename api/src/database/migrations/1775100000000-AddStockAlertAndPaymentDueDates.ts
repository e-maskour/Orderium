import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockAlertAndPaymentDueDates1775100000000 implements MigrationInterface {
    name = 'AddStockAlertAndPaymentDueDates1775100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add stockAlertThreshold to products
        await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "stock_alert_threshold" integer DEFAULT 5
    `);

        // Add amountDueDate to orders
        await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "amount_due_date" date
    `);

        // Add amountDueDate to invoices
        await queryRunner.query(`
      ALTER TABLE "invoices"
      ADD COLUMN IF NOT EXISTS "amount_due_date" date
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "stock_alert_threshold"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "amount_due_date"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "amount_due_date"`);
    }
}
