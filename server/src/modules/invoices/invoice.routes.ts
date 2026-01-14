import { Router, Request, Response } from 'express';
import { invoiceService } from './invoice.service';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
  invoiceFiltersSchema
} from './invoice.validators';
import { logger } from '../../utils/logger';

const router = Router();

// Get all invoices with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = invoiceFiltersSchema.parse({
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search,
    });

    const invoices = await invoiceService.getInvoices(filters);

    res.json({
      success: true,
      invoices,
      count: invoices.length
    });
  } catch (error) {
    logger.error(error, 'Failed to fetch invoices');
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid filter parameters',
        details: error
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get invoice statistics
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const filters = invoiceFiltersSchema.parse({
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    });

    const stats = await invoiceService.getStatistics(filters);

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    logger.error(error, 'Failed to fetch invoice statistics');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Get overdue invoices
router.get('/overdue', async (req: Request, res: Response) => {
  try {
    const invoices = await invoiceService.getOverdueInvoices();

    res.json({
      success: true,
      invoices,
      count: invoices.length
    });
  } catch (error) {
    logger.error(error, 'Failed to fetch overdue invoices');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overdue invoices'
    });
  }
});

// Create new invoice
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createInvoiceSchema.parse(req.body);
    
    // Convert date strings to Date objects
    const invoiceData = {
      ...data,
      Date: data.Date ? new Date(data.Date) : undefined,
      DueDate: data.DueDate ? new Date(data.DueDate) : undefined,
    };
    
    const invoice = await invoiceService.createInvoice(invoiceData);

    res.status(201).json({
      success: true,
      invoice,
      invoiceNumber: invoice.Invoice.InvoiceNumber
    });
  } catch (error) {
    logger.error(error, 'Failed to create invoice');
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice data',
        details: error
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create invoice',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get invoice by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID'
      });
    }

    const invoice = await invoiceService.getInvoiceById(id);

    res.json({
      success: true,
      invoice
    });
  } catch (error) {
    logger.error(error, 'Failed to fetch invoice');
    if (error instanceof Error && error.message === 'Invoice not found') {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice'
    });
  }
});

// Update invoice
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID'
      });
    }

    const data = updateInvoiceSchema.parse(req.body);
    
    // Convert date strings to Date objects
    const updateData = {
      ...data,
      Date: data.Date ? new Date(data.Date) : undefined,
      DueDate: data.DueDate ? new Date(data.DueDate) : undefined,
    };

    const invoice = await invoiceService.updateInvoice(id, updateData);

    res.json({
      success: true,
      invoice
    });
  } catch (error) {
    logger.error(error, 'Failed to update invoice');
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice data',
        details: error
      });
    }
    if (error instanceof Error && error.message === 'Invoice not found') {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update invoice',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update invoice status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID'
      });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const invoice = await invoiceService.updateStatus(id, status);

    res.json({
      success: true,
      invoice
    });
  } catch (error) {
    logger.error(error, 'Failed to update invoice status');
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Record payment
router.post('/:id/payment', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID'
      });
    }

    const data = recordPaymentSchema.parse({
      ...req.body,
      InvoiceId: id
    });

    const invoice = await invoiceService.recordPayment(data);

    res.json({
      success: true,
      invoice,
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    logger.error(error, 'Failed to record payment');
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment data',
        details: error
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to record payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete invoice
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID'
      });
    }

    await invoiceService.deleteInvoice(id);

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    logger.error(error, 'Failed to delete invoice');
    if (error instanceof Error && error.message === 'Invoice not found') {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    if (error instanceof Error && error.message.includes('Cannot delete')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to delete invoice'
    });
  }
});

export default router;
