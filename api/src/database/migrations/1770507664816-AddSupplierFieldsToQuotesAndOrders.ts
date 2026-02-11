import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSupplierFieldsToQuotesAndOrders1770507664816 implements MigrationInterface {
    name = 'AddSupplierFieldsToQuotesAndOrders1770507664816'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "supplierId" integer`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "supplierName" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "supplierPhone" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "supplierAddress" text`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "supplierId" integer`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "supplierName" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "supplierPhone" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "supplierAddress" text`);
        await queryRunner.query(`CREATE INDEX "IDX_37217f20f8c8b431ae720dd210" ON "orders" ("supplierId") `);
        await queryRunner.query(`CREATE INDEX "IDX_bdc0e0c51bc015c5113e78136f" ON "quotes" ("supplierId") `);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_37217f20f8c8b431ae720dd210e" FOREIGN KEY ("supplierId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD CONSTRAINT "FK_bdc0e0c51bc015c5113e78136f4" FOREIGN KEY ("supplierId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quotes" DROP CONSTRAINT "FK_bdc0e0c51bc015c5113e78136f4"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_37217f20f8c8b431ae720dd210e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bdc0e0c51bc015c5113e78136f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_37217f20f8c8b431ae720dd210"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "supplierAddress"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "supplierPhone"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "supplierName"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "supplierId"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "supplierAddress"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "supplierPhone"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "supplierName"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "supplierId"`);
    }

}
