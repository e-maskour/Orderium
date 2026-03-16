import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFromClientToOrders1769984819949 implements MigrationInterface {
  name = 'AddFromClientToOrders1769984819949';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_configurations_module_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "configurations" DROP COLUMN "module"`,
    );
    await queryRunner.query(`ALTER TABLE "configurations" DROP COLUMN "key"`);
    await queryRunner.query(`ALTER TABLE "configurations" DROP COLUMN "value"`);
    await queryRunner.query(`ALTER TABLE "configurations" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "configurations" DROP COLUMN "label"`);
    await queryRunner.query(
      `ALTER TABLE "configurations" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "configurations" DROP COLUMN "options"`,
    );
    await queryRunner.query(
      `ALTER TABLE "configurations" DROP COLUMN "isActive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "fromClient" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "products"."imagePublicId" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "configurations" ALTER COLUMN "entity" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "configurations" ALTER COLUMN "values" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_083d801197d005a02e4b5fa589" ON "configurations" ("entity") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_083d801197d005a02e4b5fa589"`,
    );
    await queryRunner.query(
      `ALTER TABLE "configurations" ALTER COLUMN "values" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "configurations" ALTER COLUMN "entity" DROP NOT NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "products"."imagePublicId" IS 'Public ID from CDN provider (Cloudinary, S3, etc) for image management'`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "fromClient"`);
    await queryRunner.query(
      `ALTER TABLE "configurations" ADD "isActive" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(`ALTER TABLE "configurations" ADD "options" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "configurations" ADD "description" text`,
    );
    await queryRunner.query(`ALTER TABLE "configurations" ADD "label" text`);
    await queryRunner.query(
      `ALTER TABLE "configurations" ADD "type" character varying(50)`,
    );
    await queryRunner.query(`ALTER TABLE "configurations" ADD "value" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "configurations" ADD "key" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "configurations" ADD "module" character varying(50)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_configurations_module_key" ON "configurations" ("key", "module") `,
    );
  }
}
