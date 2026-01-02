import { Router } from 'express';
import { portalService } from './portal.service';
import { registerSchema, loginSchema, updatePasswordSchema } from './portal.validators';
import { logger } from '../../utils/logger';

const router = Router();

// Register new portal user
router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const result = await portalService.register(validatedData);
    
    res.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (error: any) {
    logger.error(error, 'Portal registration failed');
    res.status(400).json({
      success: false,
      error: 'Registration failed',
      message: error.message || 'Failed to register user',
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await portalService.login(validatedData);
    
    if (!result) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Phone number or password is incorrect',
      });
    }
    
    res.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (error: any) {
    logger.error(error, 'Portal login failed');
    res.status(400).json({
      success: false,
      error: 'Login failed',
      message: error.message || 'Failed to login',
    });
  }
});

// Get user by phone
router.get('/user/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const user = await portalService.getByPhone(phoneNumber);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    res.json({
      success: true,
      user,
    });
  } catch (error: any) {
    logger.error(error, 'Failed to get portal user');
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: error.message,
    });
  }
});

// Update password
router.put('/password', async (req, res) => {
  try {
    const validatedData = updatePasswordSchema.parse(req.body);
    const success = await portalService.updatePassword(
      validatedData.PhoneNumber,
      validatedData.NewPassword
    );
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error: any) {
    logger.error(error, 'Failed to update password');
    res.status(400).json({
      success: false,
      error: 'Failed to update password',
      message: error.message,
    });
  }
});

export default router;
