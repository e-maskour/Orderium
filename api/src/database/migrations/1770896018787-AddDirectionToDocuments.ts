import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDirectionToDocuments1770896018787 implements MigrationInterface {
    name = 'AddDirectionToDocuments1770896018787'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."invoices_direction_enum" AS ENUM('VENTE', 'ACHAT')`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD "direction" "public"."invoices_direction_enum" NOT NULL DEFAULT 'VENTE'`);
        await queryRunner.query(`CREATE TYPE "public"."orders_direction_enum" AS ENUM('VENTE', 'ACHAT')`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "direction" "public"."orders_direction_enum" NOT NULL DEFAULT 'VENTE'`);
        await queryRunner.query(`CREATE TYPE "public"."quotes_direction_enum" AS ENUM('VENTE', 'ACHAT')`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD "direction" "public"."quotes_direction_enum" NOT NULL DEFAULT 'VENTE'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "direction"`);
        await queryRunner.query(`DROP TYPE "public"."quotes_direction_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "direction"`);
        await queryRunner.query(`DROP TYPE "public"."orders_direction_enum"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "direction"`);
        await queryRunner.query(`DROP TYPE "public"."invoices_direction_enum"`);
    }

}
