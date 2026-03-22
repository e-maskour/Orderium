import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTvaNumberAndIsCompanyToPartners1768561231197 implements MigrationInterface {
  name = 'AddTvaNumberAndIsCompanyToPartners1768561231197';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partners" ADD "tvaNumber" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" ADD "isCompany" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "isCompany"`);
    await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "tvaNumber"`);
  }
}
