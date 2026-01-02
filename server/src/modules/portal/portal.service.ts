import { portalRepository } from './portal.repo';
import { CreatePortalDTO, LoginDTO, PortalWithCustomer } from './portal.model';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export class PortalService {
  // Register new portal user
  async register(data: CreatePortalDTO): Promise<{ user: PortalWithCustomer; token: string }> {
    // Check if phone already exists
    const existing = await portalRepository.findByPhone(data.PhoneNumber);
    if (existing) {
      throw new Error('Phone number already registered');
    }

    // Create portal user
    const portalUser = await portalRepository.create(data);

    // Get user with customer info
    const userWithCustomer = await portalRepository.getWithCustomer(data.PhoneNumber);
    if (!userWithCustomer) {
      throw new Error('Failed to retrieve user after registration');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: userWithCustomer.Id,
        phoneNumber: userWithCustomer.PhoneNumber,
        isCustomer: userWithCustomer.IsCustomer,
        isDelivery: userWithCustomer.IsDelivery,
      },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    return { user: userWithCustomer, token };
  }

  // Login
  async login(data: LoginDTO): Promise<{ user: PortalWithCustomer; token: string } | null> {
    const user = await portalRepository.login(data.PhoneNumber, data.Password);
    
    if (!user) {
      return null;
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.Id,
        phoneNumber: user.PhoneNumber,
        isCustomer: user.IsCustomer,
        isDelivery: user.IsDelivery,
      },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    return { user, token };
  }

  // Get user by phone
  async getByPhone(phoneNumber: string): Promise<PortalWithCustomer | null> {
    return portalRepository.getWithCustomer(phoneNumber);
  }

  // Update password
  async updatePassword(phoneNumber: string, newPassword: string): Promise<boolean> {
    return portalRepository.updatePassword(phoneNumber, newPassword);
  }
}

export const portalService = new PortalService();
