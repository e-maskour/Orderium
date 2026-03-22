import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFromPortalToOrders1769519685292 implements MigrationInterface {
  name = 'AddFromPortalToOrders1769519685292';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "fromPortal" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "fromPortal"`);
  }
}
