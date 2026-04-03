import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1743600000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1743600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enable pg_trgm for fast ILIKE '%search%' queries ───────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // ─── PRODUCTS ───────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_isEnabled_name" ON "products" ("isEnabled", "name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_name_trgm" ON "products" USING gin ("name" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_code_trgm" ON "products" USING gin ("code" gin_trgm_ops)`,
    );

    // ─── ORDERS ─────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_deliveryStatus_dateCreated" ON "orders" ("deliveryStatus", "dateCreated" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_fromPortal_dateCreated" ON "orders" ("fromPortal", "dateCreated" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_fromClient_dateCreated" ON "orders" ("fromClient", "dateCreated" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_dateCreated_desc" ON "orders" ("dateCreated" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_documentNumber_trgm" ON "orders" USING gin ("documentNumber" gin_trgm_ops)`,
    );

    // ─── INVOICES ───────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invoices_status_dateCreated" ON "invoices" ("status", "dateCreated" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invoices_customerId_dateCreated" ON "invoices" ("customerId", "dateCreated" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invoices_documentNumber_trgm" ON "invoices" USING gin ("documentNumber" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invoices_dateCreated_desc" ON "invoices" ("dateCreated" DESC)`,
    );

    // ─── QUOTES ─────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_quotes_status_dateCreated" ON "quotes" ("status", "dateCreated" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_quotes_documentNumber_trgm" ON "quotes" USING gin ("documentNumber" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_quotes_dateCreated_desc" ON "quotes" ("dateCreated" DESC)`,
    );

    // ─── PARTNERS ───────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_partners_name_trgm" ON "partners" USING gin ("name" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_partners_isCustomer_isEnabled" ON "partners" ("isCustomer", "isEnabled")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_partners_isSupplier_isEnabled" ON "partners" ("isSupplier", "isEnabled")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_partners_isEnabled_name" ON "partners" ("isEnabled", "name")`,
    );

    // ─── CATEGORIES ─────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_categories_isActive_type_name" ON "categories" ("isActive", "type", "name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_categories_parentId_isActive" ON "categories" ("parentId", "isActive")`,
    );

    // ─── DELIVERY ───────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_delivery_deliveryPersonId" ON "orders_delivery" ("deliveryPersonId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_delivery_status_deliveryPersonId" ON "orders_delivery" ("status", "deliveryPersonId")`,
    );

    // ─── NOTIFICATIONS ──────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_userId_isRead" ON "notifications" ("userId", "isRead")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_userId_isArchived" ON "notifications" ("userId", "isArchived")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_userId_dateCreated" ON "notifications" ("userId", "dateCreated" DESC)`,
    );

    // ─── PORTAL (Users) ─────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_portal_name_trgm" ON "portal" USING gin ("name" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_portal_isAdmin_isActive" ON "portal" ("isAdmin", "isActive")`,
    );

    // ─── STOCK MOVEMENTS ────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_movements_status_dateCreated" ON "stock_movements" ("status", "dateCreated" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_movements_productId_status" ON "stock_movements" ("productId", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Stock movements
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stock_movements_productId_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stock_movements_status_dateCreated"`,
    );
    // Portal
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_portal_isAdmin_isActive"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_portal_name_trgm"`);
    // Notifications
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_userId_dateCreated"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_userId_isArchived"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_userId_isRead"`,
    );
    // Delivery
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_delivery_status_deliveryPersonId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_delivery_deliveryPersonId"`,
    );
    // Categories
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_categories_parentId_isActive"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_categories_isActive_type_name"`,
    );
    // Partners
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_partners_isEnabled_name"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_partners_isSupplier_isEnabled"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_partners_isCustomer_isEnabled"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_partners_name_trgm"`);
    // Quotes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_quotes_dateCreated_desc"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_quotes_documentNumber_trgm"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_quotes_status_dateCreated"`,
    );
    // Invoices
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_invoices_dateCreated_desc"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_invoices_documentNumber_trgm"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_invoices_customerId_dateCreated"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_invoices_status_dateCreated"`,
    );
    // Orders
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_documentNumber_trgm"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_dateCreated_desc"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_fromClient_dateCreated"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_fromPortal_dateCreated"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_deliveryStatus_dateCreated"`,
    );
    // Products
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_code_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_name_trgm"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_products_isEnabled_name"`,
    );
  }
}
