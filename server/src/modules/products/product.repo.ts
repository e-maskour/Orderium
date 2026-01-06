import { getPool } from "../../db/pool";
import { Product, CreateProductDTO, UpdateProductDTO } from "./product.model";
import sql from 'mssql';
import logger from "../../utils/logger";

// Initialize - check and add missing columns
export async function initializeProductTable(): Promise<void> {
  try {
    const pool = await getPool();
    
    // Check if ImageUrl column exists
    const checkImageUrl = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Product' 
      AND COLUMN_NAME = 'ImageUrl'
    `);
    
    if (checkImageUrl.recordset.length === 0) {
      await pool.request().query(`ALTER TABLE Product ADD ImageUrl NVARCHAR(MAX) NULL`);
      logger.info('✅ Added ImageUrl column to Product table');
    } else {
      // Check if existing column needs to be modified to MAX
      const checkSize = await pool.request().query(`
        SELECT CHARACTER_MAXIMUM_LENGTH 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Product' 
        AND COLUMN_NAME = 'ImageUrl'
      `);
      
      if (checkSize.recordset[0]?.CHARACTER_MAXIMUM_LENGTH !== -1) {
        // -1 means MAX, so if it's not -1, we need to alter it
        await pool.request().query(`ALTER TABLE Product ALTER COLUMN ImageUrl NVARCHAR(MAX) NULL`);
        logger.info('✅ Updated ImageUrl column to NVARCHAR(MAX)');
      }
    }

    // Check if Stock column exists
    const checkStock = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Product' 
      AND COLUMN_NAME = 'Stock'
    `);
    
    if (checkStock.recordset.length === 0) {
      await pool.request().query(`ALTER TABLE Product ADD Stock INT NULL`);
      logger.info('✅ Added Stock column to Product table');
    }
  } catch (error) {
    logger.error('❌ Error initializing Product table:', error);
    throw error;
  }
}

export async function findProducts(
  limit: number,
  offset: number,
  search?: string
): Promise<Product[]> {

  const pool = await getPool();

  const request = pool.request()
    .input("limit", limit)
    .input("offset", offset);

  let where = "WHERE IsEnabled = 1";

  if (search) {
    where += " AND Name LIKE @search";
    request.input("search", `%${search}%`);
  }

  const result = await request.query(`
    SELECT
      Id, Name, Code, Description,
      Price, Cost, IsService, IsEnabled,
      DateCreated, DateUpdated, ImageUrl, Stock
    FROM Product
    ${where}
    ORDER BY Name
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);

  return result.recordset;
}

export async function getTotalProductCount(search?: string): Promise<number> {
  const pool = await getPool();
  const request = pool.request();

  let where = "WHERE IsEnabled = 1";

  if (search) {
    where += " AND Name LIKE @search";
    request.input("search", `%${search}%`);
  }

  const result = await request.query(`
    SELECT COUNT(*) as total
    FROM Product
    ${where}
  `);

  return result.recordset[0].total;
}

export async function getProductById(id: number): Promise<Product | null> {
  const pool = await getPool();
  const request = pool.request().input("id", sql.Int, id);

  const result = await request.query(`
    SELECT
      Id, Name, Code, Description,
      Price, Cost, IsService, IsEnabled,
      DateCreated, DateUpdated, ImageUrl, Stock
    FROM Product
    WHERE Id = @id
  `);

  return result.recordset[0] || null;
}

export async function createProduct(data: CreateProductDTO): Promise<Product> {
  const pool = await getPool();
  const request = pool.request()
    .input("name", sql.NVarChar, data.Name)
    .input("code", sql.NVarChar, data.Code || null)
    .input("description", sql.NVarChar, data.Description || null)
    .input("price", sql.Decimal(18, 2), data.Price)
    .input("cost", sql.Decimal(18, 2), data.Cost)
    .input("stock", sql.Int, data.Stock || null)
    .input("isService", sql.Bit, data.IsService || false)
    .input("isEnabled", sql.Bit, data.IsEnabled !== false)
    .input("imageUrl", sql.NVarChar, data.ImageUrl || null);

  const result = await request.query(`
    INSERT INTO Product (Name, Code, Description, Price, Cost, Stock, IsService, IsEnabled, ImageUrl, DateCreated, DateUpdated)
    OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Code, INSERTED.Description,
           INSERTED.Price, INSERTED.Cost, INSERTED.Stock, INSERTED.IsService, 
           INSERTED.IsEnabled, INSERTED.DateCreated, INSERTED.DateUpdated, INSERTED.ImageUrl
    VALUES (@name, @code, @description, @price, @cost, @stock, @isService, @isEnabled, @imageUrl, GETDATE(), GETDATE())
  `);

  return result.recordset[0];
}

export async function updateProduct(id: number, data: UpdateProductDTO): Promise<Product | null> {
  const pool = await getPool();
  
  // Build dynamic update query
  const updates: string[] = [];
  const request = pool.request().input("id", sql.Int, id);

  if (data.Name !== undefined) {
    updates.push("Name = @name");
    request.input("name", sql.NVarChar, data.Name);
  }
  if (data.Code !== undefined) {
    updates.push("Code = @code");
    request.input("code", sql.NVarChar, data.Code);
  }
  if (data.Description !== undefined) {
    updates.push("Description = @description");
    request.input("description", sql.NVarChar, data.Description);
  }
  if (data.Price !== undefined) {
    updates.push("Price = @price");
    request.input("price", sql.Decimal(18, 2), data.Price);
  }
  if (data.Cost !== undefined) {
    updates.push("Cost = @cost");
    request.input("cost", sql.Decimal(18, 2), data.Cost);
  }
  if (data.Stock !== undefined) {
    updates.push("Stock = @stock");
    request.input("stock", sql.Int, data.Stock);
  }
  if (data.IsService !== undefined) {
    updates.push("IsService = @isService");
    request.input("isService", sql.Bit, data.IsService);
  }
  if (data.IsEnabled !== undefined) {
    updates.push("IsEnabled = @isEnabled");
    request.input("isEnabled", sql.Bit, data.IsEnabled);
  }
  if (data.ImageUrl !== undefined) {
    updates.push("ImageUrl = @imageUrl");
    request.input("imageUrl", sql.NVarChar, data.ImageUrl);
  }

  if (updates.length === 0) {
    return await getProductById(id);
  }

  updates.push("DateUpdated = GETDATE()");

  const result = await request.query(`
    UPDATE Product
    SET ${updates.join(", ")}
    OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Code, INSERTED.Description,
           INSERTED.Price, INSERTED.Cost, INSERTED.Stock, INSERTED.IsService, 
           INSERTED.IsEnabled, INSERTED.DateCreated, INSERTED.DateUpdated, INSERTED.ImageUrl
    WHERE Id = @id
  `);

  return result.recordset[0] || null;
}

export async function deleteProduct(id: number): Promise<boolean> {
  const pool = await getPool();
  const request = pool.request().input("id", sql.Int, id);

  // Soft delete - set IsEnabled to false
  const result = await request.query(`
    UPDATE Product
    SET IsEnabled = 0, DateUpdated = GETDATE()
    WHERE Id = @id
  `);

  return result.rowsAffected[0] > 0;
}
