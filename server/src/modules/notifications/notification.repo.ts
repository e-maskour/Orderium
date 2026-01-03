import { getPool } from '../../db/pool';
import type { Notification, CreateNotificationDTO } from './notification.model';
import sql from 'mssql';
import { logger } from '../../utils/logger';

export class NotificationRepository {
  // Initialize Notifications table
  async initialize() {
    const pool = await getPool();
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
      BEGIN
        CREATE TABLE Notifications (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          UserId INT NULL,
          DeliveryPersonId INT NULL,
          CustomerId INT NULL,
          UserType NVARCHAR(20) NOT NULL,
          Title NVARCHAR(255) NOT NULL,
          Message NVARCHAR(MAX) NOT NULL,
          Type NVARCHAR(50) NOT NULL,
          OrderId INT NULL,
          OrderNumber NVARCHAR(50) NULL,
          IsRead BIT NOT NULL DEFAULT 0,
          DateCreated DATETIME2 NOT NULL DEFAULT GETDATE(),
          DateRead DATETIME2 NULL
        )
      END
    `);

    logger.info('Notifications table initialized');
  }

  // Create a notification
  async create(data: CreateNotificationDTO): Promise<Notification> {
    const pool = await getPool();
    
    logger.info(`Creating notification for ${data.UserType}: ${data.Title}`);
    
    const result = await pool.request()
      .input('UserId', sql.Int, data.UserId || null)
      .input('DeliveryPersonId', sql.Int, data.DeliveryPersonId || null)
      .input('CustomerId', sql.Int, data.CustomerId || null)
      .input('UserType', sql.NVarChar, data.UserType)
      .input('Title', sql.NVarChar, data.Title)
      .input('Message', sql.NVarChar, data.Message)
      .input('Type', sql.NVarChar, data.Type)
      .input('OrderId', sql.Int, data.OrderId || null)
      .input('OrderNumber', sql.NVarChar, data.OrderNumber || null)
      .query(`
        INSERT INTO Notifications (
          UserId, DeliveryPersonId, CustomerId, UserType,
          Title, Message, Type, OrderId, OrderNumber
        )
        OUTPUT INSERTED.*
        VALUES (
          @UserId, @DeliveryPersonId, @CustomerId, @UserType,
          @Title, @Message, @Type, @OrderId, @OrderNumber
        )
      `);

    const notification = result.recordset[0];
    logger.info(`Notification created with ID: ${notification.Id}`);
    return notification;
  }

  // Get notifications for admin
  async getForAdmin(limit = 50): Promise<Notification[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) *
        FROM Notifications
        WHERE UserType = 'admin'
        ORDER BY DateCreated DESC
      `);

    return result.recordset;
  }

  // Get notifications for delivery person
  async getForDeliveryPerson(deliveryPersonId: number, limit = 50): Promise<Notification[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('deliveryPersonId', sql.Int, deliveryPersonId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) *
        FROM Notifications
        WHERE UserType = 'delivery' AND DeliveryPersonId = @deliveryPersonId
        ORDER BY DateCreated DESC
      `);

    return result.recordset;
  }

  // Get notifications for customer
  async getForCustomer(customerId: number, limit = 50): Promise<Notification[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('customerId', sql.Int, customerId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) *
        FROM Notifications
        WHERE UserType = 'customer' AND CustomerId = @customerId
        ORDER BY DateCreated DESC
      `);

    return result.recordset;
  }

  // Get unread count for admin
  async getUnreadCountForAdmin(): Promise<number> {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT COUNT(*) as count
        FROM Notifications
        WHERE UserType = 'admin' AND IsRead = 0
      `);

    return result.recordset[0].count;
  }

  // Get unread count for delivery person
  async getUnreadCountForDeliveryPerson(deliveryPersonId: number): Promise<number> {
    const pool = await getPool();
    const result = await pool.request()
      .input('deliveryPersonId', sql.Int, deliveryPersonId)
      .query(`
        SELECT COUNT(*) as count
        FROM Notifications
        WHERE UserType = 'delivery' 
          AND DeliveryPersonId = @deliveryPersonId 
          AND IsRead = 0
      `);

    return result.recordset[0].count;
  }

  // Get unread count for customer
  async getUnreadCountForCustomer(customerId: number): Promise<number> {
    const pool = await getPool();
    const result = await pool.request()
      .input('customerId', sql.Int, customerId)
      .query(`
        SELECT COUNT(*) as count
        FROM Notifications
        WHERE UserType = 'customer' 
          AND CustomerId = @customerId 
          AND IsRead = 0
      `);

    return result.recordset[0].count;
  }

  // Mark single notification as read
  async markAsRead(notificationId: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, notificationId)
      .query(`
        UPDATE Notifications
        SET IsRead = 1, DateRead = GETDATE()
        WHERE Id = @id
      `);

    return result.rowsAffected[0] > 0;
  }

  // Mark multiple notifications as read
  async markMultipleAsRead(notificationIds: number[]): Promise<number> {
    if (notificationIds.length === 0) return 0;

    const pool = await getPool();
    const result = await pool.request()
      .input('ids', sql.NVarChar, notificationIds.join(','))
      .query(`
        UPDATE Notifications
        SET IsRead = 1, DateRead = GETDATE()
        WHERE Id IN (SELECT value FROM STRING_SPLIT(@ids, ','))
      `);

    return result.rowsAffected[0];
  }

  // Mark all as read for admin
  async markAllAsReadForAdmin(): Promise<number> {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        UPDATE Notifications
        SET IsRead = 1, DateRead = GETDATE()
        WHERE UserType = 'admin' AND IsRead = 0
      `);

    return result.rowsAffected[0];
  }

  // Mark all as read for delivery person
  async markAllAsReadForDeliveryPerson(deliveryPersonId: number): Promise<number> {
    const pool = await getPool();
    const result = await pool.request()
      .input('deliveryPersonId', sql.Int, deliveryPersonId)
      .query(`
        UPDATE Notifications
        SET IsRead = 1, DateRead = GETDATE()
        WHERE UserType = 'delivery' 
          AND DeliveryPersonId = @deliveryPersonId 
          AND IsRead = 0
      `);

    return result.rowsAffected[0];
  }

  // Mark all as read for customer
  async markAllAsReadForCustomer(customerId: number): Promise<number> {
    const pool = await getPool();
    const result = await pool.request()
      .input('customerId', sql.Int, customerId)
      .query(`
        UPDATE Notifications
        SET IsRead = 1, DateRead = GETDATE()
        WHERE UserType = 'customer' 
          AND CustomerId = @customerId 
          AND IsRead = 0
      `);

    return result.rowsAffected[0];
  }

  // Delete old notifications (optional cleanup)
  async deleteOlderThan(days: number): Promise<number> {
    const pool = await getPool();
    const result = await pool.request()
      .input('days', sql.Int, days)
      .query(`
        DELETE FROM Notifications
        WHERE DateCreated < DATEADD(day, -@days, GETDATE())
      `);

    return result.rowsAffected[0];
  }
}

export const notificationRepo = new NotificationRepository();
