import { getPool } from '../../db/pool';
import { Document, DocumentItem, CreateOrderDTO, CreateOrderItemDTO, OrderWithItems } from './order.model';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import sql from 'mssql';
import { emitOrderCreated } from '../../socket/events/orderEvents';

export class OrderRepository {
  // Generate next document number for the year
  async getNextDocumentNumber(year: number): Promise<string> {
    try {
      const pool = await getPool();
      const prefix = year.toString().slice(-2); // Last 2 digits of year
      
      const result = await pool.request()
        .input('prefix', sql.VarChar, `${prefix}-%`)
        .query(`
          SELECT TOP 1 Number 
          FROM Document 
          WHERE Number LIKE @prefix 
          ORDER BY Number DESC
        `);
      
      if (result.recordset.length === 0) {
        return `${prefix}-200-000001`;
      }
      
      const lastNumber = result.recordset[0].Number;
      const parts = lastNumber.split('-');
      const sequence = parseInt(parts[2]) + 1;
      
      return `${prefix}-200-${sequence.toString().padStart(6, '0')}`;
    } catch (err) {
      logger.error(err, 'Failed to generate document number');
      throw err;
    }
  }

  // Get customer ID by phone number
  async getCustomerIdByPhone(phone: string): Promise<number | null> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('phone', sql.NVarChar, phone)
        .query(`
          SELECT Id FROM Customer 
          WHERE PhoneNumber = @phone AND IsEnabled = 1
        `);
      
      return result.recordset[0]?.Id || null;
    } catch (err) {
      logger.error(err, 'Failed to get customer by phone');
      return null;
    }
  }

  // Get first available user ID
  async getFirstUserId(): Promise<number | null> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .query('SELECT TOP 1 Id FROM [User] ORDER BY Id ASC');
      
      return result.recordset[0]?.Id || null;
    } catch (err) {
      logger.error(err, 'Failed to get first user');
      return null;
    }
  }

  // Create order (document + items)
  async createOrder(data: CreateOrderDTO): Promise<OrderWithItems> {
    const pool = await getPool();
    const transaction = pool.transaction();
    
    try {
      await transaction.begin();
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const year = now.getFullYear();
      
      // Get next document number
      const documentNumber = await this.getNextDocumentNumber(year);
      
      // Get customer ID if phone provided
      let customerId = data.CustomerId;
      if (!customerId && data.CustomerPhone) {
        customerId = await this.getCustomerIdByPhone(data.CustomerPhone) || undefined;
      }
      
      // Use default values from config
      const userId = data.UserId || env.defaults.userId;
      const cashRegisterId = data.CashRegisterId || env.defaults.cashRegisterId;
      const warehouseId = data.WarehouseId || env.defaults.warehouseId;
      const documentTypeId = data.DocumentTypeId || env.defaults.documentTypeId;
      
      // Calculate total
      const total = data.Items.reduce((sum, item) => {
        const itemTotal = item.Price * item.Quantity;
        const discount = item.Discount || 0;
        const discountAmount = item.DiscountType === 1 
          ? (itemTotal * discount / 100) 
          : discount;
        return sum + (itemTotal - discountAmount);
      }, 0);
      
      // Insert document
      const documentResult = await transaction.request()
        .input('Number', sql.VarChar, documentNumber)
        .input('UserId', sql.Int, userId)
        .input('CustomerId', sql.Int, customerId || null)
        .input('CashRegisterId', sql.Int, cashRegisterId)
        .input('OrderNumber', sql.VarChar, documentNumber.split('-')[2])
        .input('Date', sql.Date, today)
        .input('StockDate', sql.DateTime, now)
        .input('Total', sql.Float, total)
        .input('IsClockedOut', sql.Bit, 0)
        .input('DocumentTypeId', sql.Int, documentTypeId)
        .input('WarehouseId', sql.Int, warehouseId)
        .input('Note', sql.NVarChar, data.Note || null)
        .input('InternalNote', sql.NVarChar, data.InternalNote || null)
        .input('DueDate', sql.Date, today)
        .input('Discount', sql.Float, 0)
        .input('DiscountType', sql.Int, 0)
        .input('PaidStatus', sql.Int, env.defaults.paidStatus)
        .input('DateCreated', sql.DateTime, now)
        .input('DateUpdated', sql.DateTime, now)
        .input('DiscountApplyRule', sql.Int, 1)
        .input('ServiceType', sql.Int, 0)
        .query(`
          INSERT INTO Document (
            Number, UserId, CustomerId, CashRegisterId, OrderNumber,
            [Date], StockDate, Total, IsClockedOut, DocumentTypeId, WarehouseId,
            Note, InternalNote, DueDate, Discount, DiscountType, PaidStatus,
            DateCreated, DateUpdated, DiscountApplyRule, ServiceType
          )
          OUTPUT INSERTED.Id
          VALUES (
            @Number, @UserId, @CustomerId, @CashRegisterId, @OrderNumber,
            @Date, @StockDate, @Total, @IsClockedOut, @DocumentTypeId, @WarehouseId,
            @Note, @InternalNote, @DueDate, @Discount, @DiscountType, @PaidStatus,
            @DateCreated, @DateUpdated, @DiscountApplyRule, @ServiceType
          )
        `);
      
      const documentId = documentResult.recordset[0].Id;
      
      // Insert document items
      const items: DocumentItem[] = [];
      for (const item of data.Items) {
        const itemQuantity = item.Quantity;
        const itemPrice = item.Price;
        const itemDiscount = item.Discount || 0;
        const itemDiscountType = item.DiscountType || 0;
        
        const priceBeforeTax = itemPrice;
        const itemTotal = itemPrice * itemQuantity;
        const discountAmount = itemDiscountType === 1 
          ? (itemTotal * itemDiscount / 100) 
          : itemDiscount;
        const priceAfterDiscount = itemPrice - (discountAmount / itemQuantity);
        const totalAfterDiscount = itemTotal - discountAmount;
        
        const itemResult = await transaction.request()
          .input('DocumentId', sql.Int, documentId)
          .input('ProductId', sql.Int, item.ProductId)
          .input('Quantity', sql.Float, itemQuantity)
          .input('ExpectedQuantity', sql.Float, 0)
          .input('PriceBeforeTax', sql.Float, priceBeforeTax)
          .input('Discount', sql.Float, itemDiscount)
          .input('DiscountType', sql.Int, itemDiscountType)
          .input('Price', sql.Float, itemPrice)
          .input('ProductCost', sql.Float, 0)
          .input('PriceAfterDiscount', sql.Float, priceAfterDiscount)
          .input('Total', sql.Float, itemTotal)
          .input('PriceBeforeTaxAfterDiscount', sql.Float, priceAfterDiscount)
          .input('TotalAfterDocumentDiscount', sql.Float, totalAfterDiscount)
          .input('DiscountApplyRule', sql.Int, 1)
          .query(`
            INSERT INTO DocumentItem (
              DocumentId, ProductId, Quantity, ExpectedQuantity,
              PriceBeforeTax, Discount, DiscountType, Price, ProductCost,
              PriceAfterDiscount, Total, PriceBeforeTaxAfterDiscount,
              TotalAfterDocumentDiscount, DiscountApplyRule
            )
            OUTPUT INSERTED.*
            VALUES (
              @DocumentId, @ProductId, @Quantity, @ExpectedQuantity,
              @PriceBeforeTax, @Discount, @DiscountType, @Price, @ProductCost,
              @PriceAfterDiscount, @Total, @PriceBeforeTaxAfterDiscount,
              @TotalAfterDocumentDiscount, @DiscountApplyRule
            )
          `);
        
        items.push(itemResult.recordset[0]);
      }
      
      await transaction.commit();
      
      // Fetch created document
      const document = await this.getDocumentById(documentId);
      
      // Emit socket event for order creation
      if (document && customerId) {
        await emitOrderCreated({
          orderId: documentId,
          orderNumber: documentNumber,
          customerId,
          timestamp: now,
        });
      }
      
      return {
        Document: document!,
        Items: items,
      };
    } catch (err) {
      await transaction.rollback();
      logger.error(err, 'Failed to create order');
      throw err;
    }
  }

  // Get document by ID
  async getDocumentById(id: number): Promise<Document | null> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT * FROM Document WHERE Id = @id');
      
      return result.recordset[0] || null;
    } catch (err) {
      logger.error(err, 'Failed to get document');
      throw err;
    }
  }

  // Get order with items
  async getOrderWithItems(documentId: number): Promise<OrderWithItems | null> {
    try {
      const document = await this.getDocumentById(documentId);
      if (!document) return null;
      
      const pool = await getPool();
      const itemsResult = await pool.request()
        .input('documentId', sql.Int, documentId)
        .query('SELECT * FROM DocumentItem WHERE DocumentId = @documentId');
      
      return {
        Document: document,
        Items: itemsResult.recordset,
      };
    } catch (err) {
      logger.error(err, 'Failed to get order with items');
      throw err;
    }
  }

  // Get order by order number
  async getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('orderNumber', sql.VarChar, orderNumber)
        .query(`
          SELECT 
            d.Id, d.Number, d.UserId, d.CustomerId, d.CashRegisterId, d.OrderNumber,
            d.Date, d.StockDate, d.Total, d.IsClockedOut, d.DocumentTypeId,
            d.WarehouseId, d.ReferenceDocumentNumber, d.InternalNote, d.Note,
            d.DueDate, d.Discount, d.DiscountType, d.PaidStatus, d.DateCreated,
            d.DateUpdated, d.DiscountApplyRule, d.ServiceType, d.DeliveryPersonId,
            od.Status as DeliveryStatus,
            od.ConfirmedAt,
            od.PickedUpAt,
            od.DeliveredAt,
            od.CanceledAt
          FROM Document d
          LEFT JOIN OrdersDelivery od ON d.Id = od.DocumentId
          WHERE d.Number = @orderNumber
        `);
      
      if (result.recordset.length === 0) return null;
      
      const document = result.recordset[0];
      const itemsResult = await pool.request()
        .input('documentId', sql.Int, document.Id)
        .query('SELECT * FROM DocumentItem WHERE DocumentId = @documentId');
      
      return {
        Document: document,
        Items: itemsResult.recordset,
      };
    } catch (err) {
      logger.error(err, 'Failed to get order by number');
      throw err;
    }
  }

  // Get orders by customer ID
  async getOrdersByCustomerId(customerId: number, limit = 50): Promise<Document[]> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('customerId', sql.Int, customerId)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT TOP (@limit) 
            d.Id, d.Number, d.UserId, d.CustomerId, d.CashRegisterId, d.OrderNumber,
            d.Date, d.StockDate, d.Total, d.IsClockedOut, d.DocumentTypeId,
            d.WarehouseId, d.ReferenceDocumentNumber, d.InternalNote, d.Note,
            d.DueDate, d.Discount, d.DiscountType, d.PaidStatus, d.DateCreated,
            d.DateUpdated, d.DiscountApplyRule, d.ServiceType, d.DeliveryPersonId,
            od.Status as DeliveryStatus,
            od.ConfirmedAt,
            od.PickedUpAt,
            od.DeliveredAt,
            od.CanceledAt
          FROM Document d
          LEFT JOIN OrdersDelivery od ON d.Id = od.DocumentId
          WHERE d.CustomerId = @customerId 
          ORDER BY d.DateCreated DESC
        `);
      
      return result.recordset;
    } catch (err) {
      logger.error(err, 'Failed to get orders by customer');
      throw err;
    }
  }

  // Get all orders (for admin panel)
  async getAllOrders(limit = 100): Promise<Document[]> {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('limit', sql.Int, limit)
        .query(`
          SELECT TOP (@limit) 
            d.*,
            c.Name as CustomerName,
            c.PhoneNumber as CustomerPhone,
            c.Address as CustomerAddress
          FROM Document d
          LEFT JOIN Customer c ON d.CustomerId = c.Id
          ORDER BY d.DateCreated DESC
        `);
      
      return result.recordset;
    } catch (err) {
      logger.error(err, 'Failed to get all orders');
      throw err;
    }
  }
}

export const orderRepo = new OrderRepository();
