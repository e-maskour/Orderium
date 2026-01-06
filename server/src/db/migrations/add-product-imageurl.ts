import { getPool } from "../pool";
import logger from "../../utils/logger";

export async function addProductImageUrlColumn(): Promise<void> {
  try {
    const pool = await getPool();
    
    // Check if ImageUrl column exists
    const checkColumn = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Product' 
      AND COLUMN_NAME = 'ImageUrl'
    `);
    
    if (checkColumn.recordset.length === 0) {
      // Add ImageUrl column
      await pool.request().query(`
        ALTER TABLE Product 
        ADD ImageUrl NVARCHAR(500) NULL
      `);
      logger.info('✅ Added ImageUrl column to Product table');
    } else {
      logger.info('✅ ImageUrl column already exists in Product table');
    }

    // Check if Stock column exists
    const checkStock = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Product' 
      AND COLUMN_NAME = 'Stock'
    `);
    
    if (checkStock.recordset.length === 0) {
      // Add Stock column
      await pool.request().query(`
        ALTER TABLE Product 
        ADD Stock INT NULL
      `);
      logger.info('✅ Added Stock column to Product table');
    } else {
      logger.info('✅ Stock column already exists in Product table');
    }
    
  } catch (error) {
    logger.error('❌ Error adding Product columns:', error);
    throw error;
  }
}
