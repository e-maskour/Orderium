import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPortalStatusColumn1748000000000 implements MigrationInterface {
    name = 'AddPortalStatusColumn1748000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE "portal"
      ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'pending'
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE "portal" DROP COLUMN IF EXISTS "status"
    `);
    }
}
