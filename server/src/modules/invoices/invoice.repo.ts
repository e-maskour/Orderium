import { getPool } from '../../db/pool';
import { 
  Invoice, 
  InvoiceItem, 
  CreateInvoiceDTO, 
  UpdateInvoiceDTO, 
  InvoiceWithDetails, 
  InvoiceFilters,
  RecordPaymentDTO
} from './invoice.model';
import { logger } from '../../utils/logger';
import sql from 'mssql';

export class InvoiceRepository {
  // Initialize Invoice and InvoiceItem tables
  async initialize() {
    const pool = await getPool();
    
    // Create Invoice table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Invoice')
      BEGIN
        CREATE TABLE Invoice (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          InvoiceNumber NVARCHAR(50) NOT NULL UNIQUE,
          CustomerId INT NOT NULL,
          UserId INT NOT NULL,
          Date DATETIME2 NOT NULL DEFAULT GETDATE(),
          DueDate DATETIME2 NOT NULL,
          Subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
          TaxAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
          DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
          Total DECIMAL(18,2) NOT NULL DEFAULT 0,
          PaidAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
          Status NVARCHAR(20) NOT NULL DEFAULT 'draft',
          PaymentStatus NVARCHAR(20) NOT NULL DEFAULT 'unpaid',
          Note NVARCHAR(MAX) NULL,
          Terms NVARCHAR(MAX) NULL,
          CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
          UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
          FOREIGN KEY (CustomerId) REFERENCES Customer(Id),
          FOREIGN KEY (UserId) REFERENCES [User](Id)
        )
        
        CREATE INDEX IX_Invoice_InvoiceNumber ON Invoice(InvoiceNumber)
        CREATE INDEX IX_Invoice_CustomerId ON Invoice(CustomerId)
        CREATE INDEX IX_Invoice_Status ON Invoice(Status)
        CREATE INDEX IX_Invoice_PaymentStatus ON Invoice(PaymentStatus)
        CREATE INDEX IX_Invoice_Date ON Invoice(Date)
      END
    `);

    // Create InvoiceItem table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InvoiceItem')
      BEGIN
        CREATE TABLE InvoiceItem (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          InvoiceId INT NOT NULL,
          ProductId INT NOT NULL,
          Description NVARCHAR(MAX) NULL,
          Quantity DECIMAL(18,2) NOT NULL,
          UnitPrice DECIMAL(18,2) NOT NULL,
          Discount DECIMAL(18,2) NOT NULL DEFAULT 0,
          DiscountType INT NOT NULL DEFAULT 0,
          TaxRate DECIMAL(18,2) NOT NULL DEFAULT 0,
          Total DECIMAL(18,2) NOT NULL,
          FOREIGN KEY (InvoiceId) REFERENCES Invoice(Id) ON DELETE CASCADE,
          FOREIGN KEY (ProductId) REFERENCES Product(Id)
        )
        
        CREATE INDEX IX_InvoiceItem_InvoiceId ON InvoiceItem(InvoiceId)
        CREATE INDEX IX_InvoiceItem_ProductId ON InvoiceItem(ProductId)
      END
    `);

    logger.info('✅ Invoice and InvoiceItem tables initialized');
  }

  // Generate next invoice number for the year
  async getNextInvoiceNumber(year: number): Promise<string> {
    try {
      const pool = await getPool();
      const prefix = `INV-${year}`;
      
      const result = await pool.request()
        .input('prefix', sql.VarChar, `${prefix}-%`)
        .query(`
          SELECT TOP 1 InvoiceNumber 
          FROM Invoice 
          WHERE InvoiceNumber LIKE @prefix 
          ORDER BY InvoiceNumber DESC
        `);
      
      if (result.recordset.length === 0) {
        return `${prefix}-00001`;
      }
      
      const lastNumber = result.recordset[0].InvoiceNumber;
      const parts = lastNumber.split('-');
      const sequence = parseInt(parts[2]) + 1;
      
      return `${prefix}-${sequence.toString().padStart(5, '0')}`;
    } catch (err) {
      logger.error(err, 'Failed to generate invoice number');
      throw err;
    }
  }

  // Create invoice with items
  async createInvoice(data: CreateInvoiceDTO): Promise<InvoiceWithDetails> {
    const pool = await getPool();
    const transaction = pool.transaction();
    
    try {
      await transaction.begin();
      
      const now = new Date();
      const year = now.getFullYear();
      const invoiceNumber = await this.getNextInvoiceNumber(year);
      
      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;
      let discountAmount = 0;
      
      data.Items.forEach(item => {
        const itemSubtotal = item.Quantity * item.UnitPrice;
        let itemDiscount = 0;
        
        if (item.Discount) {
          itemDiscount = item.DiscountType === 1 
            ? itemSubtotal * (item.Discount / 100)
            : item.Discount;
        }
        
        const itemTotal = itemSubtotal - itemDiscount;
        const itemTax = item.TaxRate ? itemTotal * (item.TaxRate / 100) : 0;
        
        subtotal += itemSubtotal;
        discountAmount += itemDiscount;
        taxAmount += itemTax;
      });
      
      const total = subtotal - discountAmount + taxAmount;
      
      // Insert invoice
      const invoiceResult = await transaction.request()
        .input('invoiceNumber', sql.NVarChar, invoiceNumber)
        .input('customerId', sql.Int, data.CustomerId)
        .input('userId', sql.Int, data.UserId || 1)
        .input('date', sql.DateTime, data.Date || now)
        .input('dueDate', sql.DateTime, data.DueDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
        .input('subtotal', sql.Decimal(18, 2), subtotal)
        .input('taxAmount', sql.Decimal(18, 2), taxAmount)
        .input('discountAmount', sql.Decimal(18, 2), discountAmount)
        .input('total', sql.Decimal(18, 2), total)
        .input('status', sql.NVarChar, data.Status || 'draft')
        .input('note', sql.NVarChar, data.Note || null)
        .input('terms', sql.NVarChar, data.Terms || null)
        .query(`
          INSERT INTO Invoice (
            InvoiceNumber, CustomerId, UserId, Date, DueDate,
            Subtotal, TaxAmount, DiscountAmount, Total, PaidAmount,
            Status, PaymentStatus, Note, Terms, CreatedAt, UpdatedAt
          )
          OUTPUT INSERTED.*
          VALUES (
            @invoiceNumber, @customerId, @userId, @date, @dueDate,
            @subtotal, @taxAmount, @discountAmount, @total, 0,
            @status, 'unpaid', @note, @terms, GETDATE(), GETDATE()
          )
        `);
      
      const invoice = invoiceResult.recordset[0];
      
      // Insert invoice items
      const items: InvoiceItem[] = [];
      for (const item of data.Items) {
        const itemSubtotal = item.Quantity * item.UnitPrice;
        let itemDiscount = 0;
        
        if (item.Discount) {
          itemDiscount = item.DiscountType === 1 
            ? itemSubtotal * (item.Discount / 100)
            : item.Discount;
        }
        
        const itemTotal = itemSubtotal - itemDiscount;
        const itemTax = item.TaxRate ? itemTotal * (item.TaxRate / 100) : 0;
        const finalTotal = itemTotal + itemTax;
        
        const itemResult = await transaction.request()
          .input('invoiceId', sql.Int, invoice.Id)
          .input('productId', sql.Int, item.ProductId)
          .input('description', sql.NVarChar, item.Description || null)
          .input('quantity', sql.Decimal(18, 2), item.Quantity)
          .input('unitPrice', sql.Decimal(18, 2), item.UnitPrice)
          .input('discount', sql.Decimal(18, 2), item.Discount || 0)
          .input('discountType', sql.Int, item.DiscountType || 0)
          .input('taxRate', sql.Decimal(18, 2), item.TaxRate || 0)
          .input('total', sql.Decimal(18, 2), finalTotal)
          .query(`
            INSERT INTO InvoiceItem (
              InvoiceId, ProductId, Description, Quantity, UnitPrice,
              Discount, DiscountType, TaxRate, Total
            )
            OUTPUT INSERTED.*
            VALUES (
              @invoiceId, @productId, @description, @quantity, @unitPrice,
              @discount, @discountType, @taxRate, @total
            )
          `);
        
        items.push(itemResult.recordset[0]);
      }
      
      await transaction.commit();
      
      // Fetch full details
      return await this.getInvoiceById(invoice.Id);
    } catch (err) {
      await transaction.rollback();
      logger.error(err, 'Failed to create invoice');
      throw err;
    }
  }

  // Get invoice by ID with full details
  async getInvoiceById(id: number): Promise<InvoiceWithDetails> {
    try {
      const pool = await getPool();
      
      const invoiceResult = await pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT i.*, 
                 c.Name as CustomerName, c.Email as CustomerEmail, 
                 c.PhoneNumber as CustomerPhone, c.Address as CustomerAddress, c.City as CustomerCity,
                 u.FirstName + ' ' + u.LastName as UserName, u.Email as UserEmail
          FROM Invoice i
          LEFT JOIN Customer c ON i.CustomerId = c.Id
          LEFT JOIN [User] u ON i.UserId = u.Id
          WHERE i.Id = @id
        `);
      
      if (invoiceResult.recordset.length === 0) {
        throw new Error('Invoice not found');
      }
      
      const invoice = invoiceResult.recordset[0];
      
      const itemsResult = await pool.request()
        .input('invoiceId', sql.Int, id)
        .query(`
          SELECT ii.*, p.Name as ProductName
          FROM InvoiceItem ii
          LEFT JOIN Product p ON ii.ProductId = p.Id
          WHERE ii.InvoiceId = @invoiceId
          ORDER BY ii.Id
        `);
      
      return {
        Invoice: {
          Id: invoice.Id,
          InvoiceNumber: invoice.InvoiceNumber,
          CustomerId: invoice.CustomerId,
          UserId: invoice.UserId,
          Date: invoice.Date,
          DueDate: invoice.DueDate,
          Subtotal: invoice.Subtotal,
          TaxAmount: invoice.TaxAmount,
          DiscountAmount: invoice.DiscountAmount,
          Total: invoice.Total,
          PaidAmount: invoice.PaidAmount,
          Status: invoice.Status,
          PaymentStatus: invoice.PaymentStatus,
          Note: invoice.Note,
          Terms: invoice.Terms,
          CreatedAt: invoice.CreatedAt,
          UpdatedAt: invoice.UpdatedAt
        },
        Items: itemsResult.recordset,
        Customer: {
          Id: invoice.CustomerId,
          Name: invoice.CustomerName,
          Email: invoice.CustomerEmail,
          Phone: invoice.CustomerPhone,
          Address: invoice.CustomerAddress,
          City: invoice.CustomerCity
        },
        User: {
          Id: invoice.UserId,
          Name: invoice.UserName,
          Email: invoice.UserEmail
        }
      };
    } catch (err) {
      logger.error(err, 'Failed to get invoice');
      throw err;
    }
  }

  // Get all invoices with filters
  async getInvoices(filters: InvoiceFilters = {}): Promise<InvoiceWithDetails[]> {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      let query = `
        SELECT i.*, 
               c.Name as CustomerName, c.Email as CustomerEmail,
               c.PhoneNumber as CustomerPhone,
               u.FirstName + ' ' + u.LastName as UserName
        FROM Invoice i
        LEFT JOIN Customer c ON i.CustomerId = c.Id
        LEFT JOIN [User] u ON i.UserId = u.Id
        WHERE 1=1
      `;
      
      if (filters.status) {
        query += ' AND i.Status = @status';
        request.input('status', sql.NVarChar, filters.status);
      }
      
      if (filters.paymentStatus) {
        query += ' AND i.PaymentStatus = @paymentStatus';
        request.input('paymentStatus', sql.NVarChar, filters.paymentStatus);
      }
      
      if (filters.customerId) {
        query += ' AND i.CustomerId = @customerId';
        request.input('customerId', sql.Int, filters.customerId);
      }
      
      if (filters.dateFrom) {
        query += ' AND i.Date >= @dateFrom';
        request.input('dateFrom', sql.DateTime, filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query += ' AND i.Date <= @dateTo';
        request.input('dateTo', sql.DateTime, filters.dateTo);
      }
      
      if (filters.search) {
        query += ' AND (i.InvoiceNumber LIKE @search OR c.Name LIKE @search)';
        request.input('search', sql.NVarChar, `%${filters.search}%`);
      }
      
      query += ' ORDER BY i.Date DESC, i.Id DESC';
      
      const result = await request.query(query);
      
      // Fetch items for each invoice
      const invoices: InvoiceWithDetails[] = [];
      for (const invoice of result.recordset) {
        const itemsResult = await pool.request()
          .input('invoiceId', sql.Int, invoice.Id)
          .query(`
            SELECT ii.*, p.Name as ProductName
            FROM InvoiceItem ii
            LEFT JOIN Product p ON ii.ProductId = p.Id
            WHERE ii.InvoiceId = @invoiceId
            ORDER BY ii.Id
          `);
        
        invoices.push({
          Invoice: {
            Id: invoice.Id,
            InvoiceNumber: invoice.InvoiceNumber,
            CustomerId: invoice.CustomerId,
            UserId: invoice.UserId,
            Date: invoice.Date,
            DueDate: invoice.DueDate,
            Subtotal: invoice.Subtotal,
            TaxAmount: invoice.TaxAmount,
            DiscountAmount: invoice.DiscountAmount,
            Total: invoice.Total,
            PaidAmount: invoice.PaidAmount,
            Status: invoice.Status,
            PaymentStatus: invoice.PaymentStatus,
            Note: invoice.Note,
            Terms: invoice.Terms,
            CreatedAt: invoice.CreatedAt,
            UpdatedAt: invoice.UpdatedAt
          },
          Items: itemsResult.recordset,
          Customer: {
            Id: invoice.CustomerId,
            Name: invoice.CustomerName,
            Email: invoice.CustomerEmail,
            Phone: invoice.CustomerPhone,
            Address: invoice.CustomerAddress || undefined,
            City: invoice.CustomerCity || undefined
          },
          User: {
            Id: invoice.UserId,
            Name: invoice.UserName,
            Email: invoice.UserEmail || undefined
          }
        });
      }
      
      return invoices;
    } catch (err) {
      logger.error(err, 'Failed to get invoices');
      throw err;
    }
  }

  // Update invoice
  async updateInvoice(id: number, data: UpdateInvoiceDTO): Promise<InvoiceWithDetails> {
    const pool = await getPool();
    const transaction = pool.transaction();
    
    try {
      await transaction.begin();
      
      // Update invoice
      const request = transaction.request().input('id', sql.Int, id);
      
      const updates: string[] = ['UpdatedAt = GETDATE()'];
      
      if (data.CustomerId !== undefined) {
        updates.push('CustomerId = @customerId');
        request.input('customerId', sql.Int, data.CustomerId);
      }
      
      if (data.Date) {
        updates.push('Date = @date');
        request.input('date', sql.DateTime, data.Date);
      }
      
      if (data.DueDate) {
        updates.push('DueDate = @dueDate');
        request.input('dueDate', sql.DateTime, data.DueDate);
      }
      
      if (data.Status) {
        updates.push('Status = @status');
        request.input('status', sql.NVarChar, data.Status);
      }
      
      if (data.Note !== undefined) {
        updates.push('Note = @note');
        request.input('note', sql.NVarChar, data.Note);
      }
      
      if (data.Terms !== undefined) {
        updates.push('Terms = @terms');
        request.input('terms', sql.NVarChar, data.Terms);
      }
      
      if (updates.length > 1) {
        await request.query(`UPDATE Invoice SET ${updates.join(', ')} WHERE Id = @id`);
      }
      
      // Update items if provided
      if (data.Items) {
        // Delete existing items
        await transaction.request()
          .input('invoiceId', sql.Int, id)
          .query('DELETE FROM InvoiceItem WHERE InvoiceId = @invoiceId');
        
        // Insert new items and recalculate totals
        let subtotal = 0;
        let taxAmount = 0;
        let discountAmount = 0;
        
        for (const item of data.Items) {
          const itemSubtotal = item.Quantity * item.UnitPrice;
          let itemDiscount = 0;
          
          if (item.Discount) {
            itemDiscount = item.DiscountType === 1 
              ? itemSubtotal * (item.Discount / 100)
              : item.Discount;
          }
          
          const itemTotal = itemSubtotal - itemDiscount;
          const itemTax = item.TaxRate ? itemTotal * (item.TaxRate / 100) : 0;
          const finalTotal = itemTotal + itemTax;
          
          await transaction.request()
            .input('invoiceId', sql.Int, id)
            .input('productId', sql.Int, item.ProductId)
            .input('description', sql.NVarChar, item.Description || null)
            .input('quantity', sql.Decimal(18, 2), item.Quantity)
            .input('unitPrice', sql.Decimal(18, 2), item.UnitPrice)
            .input('discount', sql.Decimal(18, 2), item.Discount || 0)
            .input('discountType', sql.Int, item.DiscountType || 0)
            .input('taxRate', sql.Decimal(18, 2), item.TaxRate || 0)
            .input('total', sql.Decimal(18, 2), finalTotal)
            .query(`
              INSERT INTO InvoiceItem (
                InvoiceId, ProductId, Description, Quantity, UnitPrice,
                Discount, DiscountType, TaxRate, Total
              )
              VALUES (
                @invoiceId, @productId, @description, @quantity, @unitPrice,
                @discount, @discountType, @taxRate, @total
              )
            `);
          
          subtotal += itemSubtotal;
          discountAmount += itemDiscount;
          taxAmount += itemTax;
        }
        
        const total = subtotal - discountAmount + taxAmount;
        
        // Update invoice totals
        await transaction.request()
          .input('id', sql.Int, id)
          .input('subtotal', sql.Decimal(18, 2), subtotal)
          .input('taxAmount', sql.Decimal(18, 2), taxAmount)
          .input('discountAmount', sql.Decimal(18, 2), discountAmount)
          .input('total', sql.Decimal(18, 2), total)
          .query(`
            UPDATE Invoice 
            SET Subtotal = @subtotal, TaxAmount = @taxAmount, 
                DiscountAmount = @discountAmount, Total = @total
            WHERE Id = @id
          `);
      }
      
      await transaction.commit();
      
      return await this.getInvoiceById(id);
    } catch (err) {
      await transaction.rollback();
      logger.error(err, 'Failed to update invoice');
      throw err;
    }
  }

  // Record payment
  async recordPayment(data: RecordPaymentDTO): Promise<InvoiceWithDetails> {
    const pool = await getPool();
    
    try {
      // Get current invoice
      const invoiceResult = await pool.request()
        .input('id', sql.Int, data.InvoiceId)
        .query('SELECT * FROM Invoice WHERE Id = @id');
      
      if (invoiceResult.recordset.length === 0) {
        throw new Error('Invoice not found');
      }
      
      const invoice = invoiceResult.recordset[0];
      const newPaidAmount = invoice.PaidAmount + data.Amount;
      const total = invoice.Total;
      
      let paymentStatus: string;
      let status = invoice.Status;
      
      if (newPaidAmount >= total) {
        paymentStatus = 'paid';
        status = 'paid';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'partial';
      } else {
        paymentStatus = 'unpaid';
      }
      
      // Update invoice
      await pool.request()
        .input('id', sql.Int, data.InvoiceId)
        .input('paidAmount', sql.Decimal(18, 2), newPaidAmount)
        .input('paymentStatus', sql.NVarChar, paymentStatus)
        .input('status', sql.NVarChar, status)
        .query(`
          UPDATE Invoice 
          SET PaidAmount = @paidAmount, PaymentStatus = @paymentStatus, 
              Status = @status, UpdatedAt = GETDATE()
          WHERE Id = @id
        `);
      
      return await this.getInvoiceById(data.InvoiceId);
    } catch (err) {
      logger.error(err, 'Failed to record payment');
      throw err;
    }
  }

  // Delete invoice
  async deleteInvoice(id: number): Promise<void> {
    const pool = await getPool();
    const transaction = pool.transaction();
    
    try {
      await transaction.begin();
      
      // Delete items
      await transaction.request()
        .input('invoiceId', sql.Int, id)
        .query('DELETE FROM InvoiceItem WHERE InvoiceId = @invoiceId');
      
      // Delete invoice
      await transaction.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM Invoice WHERE Id = @id');
      
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      logger.error(err, 'Failed to delete invoice');
      throw err;
    }
  }
}
