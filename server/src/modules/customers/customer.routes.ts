import { Router, Request, Response } from 'express';
import { customerService } from './customer.service';
import { createCustomerSchema, updateCustomerSchema, searchCustomerSchema } from './customer.validators';
import { logger } from '../../utils/logger';

const router = Router();

// Search customers by phone
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { phone } = searchCustomerSchema.parse(req.query);
    const customers = await customerService.searchByPhone(phone);
    res.json({ customers });
  } catch (error) {
    logger.error(error, 'Customer search failed');
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid search parameters', details: error });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all customers (with pagination)
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    
    const result = await customerService.getAll(page, pageSize);
    res.json(result);
  } catch (error) {
    logger.error(error, 'Failed to fetch customers');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer by phone
router.get('/:phone', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const customer = await customerService.getByPhone(phone);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ customer });
  } catch (error) {
    logger.error(error, 'Failed to fetch customer');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update customer (upsert)
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    const customer = await customerService.upsert(data);
    res.status(201).json({ customer });
  } catch (error) {
    logger.error(error, 'Failed to create/update customer');
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid customer data', details: error });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update customer
router.patch('/:phone', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const data = updateCustomerSchema.parse(req.body);
    const customer = await customerService.update(phone, data);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ customer });
  } catch (error) {
    logger.error(error, 'Failed to update customer');
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid customer data', details: error });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete customer
router.delete('/:phone', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const deleted = await customerService.delete(phone);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    logger.error(error, 'Failed to delete customer');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
