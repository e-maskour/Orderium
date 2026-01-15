import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as mssql from 'mssql';

config();

// SQL Server configuration
const sqlServerConfig: mssql.config = {
  user: process.env.SQLSERVER_USER || 'sa',
  password: process.env.SQLSERVER_PASSWORD || '',
  server: process.env.SQLSERVER_HOST || 'localhost',
  database: process.env.SQLSERVER_DATABASE || 'orderium_db',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// PostgreSQL DataSource
const postgresDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'orderium_db',
  synchronize: false,
  logging: true,
});

interface SqlServerProduct {
  Id: number;
  Name: string;
  Code: string | null;
  Description: string | null;
  Price: number;
  Cost: number;
  IsService: boolean;
  IsEnabled: boolean;
  IsPriceChangeAllowed: boolean;
  ImageUrl: string | null;
  Stock: number | null;
  DateCreated: Date;
  DateUpdated: Date;
}

async function migrateProducts() {
  let sqlServerPool: mssql.ConnectionPool | null = null;

  try {
    console.log('🔌 Connecting to SQL Server...');
    sqlServerPool = await mssql.connect(sqlServerConfig);
    console.log('✅ Connected to SQL Server');

    console.log('🔌 Connecting to PostgreSQL...');
    await postgresDataSource.initialize();
    console.log('✅ Connected to PostgreSQL');

    // Fetch products from SQL Server
    console.log('📥 Fetching products from SQL Server...');
    const result = await sqlServerPool.request().query<SqlServerProduct>(`
      SELECT 
        Id,
        Name,
        Code,
        Description,
        Price,
        Cost,
        IsService,
        IsEnabled,
        IsPriceChangeAllowed,
        ImageUrl,
        Stock,
        DateCreated,
        DateUpdated
      FROM Product
      WHERE IsEnabled = 1
      ORDER BY Id
    `);

    const products = result.recordset;
    console.log(`📊 Found ${products.length} products to migrate`);

    if (products.length === 0) {
      console.log('⚠️  No products to migrate');
      return;
    }

    // Insert products into PostgreSQL
    console.log('📤 Inserting products into PostgreSQL...');
    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        await postgresDataSource.query(
          `
          INSERT INTO products (
            name, code, description, price, cost,
            "isService", "isEnabled", "isPriceChangeAllowed",
            "imageUrl", stock, "dateCreated", "dateUpdated"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
          )
          ON CONFLICT DO NOTHING
        `,
          [
            product.Name,
            product.Code,
            product.Description,
            product.Price,
            product.Cost,
            product.IsService,
            product.IsEnabled,
            product.IsPriceChangeAllowed,
            product.ImageUrl,
            product.Stock,
            product.DateCreated,
            product.DateUpdated,
          ],
        );
        successCount++;
        console.log(`✅ Migrated: ${product.Name} (ID: ${product.Id})`);
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Error migrating product ${product.Name}:`,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total products: ${products.length}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close connections
    if (sqlServerPool) {
      await sqlServerPool.close();
      console.log('🔌 SQL Server connection closed');
    }
    if (postgresDataSource.isInitialized) {
      await postgresDataSource.destroy();
      console.log('🔌 PostgreSQL connection closed');
    }
  }
}

// Run migration
migrateProducts()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
