import { Router } from 'express';
import { deliveryService } from '../delivery/delivery.service';
import { logger } from '../../utils/logger';

const router = Router();

// Get statistics
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    
    const statistics = await deliveryService.getStatistics(start, end);

    res.json({
      success: true,
      statistics,
    });
  } catch (error: any) {
    logger.error(error, 'Failed to get statistics');
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error.message,
    });
  }
});

export default router;
