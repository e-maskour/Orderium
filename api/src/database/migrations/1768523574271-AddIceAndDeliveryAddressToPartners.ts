import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIceAndDeliveryAddressToPartners1768523574271 implements MigrationInterface {
    name = 'AddIceAndDeliveryAddressToPartners1768523574271'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partners" ADD "ice" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "partners" ADD "deliveryAddress" text`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1"`);
        await queryRunner.query(`ALTER TABLE "portal" DROP CONSTRAINT "FK_218766a99fd41fcf4424056ab4f"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_0cf9a7d463c3262c954f3300fe9"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_1df049f8943c6be0c1115541efb"`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "partners_id_seq" OWNED BY "partners"."id"`);
        await queryRunner.query(`ALTER TABLE "partners" ALTER COLUMN "id" SET DEFAULT nextval('"partners_id_seq"')`);
        await queryRunner.query(`ALTER TABLE "portal" ADD CONSTRAINT "FK_218766a99fd41fcf4424056ab4f" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_1df049f8943c6be0c1115541efb" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_0cf9a7d463c3262c954f3300fe9" FOREIGN KEY ("supplierId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_0cf9a7d463c3262c954f3300fe9"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_1df049f8943c6be0c1115541efb"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1"`);
        await queryRunner.query(`ALTER TABLE "portal" DROP CONSTRAINT "FK_218766a99fd41fcf4424056ab4f"`);
        await queryRunner.query(`ALTER TABLE "partners" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "partners_id_seq"`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_1df049f8943c6be0c1115541efb" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_0cf9a7d463c3262c954f3300fe9" FOREIGN KEY ("supplierId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "portal" ADD CONSTRAINT "FK_218766a99fd41fcf4424056ab4f" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "deliveryAddress"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "ice"`);
    }

}
