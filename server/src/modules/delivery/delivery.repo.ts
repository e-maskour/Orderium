import { getPool } from '../../db/pool';
import type { DeliveryPerson, CreateDeliveryPersonDTO, UpdateDeliveryPersonDTO, DeliveryOrder } from './delivery.model';
import sql from 'mssql';
import { emitOrderAssigned, emitOrderStatusChanged, emitOrderCancelled } from '../../socket/events/orderEvents';

class DeliveryRepository {
  // Initialize DeliveryPersons table
  async initialize() {
    const pool = await getPool();
    
    // Create DeliveryPersons table if it doesn't exist
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DeliveryPersons')
      BEGIN
        CREATE TABLE DeliveryPersons (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          Name NVARCHAR(255) NOT NULL,
          PhoneNumber NVARCHAR(20) NOT NULL UNIQUE,
          Email NVARCHAR(255),
          IsActive BIT NOT NULL DEFAULT 1,
          DateCreated DATETIME2 NOT NULL DEFAULT GETDATE(),
          DateUpdated DATETIME2 NOT NULL DEFAULT GETDATE()
        )
      END
    `);

    // Create OrdersDelivery table if it doesn't exist
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrdersDelivery')
      BEGIN
        CREATE TABLE OrdersDelivery (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          DocumentId INT NOT NULL,
          CustomerId INT NOT NULL,
          DeliveryId INT NOT NULL,
          Status NVARCHAR(20) NOT NULL DEFAULT 'assigned',
          ConfirmedAt DATETIME2 NULL,
          PickedUpAt DATETIME2 NULL,
          DeliveredAt DATETIME2 NULL,
          CanceledAt DATETIME2 NULL,
          DateCreated DATETIME2 NOT NULL DEFAULT GETDATE(),
          DateUpdated DATETIME2 NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_OrdersDelivery_Delivery FOREIGN KEY (DeliveryId) REFERENCES DeliveryPersons(Id)
        )
      END
    `);

    // Check if Document table exists before trying to alter it
    const documentsTableExists = await pool.request().query(`
      SELECT COUNT(*) as TableCount
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Document'
    `);

    if (documentsTableExists.recordset[0].TableCount > 0) {
      // Check if DeliveryPersonId column exists in Document table
      const columnExists = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Document' 
        AND COLUMN_NAME = 'DeliveryPersonId'
      `);

      if (columnExists.recordset.length === 0) {
        // Add DeliveryPersonId and DeliveryStatus columns to Document table
        await pool.request().query(`
          ALTER TABLE Document
          ADD DeliveryPersonId INT NULL,
              DeliveryStatus NVARCHAR(20) NULL
        `);
      }
    }

    // Check if OrdersDelivery table exists and add CanceledAt column if missing
    const ordersDeliveryExists = await pool.request().query(`
      SELECT COUNT(*) as TableCount
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'OrdersDelivery'
    `);

    if (ordersDeliveryExists.recordset[0].TableCount > 0) {
      // Check if CanceledAt column exists in OrdersDelivery table
      const canceledAtExists = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'OrdersDelivery' 
        AND COLUMN_NAME = 'CanceledAt'
      `);

      if (canceledAtExists.recordset.length === 0) {
        // Add CanceledAt column to OrdersDelivery table
        await pool.request().query(`
          ALTER TABLE OrdersDelivery
          ADD CanceledAt DATETIME2 NULL
        `);
        console.log('CanceledAt column added to OrdersDelivery table');
      }
    }

    console.log('DeliveryPersons and OrdersDelivery tables initialized');
  }

  async create(data: CreateDeliveryPersonDTO): Promise<DeliveryPerson> {
    const pool = await getPool();
    const result = await pool.request()
      .input('Name', sql.NVarChar, data.Name)
      .input('PhoneNumber', sql.NVarChar, data.PhoneNumber)
      .input('Email', sql.NVarChar, data.Email || null)
      .query(`
        INSERT INTO DeliveryPersons (Name, PhoneNumber, Email)
        OUTPUT INSERTED.*
        VALUES (@Name, @PhoneNumber, @Email)
      `);

    return result.recordset[0];
  }

  async findByPhone(phoneNumber: string): Promise<DeliveryPerson | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('PhoneNumber', sql.NVarChar, phoneNumber)
      .query(`
        SELECT * FROM DeliveryPersons
        WHERE PhoneNumber = @PhoneNumber
      `);

    return result.recordset[0] || null;
  }

  async findById(id: number): Promise<DeliveryPerson | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('Id', sql.Int, id)
      .query(`
        SELECT * FROM DeliveryPersons
        WHERE Id = @Id
      `);

    return result.recordset[0] || null;
  }

  async getAll(): Promise<DeliveryPerson[]> {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT * FROM DeliveryPersons
      ORDER BY Name
    `);

    return result.recordset;
  }

  async update(id: number, data: UpdateDeliveryPersonDTO): Promise<DeliveryPerson | null> {
    const pool = await getPool();
    
    const updates: string[] = [];
    const request = pool.request().input('Id', sql.Int, id);

    if (data.Name !== undefined) {
      updates.push('Name = @Name');
      request.input('Name', sql.NVarChar, data.Name);
    }
    if (data.Email !== undefined) {
      updates.push('Email = @Email');
      request.input('Email', sql.NVarChar, data.Email);
    }
    if (data.IsActive !== undefined) {
      updates.push('IsActive = @IsActive');
      request.input('IsActive', sql.Bit, data.IsActive);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('DateUpdated = GETDATE()');

    const result = await request.query(`
      UPDATE DeliveryPersons
      SET ${updates.join(', ')}
      OUTPUT INSERTED.*
      WHERE Id = @Id
    `);

    return result.recordset[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request()
      .input('Id', sql.Int, id)
      .query(`
        DELETE FROM DeliveryPersons
        WHERE Id = @Id
      `);

    return result.rowsAffected[0] > 0;
  }

  // Get orders assigned to a delivery person
  async getAssignedOrders(deliveryPersonId: number, search?: string): Promise<DeliveryOrder[]> {
    const pool = await getPool();
    
    // Check if Document table exists
    const tableExists = await pool.request()
      .query(`
        SELECT COUNT(*) as TableCount
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'Document'
      `);

    if (tableExists.recordset[0].TableCount === 0) {
      console.log('Document table does not exist yet - returning empty orders');
      return [];
    }

    // Build search condition
    let searchCondition = '';
    if (search && search.trim()) {
      searchCondition = `
        AND (
          d.Number LIKE @Search 
          OR c.Name LIKE @Search 
          OR c.PhoneNumber LIKE @Search
        )
      `;
    }

    // Get orders from OrdersDelivery table
    const request = pool.request().input('DeliveryId', sql.Int, deliveryPersonId);
    
    if (search && search.trim()) {
      request.input('Search', sql.NVarChar, `%${search.trim()}%`);
    }

    const result = await request.query(`
        SELECT 
          od.Id as DeliveryId,
          od.DocumentId as OrderId,
          od.Status,
          od.ConfirmedAt,
          od.PickedUpAt,
          od.DeliveredAt,
          od.CanceledAt,
          od.DateCreated as AssignedAt,
          d.Number as OrderNumber,
          c.Name as CustomerName,
          c.PhoneNumber as CustomerPhone,
          c.Address as CustomerAddress,
          c.Latitude,
          c.Longitude,
          c.GoogleMapsUrl,
          c.WazeUrl,
          d.Total as TotalAmount,
          d.DateCreated as CreatedAt
        FROM OrdersDelivery od
        LEFT JOIN Document d ON od.DocumentId = d.Id
        LEFT JOIN Customer c ON od.CustomerId = c.Id
        WHERE od.DeliveryId = @DeliveryId
        ${searchCondition}
        ORDER BY d.DateCreated DESC
      `);

    const orders: DeliveryOrder[] = [];

    for (const row of result.recordset) {
      // Get order items
      const itemsResult = await pool.request()
        .input('DocumentId', sql.Int, row.OrderId)
        .query(`
          SELECT 
            p.Name as ProductName,
            di.Quantity,
            di.Price
          FROM DocumentItem di
          JOIN Product p ON di.ProductId = p.Id
          WHERE di.DocumentId = @DocumentId
        `);

      orders.push({
        OrderId: row.OrderId,
        OrderNumber: row.OrderNumber,
        CustomerName: row.CustomerName || 'Unknown Customer',
        CustomerPhone: row.CustomerPhone || '',
        CustomerAddress: row.CustomerAddress || '',
        Latitude: row.Latitude,
        Longitude: row.Longitude,
        GoogleMapsUrl: row.GoogleMapsUrl,
        WazeUrl: row.WazeUrl,
        TotalAmount: row.TotalAmount,
        Status: row.Status || 'assigned',
        ConfirmedAt: row.ConfirmedAt,
        PickedUpAt: row.PickedUpAt,
        DeliveredAt: row.DeliveredAt,
        CanceledAt: row.CanceledAt,
        CreatedAt: row.CreatedAt,
        AssignedAt: row.AssignedAt,
        Items: itemsResult.recordset.map(item => ({
          ProductName: item.ProductName,
          Quantity: item.Quantity,
          Price: item.Price,
        })),
      });
    }

    return orders;
  }

  // Get all orders (admin view - includes both assigned and unassigned)
  async getAllOrders(search?: string, startDate?: Date, endDate?: Date): Promise<DeliveryOrder[]> {
    const pool = await getPool();
    
    // Check if Document table exists
    const tableExists = await pool.request()
      .query(`
        SELECT COUNT(*) as TableCount
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'Document'
      `);

    if (tableExists.recordset[0].TableCount === 0) {
      console.log('Document table does not exist yet - returning empty orders');
      return [];
    }

    // Build search condition
    let searchCondition = '';
    if (search && search.trim()) {
      searchCondition = `
        AND (
          d.Number LIKE @Search 
          OR c.Name LIKE @Search 
          OR c.PhoneNumber LIKE @Search
          OR dp.Name LIKE @Search
        )
      `;
    }

    // Build date filter condition
    let dateCondition = 'WHERE d.DateCreated >= DATEADD(day, -30, GETDATE())';
    if (startDate && endDate) {
      dateCondition = 'WHERE d.DateCreated >= @StartDate AND d.DateCreated <= @EndDate';
    }

    // Get all recent orders with delivery assignment info
    const request = pool.request();
    
    if (search && search.trim()) {
      request.input('Search', sql.NVarChar, `%${search.trim()}%`);
    }

    if (startDate && endDate) {
      request.input('StartDate', sql.DateTime2, startDate);
      request.input('EndDate', sql.DateTime2, endDate);
    }

    const result = await request.query(`
        SELECT 
          d.Id as OrderId,
          d.Number as OrderNumber,
          c.Name as CustomerName,
          c.PhoneNumber as CustomerPhone,
          c.Address as CustomerAddress,
          c.Latitude,
          c.Longitude,
          c.GoogleMapsUrl,
          c.WazeUrl,
          d.Total as TotalAmount,
          d.DateCreated as CreatedAt,
          od.Id as DeliveryId,
          od.DeliveryId as DeliveryPersonId,
          od.Status,
          od.ConfirmedAt,
          od.PickedUpAt,
          od.DeliveredAt,
          od.CanceledAt,
          od.DateCreated as AssignedAt
        FROM Document d
        LEFT JOIN Customer c ON d.CustomerId = c.Id
        LEFT JOIN OrdersDelivery od ON d.Id = od.DocumentId
        LEFT JOIN DeliveryPersons dp ON od.DeliveryId = dp.Id
        ${dateCondition}
        ${searchCondition}
        ORDER BY d.DateCreated DESC
      `);

    const orders: DeliveryOrder[] = [];

    for (const row of result.recordset) {
      // Get order items
      const itemsResult = await pool.request()
        .input('DocumentId', sql.Int, row.OrderId)
        .query(`
          SELECT 
            p.Name as ProductName,
            di.Quantity,
            di.Price
          FROM DocumentItem di
          JOIN Product p ON di.ProductId = p.Id
          WHERE di.DocumentId = @DocumentId
        `);

      orders.push({
        OrderId: row.OrderId,
        OrderNumber: row.OrderNumber,
        CustomerName: row.CustomerName || 'Unknown Customer',
        CustomerPhone: row.CustomerPhone || '',
        CustomerAddress: row.CustomerAddress || '',
        Latitude: row.Latitude,
        Longitude: row.Longitude,
        GoogleMapsUrl: row.GoogleMapsUrl,
        WazeUrl: row.WazeUrl,
        TotalAmount: row.TotalAmount,
        Status: row.Status || null,
        DeliveryPersonId: row.DeliveryPersonId || null,
        ConfirmedAt: row.ConfirmedAt,
        PickedUpAt: row.PickedUpAt,
        DeliveredAt: row.DeliveredAt,
        CanceledAt: row.CanceledAt,
        CreatedAt: row.CreatedAt,
        AssignedAt: row.AssignedAt,
        Items: itemsResult.recordset.map(item => ({
          ProductName: item.ProductName,
          Quantity: item.Quantity,
          Price: item.Price,
        })),
      });
    }

    return orders;
  }

  // Update order delivery status
  async updateOrderStatus(orderId: number, deliveryPersonId: number, status: 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled'): Promise<boolean> {
    const pool = await getPool();
    
    const now = new Date();
    const updates: string[] = ['Status = @Status', 'DateUpdated = @DateUpdated'];
    const request = pool.request()
      .input('OrderId', sql.Int, orderId)
      .input('DeliveryId', sql.Int, deliveryPersonId)
      .input('Status', sql.NVarChar, status)
      .input('DateUpdated', sql.DateTime2, now);

    // Set the appropriate timestamp based on status
    if (status === 'to_delivery') {
      updates.push('ConfirmedAt = @ConfirmedAt');
      request.input('ConfirmedAt', sql.DateTime2, now);
    } else if (status === 'in_delivery') {
      updates.push('PickedUpAt = @PickedUpAt');
      request.input('PickedUpAt', sql.DateTime2, now);
    } else if (status === 'delivered') {
      updates.push('DeliveredAt = @DeliveredAt');
      request.input('DeliveredAt', sql.DateTime2, now);
    } else if (status === 'canceled') {
      updates.push('CanceledAt = @CanceledAt');
      request.input('CanceledAt', sql.DateTime2, now);
    }
    
    const result = await request.query(`
      UPDATE OrdersDelivery
      SET ${updates.join(', ')}
      WHERE DocumentId = @OrderId
      AND DeliveryId = @DeliveryId
    `);

    const success = result.rowsAffected[0] > 0;

    // Emit socket event if update was successful
    if (success) {
      // Get order details for the event
      const orderResult = await pool.request()
        .input('OrderId', sql.Int, orderId)
        .query(`
          SELECT 
            d.Number as OrderNumber,
            od.CustomerId,
            od.DeliveryId
          FROM Document d
          JOIN OrdersDelivery od ON d.Id = od.DocumentId
          WHERE d.Id = @OrderId
        `);

      if (orderResult.recordset.length > 0) {
        const order = orderResult.recordset[0];
        
        if (status === 'canceled') {
          await emitOrderCancelled({
            orderId,
            orderNumber: order.OrderNumber,
            customerId: order.CustomerId,
            deliveryPersonId: order.DeliveryId,
            status,
            timestamp: now,
          });
        } else {
          await emitOrderStatusChanged({
            orderId,
            orderNumber: order.OrderNumber,
            customerId: order.CustomerId,
            deliveryPersonId: order.DeliveryId,
            status,
            timestamp: now,
          });
        }
      }
    }

    return success;
  }

  // Assign order to delivery person
  async assignOrder(orderId: number, deliveryPersonId: number): Promise<boolean> {
    const pool = await getPool();
    
    // Check if Document table exists
    const tableExists = await pool.request()
      .query(`
        SELECT COUNT(*) as TableCount
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'Document'
      `);

    if (tableExists.recordset[0].TableCount === 0) {
      console.log('Document table does not exist yet - cannot assign order');
      return false;
    }

    // Get customer ID from document
    const docResult = await pool.request()
      .input('OrderId', sql.Int, orderId)
      .query(`
        SELECT CustomerId, Number FROM Document WHERE Id = @OrderId
      `);

    if (docResult.recordset.length === 0) {
      console.log('Document not found');
      return false;
    }

    const customerId = docResult.recordset[0].CustomerId;
    const orderNumber = docResult.recordset[0].Number;

    // Check if already assigned
    const existing = await pool.request()
      .input('DocumentId', sql.Int, orderId)
      .query(`
        SELECT Id FROM OrdersDelivery WHERE DocumentId = @DocumentId
      `);

    let success = false;

    if (existing.recordset.length > 0) {
      // Update existing assignment
      const result = await pool.request()
        .input('DocumentId', sql.Int, orderId)
        .input('DeliveryId', sql.Int, deliveryPersonId)
        .query(`
          UPDATE OrdersDelivery
          SET DeliveryId = @DeliveryId,
              Status = 'to_delivery',
              DateUpdated = GETDATE()
          WHERE DocumentId = @DocumentId
        `);
      success = result.rowsAffected[0] > 0;
    } else {
      // Create new order delivery record
      const result = await pool.request()
        .input('DocumentId', sql.Int, orderId)
        .input('CustomerId', sql.Int, customerId)
        .input('DeliveryId', sql.Int, deliveryPersonId)
        .query(`
          INSERT INTO OrdersDelivery (DocumentId, CustomerId, DeliveryId, Status)
          VALUES (@DocumentId, @CustomerId, @DeliveryId, 'to_delivery')
        `);
      success = result.rowsAffected[0] > 0;
    }

    // Emit socket event if assignment was successful
    if (success) {
      await emitOrderAssigned({
        orderId,
        orderNumber,
        customerId,
        deliveryPersonId,
        status: 'to_delivery',
        timestamp: new Date(),
      });
    }

    return success;
  }

  // Unassign order from delivery person
  async unassignOrder(orderId: number): Promise<boolean> {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('DocumentId', sql.Int, orderId)
      .query(`
        DELETE FROM OrdersDelivery
        WHERE DocumentId = @DocumentId
      `);

    return result.rowsAffected[0] > 0;
  }
}

export const deliveryRepository = new DeliveryRepository();
