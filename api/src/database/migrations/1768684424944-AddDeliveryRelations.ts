import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliveryRelations1768684424944 implements MigrationInterface {
  name = 'AddDeliveryRelations1768684424944';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders_delivery" ADD CONSTRAINT "FK_f01dffdb2fd3c0f7e28b309bb39" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders_delivery" ADD CONSTRAINT "FK_500bc42c16ef014f0b14040d66d" FOREIGN KEY ("deliveryPersonId") REFERENCES "delivery_persons"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders_delivery" DROP CONSTRAINT "FK_500bc42c16ef014f0b14040d66d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders_delivery" DROP CONSTRAINT "FK_f01dffdb2fd3c0f7e28b309bb39"`,
    );
  }
}
