import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveOrderSpecificFields1769472978526 implements MigrationInterface {
    name = 'RemoveOrderSpecificFields1769472978526'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_9ab53e1393993bbf541adc3c2e5"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_bf4bfca1c9c88a380e673cf4c00"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "adminId"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "stockDate"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "isClockedOut"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "warehouseId"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "internalNote"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "expectedQuantity"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" ADD "expectedQuantity" numeric(18,3) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "internalNote" text`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "warehouseId" integer`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "isClockedOut" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "stockDate" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "adminId" integer`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_bf4bfca1c9c88a380e673cf4c00" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_9ab53e1393993bbf541adc3c2e5" FOREIGN KEY ("adminId") REFERENCES "portal"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
