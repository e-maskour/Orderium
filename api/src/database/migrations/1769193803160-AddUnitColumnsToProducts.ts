import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitColumnsToProducts1769193803160 implements MigrationInterface {
  name = 'AddUnitColumnsToProducts1769193803160';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "saleUnit" character varying(50) NOT NULL DEFAULT 'Unité(s)'`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "purchaseUnit" character varying(50) NOT NULL DEFAULT 'Unité(s)'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "purchaseUnit"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "saleUnit"`);
  }
}
