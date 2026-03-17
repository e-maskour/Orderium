import { DataSource } from 'typeorm';

/**
 * Idempotently applies the stock-sync trigger on `stock_quants`.
 *
 * Mirrors the SQL originally introduced in migration
 * 1769213864008-AddStockTriggerToProducts, but safe to re-run on any
 * existing tenant DB (CREATE OR REPLACE for the function, DROP IF EXISTS
 * before each trigger).
 */
export async function applyStockTrigger(dataSource: DataSource): Promise<void> {
    await dataSource.query(`
    CREATE OR REPLACE FUNCTION update_product_stock()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE products
      SET stock = (
        SELECT COALESCE(SUM(quantity), 0)
        FROM stock_quants
        WHERE "productId" = COALESCE(NEW."productId", OLD."productId")
      )
      WHERE id = COALESCE(NEW."productId", OLD."productId");

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

    await dataSource.query(
        `DROP TRIGGER IF EXISTS trigger_update_product_stock_insert ON stock_quants`,
    );
    await dataSource.query(`
    CREATE TRIGGER trigger_update_product_stock_insert
    AFTER INSERT ON stock_quants
    FOR EACH ROW EXECUTE FUNCTION update_product_stock()
  `);

    await dataSource.query(
        `DROP TRIGGER IF EXISTS trigger_update_product_stock_update ON stock_quants`,
    );
    await dataSource.query(`
    CREATE TRIGGER trigger_update_product_stock_update
    AFTER UPDATE ON stock_quants
    FOR EACH ROW EXECUTE FUNCTION update_product_stock()
  `);

    await dataSource.query(
        `DROP TRIGGER IF EXISTS trigger_update_product_stock_delete ON stock_quants`,
    );
    await dataSource.query(`
    CREATE TRIGGER trigger_update_product_stock_delete
    AFTER DELETE ON stock_quants
    FOR EACH ROW EXECUTE FUNCTION update_product_stock()
  `);

    console.log('  ✓ Stock trigger applied (update_product_stock)');
}
