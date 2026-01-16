import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessFieldsToPartners1768561134072 implements MigrationInterface {
    name = 'AddBusinessFieldsToPartners1768561134072'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partners" ADD "if" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "partners" ADD "cnss" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "partners" ADD "rc" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "partners" ADD "patente" character varying(50)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "patente"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "rc"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "cnss"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "if"`);
    }

}
