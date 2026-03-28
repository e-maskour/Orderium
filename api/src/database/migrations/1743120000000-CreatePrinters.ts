import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePrinters1743120000000 implements MigrationInterface {
    name = 'CreatePrinters1743120000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      CREATE TABLE printers (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name             VARCHAR(60) NOT NULL UNIQUE,
        brand            VARCHAR(20) NOT NULL
                           CHECK (brand IN ('epson','star','generic','qztray','browser')),
        connection_type  VARCHAR(20) NOT NULL
                           CHECK (connection_type IN ('wifi','usb','network','browser')),
        model            VARCHAR(60),
        ip               INET,
        port             INTEGER NOT NULL DEFAULT 8008,
        paper_width      SMALLINT NOT NULL DEFAULT 80
                           CHECK (paper_width IN (58, 80, 210)),
        is_default       BOOLEAN NOT NULL DEFAULT FALSE,
        document_types   TEXT[] NOT NULL DEFAULT '{}',
        last_seen_at     TIMESTAMPTZ,
        is_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE print_jobs (
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

      CREATE INDEX idx_print_jobs_printed_at ON print_jobs(printed_at DESC);
      CREATE INDEX idx_print_jobs_printer    ON print_jobs(printer_id);
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      DROP TABLE IF EXISTS print_jobs;
      DROP TABLE IF EXISTS printers;
    `);
    }
}
