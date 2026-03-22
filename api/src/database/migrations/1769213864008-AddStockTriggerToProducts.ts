import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockTriggerToProducts1769213864008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create function to update product stock
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_product_stock()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Update product stock with total quantity from stock_quants
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

    // Create trigger on INSERT
    await queryRunner.query(`
            CREATE TRIGGER trigger_update_product_stock_insert
            AFTER INSERT ON stock_quants
            FOR EACH ROW
            EXECUTE FUNCTION update_product_stock();
        `);

    // Create trigger on UPDATE
    await queryRunner.query(`
            CREATE TRIGGER trigger_update_product_stock_update
            AFTER UPDATE ON stock_quants
            FOR EACH ROW
            EXECUTE FUNCTION update_product_stock();
        `);

    // Create trigger on DELETE
    await queryRunner.query(`
            CREATE TRIGGER trigger_update_product_stock_delete
            AFTER DELETE ON stock_quants
            FOR EACH ROW
            EXECUTE FUNCTION update_product_stock();
        `);

    // Initialize existing products with current stock totals
    await queryRunner.query(`
            UPDATE products p
            SET stock = (
                SELECT COALESCE(SUM(quantity), 0)
                FROM stock_quants sq
                WHERE sq."productId" = p.id
            );
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_update_product_stock_insert ON stock_quants;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_update_product_stock_update ON stock_quants;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_update_product_stock_delete ON stock_quants;`,
    );

    // Drop function
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_product_stock();`);
  }
}
