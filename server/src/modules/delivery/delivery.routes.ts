import { Router } from 'express';
import { deliveryService } from './delivery.service';
import { 
  deliveryLoginSchema, 
  createDeliveryPersonSchema, 
  updateDeliveryPersonSchema,
  updateOrderStatusSchema,
  assignOrderSchema 
} from './delivery.validators';
import { logger } from '../../utils/logger';

const router = Router();

// Delivery person login
router.post('/login', async (req, res) => {
  try {
    const validatedData = deliveryLoginSchema.parse(req.body);
    const result = await deliveryService.login(validatedData);

    if (!result) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Phone number or password is incorrect',
      });
    }

    res.json({
      success: true,
      deliveryPerson: result.deliveryPerson,
      token: result.token,
    });
  } catch (error: any) {
    logger.error(error, 'Delivery login failed');
    
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        errors: error.errors,
      });
    }
    
    res.status(400).json({
      success: false,
      error: 'Login failed',
      message: error.message || 'Failed to login',
    });
  }
});

// Get assigned orders for logged-in delivery person
router.get('/orders', async (req, res) => {
  try {
    const { deliveryPersonId, search, startDate, endDate } = req.query;

    // If no deliveryPersonId, return all orders (admin view)
    if (!deliveryPersonId) {
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const allOrders = await deliveryService.getAllOrders(
        search as string,
        start,
        end
      );
      return res.json({
        success: true,
        orders: allOrders,
      });
    }

    const orders = await deliveryService.getAssignedOrders(
      Number(deliveryPersonId), 
      search as string
    );

    res.json({
      success: true,
      orders,
    });
  } catch (error: any) {
    logger.error(error, 'Failed to get delivery orders');
    res.status(500).json({
      success: false,
      error: 'Failed to get orders',
      message: error.message,
    });
  }
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { deliveryPersonId } = req.query;
    const validatedData = updateOrderStatusSchema.parse(req.body);

    if (!deliveryPersonId) {
      return res.status(400).json({
        success: false,
        error: 'Delivery person ID is required',
      });
    }

    const success = await deliveryService.updateOrderStatus(
      orderId,
      Number(deliveryPersonId),
      validatedData.Status
    );

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or not assigned to you',
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
    });
  } catch (error: any) {
    logger.error(error, 'Failed to update order status');
    res.status(400).json({
      success: false,
      error: 'Failed to update status',
      message: error.message,
    });
  }
});

// Admin routes - Create delivery person
router.post('/', async (req, res) => {
  try {
    const validatedData = createDeliveryPersonSchema.parse(req.body);
    const deliveryPerson = await deliveryService.create(validatedData);

    res.json({
      success: true,
      deliveryPerson,
    });
  } catch (error: any) {
    logger.error(error, 'Failed to create delivery person');
    res.status(400).json({
      success: false,
      error: 'Failed to create delivery person',
      message: error.message,
    });
  }
});

// Admin routes - Get all delivery persons
router.get('/', async (req, res) => {
  try {
    const deliveryPersons = await deliveryService.getAll();

    res.json({
      success: true,
      deliveryPersons,
    });
  } catch (error: any) {
    logger.error(error, 'Failed to get delivery persons');
    res.status(500).json({
      success: false,
      error: 'Failed to get delivery persons',
      message: error.message,
    });
  }
});

// Admin routes - Get delivery person by ID
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deliveryPerson = await deliveryService.findById(id);

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        error: 'Delivery person not found',
      });
    }

    res.json({
      success: true,
      deliveryPerson,
    });
  } catch (error: any) {
    logger.error(error, 'Failed to get delivery person');
    res.status(500).json({
      success: false,
      error: 'Failed to get delivery person',
      message: error.message,
    });
  }
});

// Admin routes - Update delivery person
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const validatedData = updateDeliveryPersonSchema.parse(req.body);
    const deliveryPerson = await deliveryService.update(id, validatedData);

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        error: 'Delivery person not found',
      });
    }

    res.json({
      success: true,
      deliveryPerson,
    });
  } catch (error: any) {
    logger.error(error, 'Failed to update delivery person');
    res.status(400).json({
      success: false,
      error: 'Failed to update delivery person',
      message: error.message,
    });
  }
});

// Admin routes - Delete delivery person
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const success = await deliveryService.delete(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Delivery person not found',
      });
    }

    res.json({
      success: true,
      message: 'Delivery person deleted successfully',
    });
  } catch (error: any) {
    logger.error(error, 'Failed to delete delivery person');
    res.status(500).json({
      success: false,
      error: 'Failed to delete delivery person',
      message: error.message,
    });
  }
});

// Admin routes - Assign order to delivery person
router.post('/assign', async (req, res) => {
  try {
    const validatedData = assignOrderSchema.parse(req.body);
    const success = await deliveryService.assignOrder(
      validatedData.OrderId,
      validatedData.DeliveryPersonId
    );

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      message: 'Order assigned successfully',
    });
  } catch (error: any) {
    logger.error(error, 'Failed to assign order');
    res.status(400).json({
      success: false,
      error: 'Failed to assign order',
      message: error.message,
    });
  }
});

// Admin routes - Unassign order from delivery person
router.post('/unassign/:orderId', async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    const success = await deliveryService.unassignOrder(orderId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      message: 'Order unassigned successfully',
    });
  } catch (error: any) {
    logger.error(error, 'Failed to unassign order');
    res.status(500).json({
      success: false,
      error: 'Failed to unassign order',
      message: error.message,
    });
  }
});

export default router;
