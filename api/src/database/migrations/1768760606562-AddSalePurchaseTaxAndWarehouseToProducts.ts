import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSalePurchaseTaxAndWarehouseToProducts1768760606562 implements MigrationInterface {
    name = 'AddSalePurchaseTaxAndWarehouseToProducts1768760606562'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ADD "saleTax" numeric(5,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "products" ADD "purchaseTax" numeric(5,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "products" ADD "warehouseId" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "warehouseId"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "purchaseTax"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "saleTax"`);
    }

}
