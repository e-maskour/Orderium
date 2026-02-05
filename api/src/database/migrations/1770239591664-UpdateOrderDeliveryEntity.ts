import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOrderDeliveryEntity1770239591664 implements MigrationInterface {
    name = 'UpdateOrderDeliveryEntity1770239591664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders_delivery" ADD "pendingAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" ADD "confirmedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" ADD "toDeliveryAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" ADD "inDeliveryAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" ADD "canceledAt" TIMESTAMP`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a5c9fa770236835894f85316ac"`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_delivery_status_enum" AS ENUM('pending', 'assigned', 'confirmed', 'picked_up', 'to_delivery', 'in_delivery', 'delivered', 'canceled')`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" ADD "status" "public"."orders_delivery_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`CREATE INDEX "IDX_a5c9fa770236835894f85316ac" ON "orders_delivery" ("status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_a5c9fa770236835894f85316ac"`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."orders_delivery_status_enum"`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" ADD "status" character varying(50) NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`CREATE INDEX "IDX_a5c9fa770236835894f85316ac" ON "orders_delivery" ("status") `);
        await queryRunner.query(`ALTER TABLE "orders_delivery" DROP COLUMN "canceledAt"`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" DROP COLUMN "inDeliveryAt"`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" DROP COLUMN "toDeliveryAt"`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" DROP COLUMN "confirmedAt"`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" DROP COLUMN "pendingAt"`);
    }

}
