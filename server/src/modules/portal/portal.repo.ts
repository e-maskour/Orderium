import { getPool } from '../../db/pool';
import { Portal, CreatePortalDTO, PortalWithCustomer } from './portal.model';
import { logger } from '../../utils/logger';
import sql from 'mssql';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export class PortalRepository {
  // Initialize Portal table if it doesn't exist
  async initialize(): Promise<void> {
    try {
      const pool = await getPool();
      
      // Check if table exists
      const tableExists = await pool.request()
        .query(`
          SELECT * FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = 'Portal'
        `);
      
      if (tableExists.recordset.length === 0) {
        // Create Portal table
        await pool.request().query(`
          CREATE TABLE Portal (
            Id INT IDENTITY(1,1) PRIMARY KEY,
            PhoneNumber NVARCHAR(50) NOT NULL UNIQUE,
            Password NVARCHAR(255) NOT NULL,
            CustomerId INT NULL,
            IsCustomer BIT NOT NULL DEFAULT 0,
            IsDelivery BIT NOT NULL DEFAULT 0,
            DeliveryId INT NULL,
            DateCreated DATETIME NOT NULL DEFAULT GETDATE(),
            DateUpdated DATETIME NOT NULL DEFAULT GETDATE()
          )
        `);
        
        logger.info('Portal table created successfully');
      } else {
        // Check if DeliveryId column exists
        const deliveryIdExists = await pool.request()
          .query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Portal' 
            AND COLUMN_NAME = 'DeliveryId'
          `);
        
        if (deliveryIdExists.recordset.length === 0) {
          // Add DeliveryId and IsDelivery columns
          await pool.request().query(`
            ALTER TABLE Portal
            ADD DeliveryId INT NULL,
                IsDelivery BIT NOT NULL DEFAULT 0
          `);
          logger.info('Added DeliveryId and IsDelivery columns to Portal table');
        }
      }
    } catch (err) {
      logger.error(err, 'Failed to initialize Portal table');
      throw err;
    }
  }

  // Hash password
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  // Verify password
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Create portal user
  async create(data: CreatePortalDTO): Promise<Portal> {
    try {
      const pool = await getPool();
      const hashedPassword = await this.hashPassword(data.Password);
      const now = new Date();
      
      const result = await pool.request()
        .input('PhoneNumber', sql.NVarChar, data.PhoneNumber)
        .input('Password', sql.NVarChar, hashedPassword)
        .input('CustomerId', sql.Int, data.CustomerId || null)
        .input('IsCustomer', sql.Bit, data.IsCustomer ?? false)
        .input('IsDelivery', sql.Bit, data.IsDelivery ?? false)
        .input('DeliveryId', sql.Int, data.DeliveryId || null)
        .input('DateCreated', sql.DateTime, now)
        .input('DateUpdated', sql.DateTime, now)
        .query(`
          INSERT INTO Portal (PhoneNumber, Password, CustomerId, IsCustomer, IsDelivery, DeliveryId, DateCreated, DateUpdated)
          OUTPUT INSERTED.*
          VALUES (@PhoneNumber, @Password, @CustomerId, @IsCustomer, @IsDelivery, @DeliveryId, @DateCreated, @DateUpdated)
        `);
      
      return result.recordset[0];
    } catch (err) {
      logger.error(err, 'Failed to create portal user');
      throw err;
    }
  }

  // Find by phone number
  async findByPhone(phoneNumber: string): Promise<Portal | null> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('PhoneNumber', sql.NVarChar, phoneNumber)
        .query('SELECT * FROM Portal WHERE PhoneNumber = @PhoneNumber');
      
      return result.recordset[0] || null;
    } catch (err) {
      logger.error(err, 'Failed to find portal user by phone');
      throw err;
    }
  }

  // Login (verify phone and password)
  async login(phoneNumber: string, password: string): Promise<PortalWithCustomer | null> {
    try {
      const portalUser = await this.findByPhone(phoneNumber);
      
      if (!portalUser) {
        return null;
      }
      
      const isValid = await this.verifyPassword(password, portalUser.Password);
      
      if (!isValid) {
        return null;
      }
      
      // Get customer name if CustomerId exists
      let customerName: string | undefined;
      if (portalUser.CustomerId) {
        const pool = await getPool();
        const customerResult = await pool.request()
          .input('CustomerId', sql.Int, portalUser.CustomerId)
          .query('SELECT Name FROM Customer WHERE Id = @CustomerId AND IsEnabled = 1');
        
        customerName = customerResult.recordset[0]?.Name;
      }
      
      return {
        Id: portalUser.Id,
        PhoneNumber: portalUser.PhoneNumber,
        CustomerId: portalUser.CustomerId,
        CustomerName: customerName,
        IsCustomer: portalUser.IsCustomer,
        IsDelivery: portalUser.IsDelivery,
        DeliveryId: portalUser.DeliveryId,
      };
    } catch (err) {
      logger.error(err, 'Failed to login');
      throw err;
    }
  }

  // Update password
  async updatePassword(phoneNumber: string, newPassword: string): Promise<boolean> {
    try {
      const pool = await getPool();
      const hashedPassword = await this.hashPassword(newPassword);
      const now = new Date();
      
      const result = await pool.request()
        .input('PhoneNumber', sql.NVarChar, phoneNumber)
        .input('Password', sql.NVarChar, hashedPassword)
        .input('DateUpdated', sql.DateTime, now)
        .query(`
          UPDATE Portal 
          SET Password = @Password, DateUpdated = @DateUpdated
          WHERE PhoneNumber = @PhoneNumber
        `);
      
      return result.rowsAffected[0] > 0;
    } catch (err) {
      logger.error(err, 'Failed to update password');
      throw err;
    }
  }

  // Get portal user with customer info
  async getWithCustomer(phoneNumber: string): Promise<PortalWithCustomer | null> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('PhoneNumber', sql.NVarChar, phoneNumber)
        .query(`
          SELECT 
            p.Id, p.PhoneNumber, p.CustomerId, p.IsCustomer, p.IsDelivery, p.DeliveryId,
            c.Name as CustomerName
          FROM Portal p
          LEFT JOIN Customer c ON p.CustomerId = c.Id AND c.IsEnabled = 1
          WHERE p.PhoneNumber = @PhoneNumber
        `);
      
      return result.recordset[0] || null;
    } catch (err) {
      logger.error(err, 'Failed to get portal user with customer');
      throw err;
    }
  }
}

export const portalRepository = new PortalRepository();
