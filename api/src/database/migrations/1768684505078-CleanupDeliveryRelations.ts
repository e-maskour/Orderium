import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupDeliveryRelations1768684505078 implements MigrationInterface {
  name = 'CleanupDeliveryRelations1768684505078';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_500bc42c16ef014f0b14040d66"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f01dffdb2fd3c0f7e28b309bb3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders_delivery" DROP CONSTRAINT "FK_f01dffdb2fd3c0f7e28b309bb39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders_delivery" ALTER COLUMN "orderId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders_delivery" ADD CONSTRAINT "FK_f01dffdb2fd3c0f7e28b309bb39" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders_delivery" DROP CONSTRAINT "FK_f01dffdb2fd3c0f7e28b309bb39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders_delivery" ALTER COLUMN "orderId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders_delivery" ADD CONSTRAINT "FK_f01dffdb2fd3c0f7e28b309bb39" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f01dffdb2fd3c0f7e28b309bb3" ON "orders_delivery" ("orderId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_500bc42c16ef014f0b14040d66" ON "orders_delivery" ("deliveryPersonId") `,
    );
  }
}
