import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCategoryCodeColumn1769191409668 implements MigrationInterface {
  name = 'RemoveCategoryCodeColumn1769191409668';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_77d7eff8a7aaa05457a12b8007"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "UQ_77d7eff8a7aaa05457a12b8007a"`,
    );
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "code"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" ADD "code" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "UQ_77d7eff8a7aaa05457a12b8007a" UNIQUE ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77d7eff8a7aaa05457a12b8007" ON "categories" ("code") `,
    );
  }
}
