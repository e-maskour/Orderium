import { getPool } from '../../db/pool';
import { Customer, CreateCustomerDTO, UpdateCustomerDTO } from './customer.model';
import { logger } from '../../utils/logger';
import sql from 'mssql';

export class CustomerRepository {
  // Initialize - check and add missing columns
  async initialize(): Promise<void> {
    try {
      const pool = await getPool();
      
      // Check if Latitude column exists
      const checkColumns = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Customer' 
        AND COLUMN_NAME IN ('Latitude', 'Longitude', 'GoogleMapsUrl', 'WazeUrl')
      `);
      
      const existingColumns = checkColumns.recordset.map((r: any) => r.COLUMN_NAME);
      
      // Add missing columns
      if (!existingColumns.includes('Latitude')) {
        await pool.request().query(`ALTER TABLE Customer ADD Latitude decimal(10, 7) NULL`);
        logger.info('✅ Added Latitude column to Customer table');
      }
      
      if (!existingColumns.includes('Longitude')) {
        await pool.request().query(`ALTER TABLE Customer ADD Longitude decimal(10, 7) NULL`);
        logger.info('✅ Added Longitude column to Customer table');
      }
      
      if (!existingColumns.includes('GoogleMapsUrl')) {
        await pool.request().query(`ALTER TABLE Customer ADD GoogleMapsUrl nvarchar(500) NULL`);
        logger.info('✅ Added GoogleMapsUrl column to Customer table');
      }
      
      if (!existingColumns.includes('WazeUrl')) {
        await pool.request().query(`ALTER TABLE Customer ADD WazeUrl nvarchar(500) NULL`);
        logger.info('✅ Added WazeUrl column to Customer table');
      }
    } catch (err) {
      logger.error(err, '❌ Failed to initialize Customer table');
      throw err;
    }
  }

  // Search customer by phone
  async findByPhone(phone: string): Promise<Customer | null> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('phone', sql.NVarChar, phone)
        .query(`
          SELECT * FROM Customer 
          WHERE PhoneNumber = @phone AND IsEnabled = 1 AND IsCustomer = 1
        `);
      
      return result.recordset[0] || null;
    } catch (err) {
      logger.error(err, 'Failed to find customer by phone');
      throw err;
    }
  }

  // Search customers by partial phone (for autocomplete)
  async searchByPhone(phonePrefix: string, limit = 10): Promise<Customer[]> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('phonePrefix', sql.NVarChar, `${phonePrefix}%`)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT TOP (@limit) * FROM Customer 
          WHERE PhoneNumber LIKE @phonePrefix 
          AND IsEnabled = 1 AND IsCustomer = 1
          ORDER BY DateUpdated DESC, DateCreated DESC
        `);
      
      return result.recordset;
    } catch (err) {
      logger.error(err, 'Failed to search customers by phone');
      throw err;
    }
  }

  // Get all customers (with pagination)
  async findAll(limit = 50, offset = 0): Promise<Customer[]> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('limit', sql.Int, limit)
        .input('offset', sql.Int, offset)
        .query(`
          SELECT * FROM Customer 
          WHERE IsEnabled = 1 AND IsCustomer = 1
          ORDER BY DateUpdated DESC, DateCreated DESC
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);
      
      return result.recordset;
    } catch (err) {
      logger.error(err, 'Failed to fetch all customers');
      throw err;
    }
  }

  // Get customer by ID
  async findById(id: number): Promise<Customer | null> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`SELECT * FROM Customer WHERE Id = @id`);
      
      return result.recordset[0] || null;
    } catch (err) {
      logger.error(err, 'Failed to find customer by ID');
      throw err;
    }
  }

  // Create new customer
  async create(data: CreateCustomerDTO): Promise<Customer> {
    try {
      const pool = await getPool();
      const now = new Date();
      
      const result = await pool.request()
        .input('Name', sql.NVarChar, data.Name)
        .input('PhoneNumber', sql.NVarChar, data.PhoneNumber)
        .input('Email', sql.NVarChar, data.Email || null)
        .input('Address', sql.NVarChar, data.Address || null)
        .input('City', sql.NVarChar, data.City || null)
        .input('PostalCode', sql.VarChar, data.PostalCode || null)
        .input('Latitude', sql.Decimal(10, 7), data.Latitude || null)
        .input('Longitude', sql.Decimal(10, 7), data.Longitude || null)
        .input('GoogleMapsUrl', sql.NVarChar, data.GoogleMapsUrl || null)
        .input('WazeUrl', sql.NVarChar, data.WazeUrl || null)
        .input('DateCreated', sql.DateTime, now)
        .input('DateUpdated', sql.DateTime, now)
        .query(`
          INSERT INTO Customer (
            Name, PhoneNumber, Email, Address, City, PostalCode,
            Latitude, Longitude, GoogleMapsUrl, WazeUrl,
            IsEnabled, IsCustomer, IsSupplier, DueDatePeriod, IsTaxExempt,
            DateCreated, DateUpdated
          )
          OUTPUT INSERTED.Id
          VALUES (
            @Name, @PhoneNumber, @Email, @Address, @City, @PostalCode,
            @Latitude, @Longitude, @GoogleMapsUrl, @WazeUrl,
            1, 1, 0, 0, 0,
            @DateCreated, @DateUpdated
          )
        `);
      
      const newId = result.recordset[0].Id;
      return (await this.findById(newId))!;
    } catch (err) {
      logger.error(err, 'Failed to create customer');
      throw err;
    }
  }

  // Update customer
  async update(phone: string, data: UpdateCustomerDTO): Promise<Customer | null> {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      const updates: string[] = [];
      
      if (data.Name !== undefined) {
        updates.push('Name = @Name');
        request.input('Name', sql.NVarChar, data.Name);
      }
      if (data.Email !== undefined) {
        updates.push('Email = @Email');
        request.input('Email', sql.NVarChar, data.Email);
      }
      if (data.Address !== undefined) {
        updates.push('Address = @Address');
        request.input('Address', sql.NVarChar, data.Address);
      }
      if (data.City !== undefined) {
        updates.push('City = @City');
        request.input('City', sql.NVarChar, data.City);
      }
      if (data.PostalCode !== undefined) {
        updates.push('PostalCode = @PostalCode');
        request.input('PostalCode', sql.VarChar, data.PostalCode);
      }
      if (data.Latitude !== undefined) {
        updates.push('Latitude = @Latitude');
        request.input('Latitude', sql.Decimal(10, 7), data.Latitude);
      }
      if (data.Longitude !== undefined) {
        updates.push('Longitude = @Longitude');
        request.input('Longitude', sql.Decimal(10, 7), data.Longitude);
      }
      if (data.GoogleMapsUrl !== undefined) {
        updates.push('GoogleMapsUrl = @GoogleMapsUrl');
        request.input('GoogleMapsUrl', sql.NVarChar, data.GoogleMapsUrl);
      }
      if (data.WazeUrl !== undefined) {
        updates.push('WazeUrl = @WazeUrl');
        request.input('WazeUrl', sql.NVarChar, data.WazeUrl);
      }

      if (updates.length === 0) {
        return this.findByPhone(phone);
      }

      updates.push('DateUpdated = @DateUpdated');
      request.input('DateUpdated', sql.DateTime, new Date());
      request.input('PhoneNumber', sql.NVarChar, phone);

      await request.query(`
        UPDATE Customer 
        SET ${updates.join(', ')} 
        WHERE PhoneNumber = @PhoneNumber
      `);
      
      return this.findByPhone(phone);
    } catch (err) {
      logger.error(err, 'Failed to update customer');
      throw err;
    }
  }

  // Upsert (create or update)
  async upsert(data: CreateCustomerDTO): Promise<Customer> {
    const existing = await this.findByPhone(data.PhoneNumber);
    
    if (existing) {
      return (await this.update(data.PhoneNumber, data))!;
    } else {
      return this.create(data);
    }
  }

  // Delete customer (soft delete)
  async delete(phone: string): Promise<boolean> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('PhoneNumber', sql.NVarChar, phone)
        .input('DateUpdated', sql.DateTime, new Date())
        .query(`
          UPDATE Customer 
          SET IsEnabled = 0, DateUpdated = @DateUpdated
          WHERE PhoneNumber = @PhoneNumber
        `);
      
      return result.rowsAffected[0] > 0;
    } catch (err) {
      logger.error(err, 'Failed to delete customer');
      throw err;
    }
  }

  // Get total count
  async count(): Promise<number> {
    try {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT COUNT(*) as count FROM Customer 
        WHERE IsEnabled = 1 AND IsCustomer = 1
      `);
      
      return result.recordset[0].count;
    } catch (err) {
      logger.error(err, 'Failed to count customers');
      throw err;
    }
  }
}

export const customerRepo = new CustomerRepository();
