import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDriveModule1772800000000 implements MigrationInterface {
    name = 'CreateDriveModule1772800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── ENUM TYPES ──────────────────────────────────────────────────────────

        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE drive_permission AS ENUM ('viewer', 'editor', 'owner');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE drive_share_target AS ENUM ('user', 'everyone');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE drive_action AS ENUM (
          'upload', 'replace', 'download', 'delete', 'restore',
          'create_folder', 'rename', 'move', 'copy',
          'share', 'unshare', 'preview',
          'version_restore', 'trash', 'permanent_delete'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

        // ── drive_nodes ─────────────────────────────────────────────────────────

        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "drive_nodes" (
        "id"                UUID          NOT NULL DEFAULT gen_random_uuid(),
        "type"              VARCHAR(6)    NOT NULL,
        "name"              VARCHAR(512)  NOT NULL,
        "parent_id"         UUID,
        "owner_id"          INTEGER       NOT NULL,
        "mime_type"         VARCHAR(255),
        "extension"         VARCHAR(50),
        "size_bytes"        BIGINT,
        "storage_key"       VARCHAR(1024),
        "storage_bucket"    VARCHAR(255)  NOT NULL DEFAULT 'orderium-drive',
        "active_version_id" UUID,
        "description"       TEXT,
        "is_starred"        BOOLEAN       NOT NULL DEFAULT FALSE,
        "is_trashed"        BOOLEAN       NOT NULL DEFAULT FALSE,
        "trashed_at"        TIMESTAMPTZ,
        "created_by"        INTEGER,
        "updated_by"        INTEGER,
        "created_at"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_drive_nodes" PRIMARY KEY ("id"),
        CONSTRAINT "fk_drive_nodes_parent"
          FOREIGN KEY ("parent_id") REFERENCES "drive_nodes"("id") ON DELETE CASCADE,
        CONSTRAINT "chk_drive_nodes_type"
          CHECK ("type" IN ('folder', 'file')),
        CONSTRAINT "chk_drive_nodes_name"
          CHECK (CHAR_LENGTH("name") > 0)
      );
    `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_nodes_parent"  ON "drive_nodes"("parent_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_nodes_owner"   ON "drive_nodes"("owner_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_nodes_type"    ON "drive_nodes"("type")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_nodes_trashed" ON "drive_nodes"("is_trashed")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_nodes_fts"     ON "drive_nodes" USING gin(to_tsvector('english', "name"))`);

        // ── drive_versions ──────────────────────────────────────────────────────

        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "drive_versions" (
        "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
        "node_id"          UUID          NOT NULL,
        "version_number"   INTEGER       NOT NULL,
        "storage_key"      VARCHAR(1024) NOT NULL,
        "storage_bucket"   VARCHAR(255)  NOT NULL,
        "size_bytes"       BIGINT        NOT NULL,
        "mime_type"        VARCHAR(255)  NOT NULL,
        "original_name"    VARCHAR(512)  NOT NULL,
        "checksum_sha256"  VARCHAR(64),
        "uploaded_by"      INTEGER       NOT NULL,
        "comment"          TEXT,
        "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_drive_versions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_drive_versions_node"
          FOREIGN KEY ("node_id") REFERENCES "drive_nodes"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_drive_versions_node_version"
          UNIQUE ("node_id", "version_number")
      );
    `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_versions_node" ON "drive_versions"("node_id")`);

        // Deferred FK from drive_nodes.active_version_id → drive_versions.id
        await queryRunner.query(`
      ALTER TABLE "drive_nodes"
        ADD CONSTRAINT "fk_drive_nodes_active_version"
        FOREIGN KEY ("active_version_id") REFERENCES "drive_versions"("id")
        ON DELETE SET NULL
        DEFERRABLE INITIALLY DEFERRED;
    `);

        // ── drive_shares ────────────────────────────────────────────────────────

        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "drive_shares" (
        "id"             UUID              NOT NULL DEFAULT gen_random_uuid(),
        "node_id"        UUID              NOT NULL,
        "permission"     drive_permission  NOT NULL DEFAULT 'viewer',
        "target_type"    drive_share_target NOT NULL,
        "target_user_id" INTEGER,
        "shared_by"      INTEGER           NOT NULL,
        "message"        TEXT,
        "expires_at"     TIMESTAMPTZ,
        "created_at"     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_drive_shares" PRIMARY KEY ("id"),
        CONSTRAINT "fk_drive_shares_node"
          FOREIGN KEY ("node_id") REFERENCES "drive_nodes"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_drive_shares_node_target"
          UNIQUE ("node_id", "target_type", "target_user_id")
      );
    `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_shares_node"        ON "drive_shares"("node_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_shares_target_user" ON "drive_shares"("target_user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_shares_everyone"    ON "drive_shares"("node_id") WHERE "target_type" = 'everyone'`);

        // ── drive_activity ──────────────────────────────────────────────────────

        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "drive_activity" (
        "id"             UUID          NOT NULL DEFAULT gen_random_uuid(),
        "action"         drive_action  NOT NULL,
        "node_id"        UUID,
        "node_name"      VARCHAR(512)  NOT NULL,
        "actor_id"       INTEGER       NOT NULL,
        "target_user_id" INTEGER,
        "version_id"     UUID,
        "metadata"       JSONB         NOT NULL DEFAULT '{}',
        "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_drive_activity" PRIMARY KEY ("id"),
        CONSTRAINT "fk_drive_activity_node"
          FOREIGN KEY ("node_id") REFERENCES "drive_nodes"("id") ON DELETE SET NULL
      );
    `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_activity_node"  ON "drive_activity"("node_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_activity_actor" ON "drive_activity"("actor_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_activity_time"  ON "drive_activity"("created_at" DESC)`);

        // ── drive_tags ──────────────────────────────────────────────────────────

        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "drive_tags" (
        "id"         SERIAL        NOT NULL,
        "name"       VARCHAR(100)  NOT NULL,
        "color"      VARCHAR(7),
        "created_by" INTEGER,
        CONSTRAINT "pk_drive_tags"  PRIMARY KEY ("id"),
        CONSTRAINT "uq_drive_tags_name" UNIQUE ("name")
      );
    `);

        // ── drive_node_tags ─────────────────────────────────────────────────────

        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "drive_node_tags" (
        "node_id" UUID    NOT NULL,
        "tag_id"  INTEGER NOT NULL,
        CONSTRAINT "pk_drive_node_tags" PRIMARY KEY ("node_id", "tag_id"),
        CONSTRAINT "fk_drive_node_tags_node"
          FOREIGN KEY ("node_id") REFERENCES "drive_nodes"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_drive_node_tags_tag"
          FOREIGN KEY ("tag_id") REFERENCES "drive_tags"("id") ON DELETE CASCADE
      );
    `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_drive_node_tags_tag" ON "drive_node_tags"("tag_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "drive_node_tags" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "drive_tags" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "drive_activity" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "drive_shares" CASCADE`);

        // Drop the deferred FK before dropping drive_versions
        await queryRunner.query(`
      ALTER TABLE "drive_nodes" DROP CONSTRAINT IF EXISTS "fk_drive_nodes_active_version"
    `);
        await queryRunner.query(`DROP TABLE IF EXISTS "drive_versions" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "drive_nodes" CASCADE`);

        await queryRunner.query(`DROP TYPE IF EXISTS "drive_action"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "drive_share_target"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "drive_permission"`);
    }
}
