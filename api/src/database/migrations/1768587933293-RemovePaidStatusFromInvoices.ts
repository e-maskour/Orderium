import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePaidStatusFromInvoices1768587933293 implements MigrationInterface {
  name = 'RemovePaidStatusFromInvoices1768587933293';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_43d19956aeab008b49e0804c145"`,
    );
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "paidStatus"`);
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "referenceNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "referenceNumber" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "createdAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "updatedAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_43d19956aeab008b49e0804c145" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_43d19956aeab008b49e0804c145"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "referenceNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "referenceNumber" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "paidStatus" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_43d19956aeab008b49e0804c145" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
