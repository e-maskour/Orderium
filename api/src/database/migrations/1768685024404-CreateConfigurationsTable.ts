import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConfigurationsTable1768685024404 implements MigrationInterface {
  name = 'CreateConfigurationsTable1768685024404';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "configurations" ("id" SERIAL NOT NULL, "entity" character varying(100) NOT NULL, "values" jsonb NOT NULL, "dateCreated" TIMESTAMP NOT NULL DEFAULT now(), "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_083d801197d005a02e4b5fa589f" UNIQUE ("entity"), CONSTRAINT "PK_ef9fc29709cc5fc66610fc6a664" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_083d801197d005a02e4b5fa589" ON "configurations" ("entity") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_083d801197d005a02e4b5fa589"`,
    );
    await queryRunner.query(`DROP TABLE "configurations"`);
  }
}
