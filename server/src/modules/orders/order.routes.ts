import { Router, Request, Response } from 'express';
import { orderService } from './order.service';
import { createOrderSchema } from './order.validators';
import { logger } from '../../utils/logger';

const router = Router();

// Get all orders (for admin panel)
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const orders = await orderService.getAllOrders(limit);
    
    res.json({ 
      success: true,
      orders,
      count: orders.length 
    });
  } catch (error) {
    logger.error(error, 'Failed to fetch orders');
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch orders',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new order
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const order = await orderService.createOrder(data);
    
    res.status(201).json({ 
      success: true,
      order,
      documentNumber: order.Document.Number,
    });
  } catch (error) {
    logger.error(error, 'Failed to create order');
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order data', 
        details: error 
      });
    }
    res.status(500).json({ 
      success: false,
      error: 'Failed to create order',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get order by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }
    
    const order = await orderService.getOrderById(id);
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }
    
    res.json({ 
      success: true,
      order 
    });
  } catch (error) {
    logger.error(error, 'Failed to fetch order');
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch order' 
    });
  }
});

// Get order by order number (with customer verification)
router.get('/number/:orderNumber', async (req: Request, res: Response) => {
  try {
    const orderNumber = req.params.orderNumber;
    const customerId = parseInt(req.query.customerId as string);
    
    // Require customerId for security
    if (!customerId || isNaN(customerId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Customer ID is required' 
      });
    }
    
    const order = await orderService.getOrderByNumber(orderNumber);
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }
    
    // Verify order belongs to the customer
    if (order.Document.CustomerId !== customerId) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }
    
    res.json({ 
      success: true,
      order 
    });
  } catch (error) {
    logger.error(error, 'Failed to fetch order by number');
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch order' 
    });
  }
});

// Get customer orders
router.get('/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.customerId);
    if (isNaN(customerId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid customer ID' 
      });
    }
    
    const limit = parseInt(req.query.limit as string) || 50;
    const orders = await orderService.getCustomerOrders(customerId, limit);
    
    res.json({ 
      success: true,
      orders,
      count: orders.length 
    });
  } catch (error) {
    logger.error(error, 'Failed to fetch customer orders');
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch customer orders' 
    });
  }
});

export default router;
