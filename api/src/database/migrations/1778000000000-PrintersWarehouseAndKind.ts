import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ties printers to a warehouse (a physical shop) so print jobs can be routed
 * to the right branch, and separates device kind from manufacturer.
 *
 * `brand` previously mixed real manufacturers with transports ('qztray',
 * 'browser'); those transports were removed because a browser cannot reach a
 * printer over HTTPS. `kind` now says whether a device speaks ESC/POS or takes
 * a PDF through the OS spooler — `document_types` alone could not express that.
 *
 * warehouse_id is intentionally nullable: a tenant with no warehouses leaves
 * existing printers unassigned rather than blocking the migration. The dispatch
 * service refuses to queue a job to a printer without a warehouse.
 */
export class PrintersWarehouseAndKind1778000000000 implements MigrationInterface {
  name = 'PrintersWarehouseAndKind1778000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE printers ADD COLUMN IF NOT EXISTS warehouse_id integer`,
    );
    await q.query(
      `ALTER TABLE printers ADD COLUMN IF NOT EXISTS kind varchar(20) NOT NULL DEFAULT 'thermal'`,
    );
    await q.query(
      `ALTER TABLE printers ADD COLUMN IF NOT EXISTS system_name varchar(120)`,
    );

    // Existing printers belong to the tenant's first warehouse.
    await q.query(`
      UPDATE printers
         SET warehouse_id = (SELECT id FROM warehouses ORDER BY id LIMIT 1)
       WHERE warehouse_id IS NULL
    `);
    await q.query(`
      UPDATE printers
         SET kind = CASE WHEN paper_width IN (58, 80) THEN 'thermal' ELSE 'document' END
    `);

    // Narrow brand to real manufacturers.
    await q.query(
      `UPDATE printers SET brand = 'generic' WHERE brand IN ('qztray', 'browser')`,
    );
    await q.query(
      `ALTER TABLE printers DROP CONSTRAINT IF EXISTS printers_brand_check`,
    );
    await q.query(`
      ALTER TABLE printers ADD CONSTRAINT printers_brand_check
        CHECK (brand IN ('epson', 'star', 'generic'))
    `);

    // Narrow connection_type; 'wifi' and 'browser' collapse into 'network',
    // and 'system' is new (an OS spooler queue, used for A4 printers).
    await q.query(
      `UPDATE printers SET connection_type = 'network' WHERE connection_type IN ('wifi', 'browser')`,
    );
    await q.query(
      `ALTER TABLE printers DROP CONSTRAINT IF EXISTS printers_connection_type_check`,
    );
    await q.query(`
      ALTER TABLE printers ADD CONSTRAINT printers_connection_type_check
        CHECK (connection_type IN ('network', 'usb', 'system'))
    `);

    await q.query(`
      ALTER TABLE printers ADD CONSTRAINT printers_kind_check
        CHECK (kind IN ('thermal', 'document'))
    `);

    await q.query(`
      ALTER TABLE printers
        ADD CONSTRAINT fk_printers_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
    `);

    // A printer name is unique per shop, not per tenant: two branches may each
    // have a "Caisse 1".
    await q.query(
      `ALTER TABLE printers DROP CONSTRAINT IF EXISTS printers_name_key`,
    );
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_printers_warehouse_name
        ON printers (warehouse_id, name)
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS idx_printers_warehouse_name`);
    await q.query(
      `ALTER TABLE printers ADD CONSTRAINT printers_name_key UNIQUE (name)`,
    );
    await q.query(
      `ALTER TABLE printers DROP CONSTRAINT IF EXISTS fk_printers_warehouse`,
    );
    await q.query(
      `ALTER TABLE printers DROP CONSTRAINT IF EXISTS printers_kind_check`,
    );

    await q.query(
      `ALTER TABLE printers DROP CONSTRAINT IF EXISTS printers_connection_type_check`,
    );
    await q.query(`
      ALTER TABLE printers ADD CONSTRAINT printers_connection_type_check
        CHECK (connection_type IN ('wifi', 'usb', 'network', 'browser'))
    `);
    await q.query(
      `ALTER TABLE printers DROP CONSTRAINT IF EXISTS printers_brand_check`,
    );
    await q.query(`
      ALTER TABLE printers ADD CONSTRAINT printers_brand_check
        CHECK (brand IN ('epson', 'star', 'generic', 'qztray', 'browser'))
    `);

    await q.query(`ALTER TABLE printers DROP COLUMN IF EXISTS system_name`);
    await q.query(`ALTER TABLE printers DROP COLUMN IF EXISTS kind`);
    await q.query(`ALTER TABLE printers DROP COLUMN IF EXISTS warehouse_id`);
  }
}
