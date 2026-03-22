import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultTaxToProducts1768600000000 implements MigrationInterface {
  name = 'AddDefaultTaxToProducts1768600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "defaultTax" numeric(5,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "defaultTax"`);
  }
}
