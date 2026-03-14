import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPdfUrlToDocuments1772700000000 implements MigrationInterface {
    name = 'AddPdfUrlToDocuments1772700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "pdfUrl" text`,
        );
        await queryRunner.query(
            `ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "pdfUrl" text`,
        );
        await queryRunner.query(
            `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pdfUrl" text`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "pdfUrl"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN IF EXISTS "pdfUrl"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "pdfUrl"`);
    }
}
