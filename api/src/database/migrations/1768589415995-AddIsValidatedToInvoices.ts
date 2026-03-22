import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsValidatedToInvoices1768589415995 implements MigrationInterface {
  name = 'AddIsValidatedToInvoices1768589415995';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "isValidated" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "isValidated"`);
  }
}
