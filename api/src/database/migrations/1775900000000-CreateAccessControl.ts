import { MigrationInterface, QueryRunner } from 'typeorm';
import { syncAccessControl } from '../seeders/access-control.seeder';

/**
 * Odoo-style access control.
 *
 * Adds role inheritance (`role_implications`, the equivalent of Odoo's
 * `implied_ids`) and many-to-many user↔role assignment (`user_roles`, the
 * equivalent of `res.users.groups_id`), then seeds the permission catalogue
 * and the preset role ladder.
 *
 * Existing users keep exactly the access they had: their single `portal.roleId`
 * is carried over into `user_roles`, and any admin left without a role is
 * assigned Administrator. Enforcement is fail-closed from the moment the
 * guard is registered, so this backfill has to happen in the same release.
 *
 * The catalogue is derived from `common/access/access-modules.ts` rather than
 * being frozen in SQL here. That is deliberate: the registry is the source of
 * truth, and `syncAccessControl` is idempotent, so re-running it repairs drift
 * instead of duplicating rows.
 */
export class CreateAccessControl1775900000000 implements MigrationInterface {
  name = 'CreateAccessControl1775900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── roles: new columns ──────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "isSystem" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "category" character varying(100)`,
    );

    // ── role_implications ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_implications" (
        "roleId" integer NOT NULL,
        "impliedRoleId" integer NOT NULL,
        CONSTRAINT "PK_role_implications" PRIMARY KEY ("roleId", "impliedRoleId"),
        CONSTRAINT "CHK_role_implications_no_self" CHECK ("roleId" <> "impliedRoleId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_role_implications_roleId" ON "role_implications" ("roleId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_role_implications_impliedRoleId" ON "role_implications" ("impliedRoleId")`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_role_implications_roleId'
        ) THEN
          ALTER TABLE "role_implications"
            ADD CONSTRAINT "FK_role_implications_roleId"
            FOREIGN KEY ("roleId") REFERENCES "roles"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_role_implications_impliedRoleId'
        ) THEN
          ALTER TABLE "role_implications"
            ADD CONSTRAINT "FK_role_implications_impliedRoleId"
            FOREIGN KEY ("impliedRoleId") REFERENCES "roles"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // ── user_roles ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "userId" integer NOT NULL,
        "roleId" integer NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("userId", "roleId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_roles_userId" ON "user_roles" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_roles_roleId" ON "user_roles" ("roleId")`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_roles_userId'
        ) THEN
          ALTER TABLE "user_roles"
            ADD CONSTRAINT "FK_user_roles_userId"
            FOREIGN KEY ("userId") REFERENCES "portal"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_roles_roleId'
        ) THEN
          ALTER TABLE "user_roles"
            ADD CONSTRAINT "FK_user_roles_roleId"
            FOREIGN KEY ("roleId") REFERENCES "roles"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // ── catalogue, presets, backfill ────────────────────────────────────────
    await syncAccessControl(queryRunner, { backfillAdministrators: true });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_implications"`);
    await queryRunner.query(
      `ALTER TABLE "roles" DROP COLUMN IF EXISTS "category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" DROP COLUMN IF EXISTS "isSystem"`,
    );
    // Preset roles and the permission catalogue are left in place: dropping
    // them would cascade into `role_permissions` and destroy tenant edits that
    // this migration never made.
  }
}
