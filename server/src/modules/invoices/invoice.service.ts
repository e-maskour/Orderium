import { InvoiceRepository } from './invoice.repo';
import { 
  CreateInvoiceDTO, 
  UpdateInvoiceDTO, 
  InvoiceWithDetails, 
  InvoiceFilters,
  RecordPaymentDTO 
} from './invoice.model';

export class InvoiceService {
  private repo: InvoiceRepository;

  constructor() {
    this.repo = new InvoiceRepository();
  }

  // Get all invoices with optional filters
  async getInvoices(filters?: InvoiceFilters): Promise<InvoiceWithDetails[]> {
    return this.repo.getInvoices(filters);
  }

  // Get single invoice by ID
  async getInvoiceById(id: number): Promise<InvoiceWithDetails> {
    return this.repo.getInvoiceById(id);
  }

  // Create new invoice
  async createInvoice(data: CreateInvoiceDTO): Promise<InvoiceWithDetails> {
    // Validate items
    if (!data.Items || data.Items.length === 0) {
      throw new Error('Invoice must have at least one item');
    }

    // Validate quantities and prices
    for (const item of data.Items) {
      if (item.Quantity <= 0) {
        throw new Error('Item quantity must be greater than 0');
      }
      if (item.UnitPrice < 0) {
        throw new Error('Item unit price cannot be negative');
      }
    }

    // Create invoice
    return this.repo.createInvoice(data);
  }

  // Update invoice
  async updateInvoice(id: number, data: UpdateInvoiceDTO): Promise<InvoiceWithDetails> {
    // Check if invoice exists
    await this.repo.getInvoiceById(id);

    // Validate items if provided
    if (data.Items) {
      if (data.Items.length === 0) {
        throw new Error('Invoice must have at least one item');
      }

      for (const item of data.Items) {
        if (item.Quantity <= 0) {
          throw new Error('Item quantity must be greater than 0');
        }
        if (item.UnitPrice < 0) {
          throw new Error('Item unit price cannot be negative');
        }
      }
    }

    return this.repo.updateInvoice(id, data);
  }

  // Delete invoice
  async deleteInvoice(id: number): Promise<void> {
    // Check if invoice exists and can be deleted
    const invoice = await this.repo.getInvoiceById(id);
    
    if (invoice.Invoice.Status === 'paid') {
      throw new Error('Cannot delete a paid invoice');
    }

    return this.repo.deleteInvoice(id);
  }

  // Record payment
  async recordPayment(data: RecordPaymentDTO): Promise<InvoiceWithDetails> {
    if (data.Amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    const invoice = await this.repo.getInvoiceById(data.InvoiceId);
    
    const remainingAmount = invoice.Invoice.Total - invoice.Invoice.PaidAmount;
    if (data.Amount > remainingAmount) {
      throw new Error('Payment amount exceeds remaining balance');
    }

    return this.repo.recordPayment(data);
  }

  // Update invoice status
  async updateStatus(id: number, status: string): Promise<InvoiceWithDetails> {
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    return this.repo.updateInvoice(id, { Status: status });
  }

  // Get overdue invoices
  async getOverdueInvoices(): Promise<InvoiceWithDetails[]> {
    const now = new Date();
    return this.repo.getInvoices({
      paymentStatus: 'unpaid'
    });
  }

  // Get invoice statistics
  async getStatistics(filters?: InvoiceFilters): Promise<{
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
    overdueAmount: number;
  }> {
    const invoices = await this.repo.getInvoices(filters);
    
    const stats = {
      totalInvoices: invoices.length,
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      overdueAmount: 0
    };

    const now = new Date();

    invoices.forEach(inv => {
      stats.totalAmount += inv.Invoice.Total;
      stats.paidAmount += inv.Invoice.PaidAmount;
      stats.unpaidAmount += (inv.Invoice.Total - inv.Invoice.PaidAmount);
      
      if (inv.Invoice.PaymentStatus !== 'paid' && new Date(inv.Invoice.DueDate) < now) {
        stats.overdueAmount += (inv.Invoice.Total - inv.Invoice.PaidAmount);
      }
    });

    return stats;
  }
}

export const invoiceService = new InvoiceService();
