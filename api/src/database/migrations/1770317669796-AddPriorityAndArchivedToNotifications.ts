import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPriorityAndArchivedToNotifications1770317669796 implements MigrationInterface {
    name = 'AddPriorityAndArchivedToNotifications1770317669796'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "device_tokens" DROP CONSTRAINT "FK_device_tokens_portal"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_device_tokens_appType"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_device_tokens_token"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_device_tokens_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_device_tokens_platform"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_device_tokens_isActive"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "priority" character varying(20) NOT NULL DEFAULT 'MEDIUM'`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "isArchived" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ADD CONSTRAINT "UQ_977e24c520c49436d08e5eeea8a" UNIQUE ("token")`);
        await queryRunner.query(`ALTER TYPE "public"."device_platform_enum" RENAME TO "device_platform_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."device_tokens_platform_enum" AS ENUM('web', 'android', 'ios')`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ALTER COLUMN "platform" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ALTER COLUMN "platform" TYPE "public"."device_tokens_platform_enum" USING "platform"::"text"::"public"."device_tokens_platform_enum"`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ALTER COLUMN "platform" SET DEFAULT 'web'`);
        await queryRunner.query(`DROP TYPE "public"."device_platform_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."app_type_enum" RENAME TO "app_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."device_tokens_apptype_enum" AS ENUM('client', 'backoffice', 'delivery')`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ALTER COLUMN "appType" TYPE "public"."device_tokens_apptype_enum" USING "appType"::"text"::"public"."device_tokens_apptype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."app_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ALTER COLUMN "dateCreated" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ALTER COLUMN "dateUpdated" SET DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "IDX_619d48b7cedf9a5e2397cbb13e" ON "device_tokens" ("isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_d79f88d3f95f499de207e3d522" ON "device_tokens" ("appType") `);
        await queryRunner.query(`CREATE INDEX "IDX_4a49ca04c463debb903d491301" ON "device_tokens" ("platform") `);
        await queryRunner.query(`CREATE INDEX "IDX_511957e3e8443429dc3fb00120" ON "device_tokens" ("userId") `);
        await queryRunner.query(`ALTER TABLE "device_tokens" ADD CONSTRAINT "FK_511957e3e8443429dc3fb00120c" FOREIGN KEY ("userId") REFERENCES "portal"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "device_tokens" DROP CONSTRAINT "FK_511957e3e8443429dc3fb00120c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_511957e3e8443429dc3fb00120"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4a49ca04c463debb903d491301"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d79f88d3f95f499de207e3d522"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_619d48b7cedf9a5e2397cbb13e"`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ALTER COLUMN "dateUpdated" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ALTER COLUMN "dateCreated" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`CREATE TYPE "public"."app_type_enum_old" AS ENUM('client', 'backoffice', 'delivery')`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ALTER COLUMN "appType" TYPE "public"."app_type_enum_old" USING "appType"::"text"::"public"."app_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."device_tokens_apptype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."app_type_enum_old" RENAME TO "app_type_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."device_platform_enum_old" AS ENUM('web', 'android', 'ios')`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ALTER COLUMN "platform" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ALTER COLUMN "platform" TYPE "public"."device_platform_enum_old" USING "platform"::"text"::"public"."device_platform_enum_old"`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ALTER COLUMN "platform" SET DEFAULT 'web'`);
        await queryRunner.query(`DROP TYPE "public"."device_tokens_platform_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."device_platform_enum_old" RENAME TO "device_platform_enum"`);
        await queryRunner.query(`ALTER TABLE "device_tokens" DROP CONSTRAINT "UQ_977e24c520c49436d08e5eeea8a"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "isArchived"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "priority"`);
        await queryRunner.query(`CREATE INDEX "IDX_device_tokens_isActive" ON "device_tokens" ("isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_device_tokens_platform" ON "device_tokens" ("platform") `);
        await queryRunner.query(`CREATE INDEX "IDX_device_tokens_userId" ON "device_tokens" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_device_tokens_token" ON "device_tokens" ("token") `);
        await queryRunner.query(`CREATE INDEX "IDX_device_tokens_appType" ON "device_tokens" ("appType") `);
        await queryRunner.query(`ALTER TABLE "device_tokens" ADD CONSTRAINT "FK_device_tokens_portal" FOREIGN KEY ("userId") REFERENCES "portal"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
