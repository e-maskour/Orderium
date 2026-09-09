import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repairs a historical migration bug.
 *
 * CreatePrinters1743120000000 begins with:
 *
 *     const portalExists = await queryRunner.hasTable('portal');
 *     if (!portalExists) return;
 *
 * on the assumption that InitialMigration1774300911703 would create the
 * printers tables later. It does not. Because TypeORM records a migration as
 * applied whether or not it did any work, CreatePrinters is marked done on
 * every tenant database created since, and never runs again — leaving
 * `printers` and `print_jobs` absent everywhere and the printers module dead.
 *
 * This migration creates them if they are missing. It is idempotent, so it is
 * a no-op on any database where they already exist.
 *
 * It also widens the paper_width constraint: the original allowed
 * (58, 80, 210) while the Printer entity declares 80 | 148, so a 148mm
 * printer could never be saved.
 */
export class RepairPrintersTables1777900000000 implements MigrationInterface {
  name = 'RepairPrintersTables1777900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // `portal` is referenced by print_jobs.user_id; without it we cannot
    // build the table. Unlike the original migration, this is a genuine
    // precondition rather than a deferral — log loudly if it is unmet.
    const portalExists = await queryRunner.hasTable('portal');
    if (!portalExists) {
      throw new Error(
        'RepairPrintersTables: the `portal` table is missing. Run the initial ' +
          'tenant migrations before this one.',
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS printers (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name             VARCHAR(60) NOT NULL UNIQUE,
        brand            VARCHAR(20) NOT NULL
                           CHECK (brand IN ('epson','star','generic','qztray','browser')),
        connection_type  VARCHAR(20) NOT NULL
                           CHECK (connection_type IN ('wifi','usb','network','browser')),
        model            VARCHAR(60),
        ip               INET,
        port             INTEGER NOT NULL DEFAULT 8008,
        paper_width      SMALLINT NOT NULL DEFAULT 80,
        is_default       BOOLEAN NOT NULL DEFAULT FALSE,
        document_types   TEXT[] NOT NULL DEFAULT '{}',
        last_seen_at     TIMESTAMPTZ,
        is_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        printer_id       UUID REFERENCES printers(id) ON DELETE SET NULL,
        user_id          INTEGER REFERENCES portal(id) ON DELETE SET NULL,
        document_type    VARCHAR(30) NOT NULL,
        document_id      UUID,
        method           VARCHAR(30),
        status           VARCHAR(20) NOT NULL DEFAULT 'success',
        duration_ms      INTEGER,
        error_message    TEXT,
        printed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_print_jobs_printed_at ON print_jobs(printed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_print_jobs_printer    ON print_jobs(printer_id);
    `);

    // Widen paper_width to match the entity (80 | 148) while keeping the
    // legacy values so existing rows stay valid.
    await queryRunner.query(`
      ALTER TABLE printers DROP CONSTRAINT IF EXISTS printers_paper_width_check;
      ALTER TABLE printers ADD CONSTRAINT printers_paper_width_check
        CHECK (paper_width IN (58, 80, 148, 210));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Deliberately does not drop the tables: this migration repairs data that
    // should have existed since 1743120000000, and dropping it on revert would
    // destroy printer configuration this migration did not create.
    await queryRunner.query(`
      ALTER TABLE printers DROP CONSTRAINT IF EXISTS printers_paper_width_check;
      ALTER TABLE printers ADD CONSTRAINT printers_paper_width_check
        CHECK (paper_width IN (58, 80, 210));
    `);
  }
}
