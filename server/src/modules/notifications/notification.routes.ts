import { Router } from 'express';
import { notificationService } from './notification.service';
import { logger } from '../../utils/logger';

const router = Router();

// Get notifications for current user
router.get('/', async (req, res, next) => {
  try {
    const { userType, userId, deliveryPersonId, customerId } = req.query;

    logger.info(`GET /api/notifications - userType: ${userType}, userId: ${userId}, deliveryPersonId: ${deliveryPersonId}, customerId: ${customerId}`);

    if (!userType) {
      return res.status(400).json({ message: 'userType is required' });
    }

    let notifications;

    if (userType === 'admin') {
      notifications = await notificationService.getForAdmin();
    } else if (userType === 'delivery' && deliveryPersonId) {
      notifications = await notificationService.getForDeliveryPerson(Number(deliveryPersonId));
    } else if (userType === 'customer' && customerId) {
      notifications = await notificationService.getForCustomer(Number(customerId));
    } else {
      return res.status(400).json({ message: 'Invalid userType or missing required ID' });
    }

    logger.info(`Found ${notifications.length} notifications for ${userType}`);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread-count', async (req, res, next) => {
  try {
    const { userType, deliveryPersonId, customerId } = req.query;

    if (!userType) {
      return res.status(400).json({ message: 'userType is required' });
    }

    let count;

    if (userType === 'admin') {
      count = await notificationService.getUnreadCountForAdmin();
    } else if (userType === 'delivery' && deliveryPersonId) {
      count = await notificationService.getUnreadCountForDeliveryPerson(Number(deliveryPersonId));
    } else if (userType === 'customer' && customerId) {
      count = await notificationService.getUnreadCountForCustomer(Number(customerId));
    } else {
      return res.status(400).json({ message: 'Invalid userType or missing required ID' });
    }

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Mark single notification as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notificationId = Number(req.params.id);
    const success = await notificationService.markAsRead(notificationId);
    
    if (success) {
      res.json({ message: 'Notification marked as read' });
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    next(error);
  }
});

// Mark multiple notifications as read
router.post('/mark-read', async (req, res, next) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ message: 'notificationIds must be an array' });
    }

    const count = await notificationService.markMultipleAsRead(notificationIds);
    res.json({ message: `${count} notification(s) marked as read`, count });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.post('/mark-all-read', async (req, res, next) => {
  try {
    const { userType, deliveryPersonId, customerId } = req.body;

    if (!userType) {
      return res.status(400).json({ message: 'userType is required' });
    }

    let count;

    if (userType === 'admin') {
      count = await notificationService.markAllAsReadForAdmin();
    } else if (userType === 'delivery' && deliveryPersonId) {
      count = await notificationService.markAllAsReadForDeliveryPerson(deliveryPersonId);
    } else if (userType === 'customer' && customerId) {
      count = await notificationService.markAllAsReadForCustomer(customerId);
    } else {
      return res.status(400).json({ message: 'Invalid userType or missing required ID' });
    }

    res.json({ message: `${count} notification(s) marked as read`, count });
  } catch (error) {
    next(error);
  }
});

export default router;
