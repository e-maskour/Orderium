import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMinPriceToProducts1768610000000 implements MigrationInterface {
  name = 'AddMinPriceToProducts1768610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ADD "minPrice" numeric(18,2) NOT NULL DEFAULT '0'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "minPrice"`);
  }
}