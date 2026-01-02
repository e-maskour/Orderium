import { deliveryRepository } from './delivery.repo';
import { portalService } from '../portal/portal.service';
import type { DeliveryPerson, CreateDeliveryPersonDTO, UpdateDeliveryPersonDTO, DeliveryLoginDTO, DeliveryOrder } from './delivery.model';

class DeliveryService {
  async initialize() {
    await deliveryRepository.initialize();
  }

  // Login delivery person
  async login(credentials: DeliveryLoginDTO): Promise<{ deliveryPerson: DeliveryPerson; token: string } | null> {
    // Authenticate through portal
    const portalAuth = await portalService.login({
      PhoneNumber: credentials.PhoneNumber,
      Password: credentials.Password,
    });

    if (!portalAuth) {
      return null;
    }

    // Get delivery person details
    const deliveryPerson = await deliveryRepository.findByPhone(credentials.PhoneNumber);
    
    if (!deliveryPerson) {
      return null;
    }

    if (!deliveryPerson.IsActive) {
      throw new Error('Delivery person account is inactive');
    }

    return {
      deliveryPerson,
      token: portalAuth.token,
    };
  }

  // Create delivery person
  async create(data: CreateDeliveryPersonDTO): Promise<DeliveryPerson> {
    // Check if phone number already exists
    const existing = await deliveryRepository.findByPhone(data.PhoneNumber);
    if (existing) {
      throw new Error('Phone number already registered');
    }

    // Create delivery person record
    const deliveryPerson = await deliveryRepository.create(data);

    // Create portal account for authentication
    await portalService.register({
      PhoneNumber: data.PhoneNumber,
      Password: data.Password,
      IsDelivery: true,
      DeliveryId: deliveryPerson.Id,
    });

    return deliveryPerson;
  }

  async findById(id: number): Promise<DeliveryPerson | null> {
    return deliveryRepository.findById(id);
  }

  async findByPhone(phoneNumber: string): Promise<DeliveryPerson | null> {
    return deliveryRepository.findByPhone(phoneNumber);
  }

  async getAll(): Promise<DeliveryPerson[]> {
    return deliveryRepository.getAll();
  }

  async update(id: number, data: UpdateDeliveryPersonDTO): Promise<DeliveryPerson | null> {
    return deliveryRepository.update(id, data);
  }

  async delete(id: number): Promise<boolean> {
    const deliveryPerson = await deliveryRepository.findById(id);
    if (!deliveryPerson) {
      return false;
    }

    // Delete portal account
    const portalUser = await portalService.getByPhone(deliveryPerson.PhoneNumber);
    if (portalUser) {
      // Note: You might want to add a delete method to portal service
      // For now, we just deactivate the delivery person
      await deliveryRepository.update(id, { IsActive: false });
      return true;
    }

    return deliveryRepository.delete(id);
  }

  // Get orders assigned to delivery person
  async getAssignedOrders(deliveryPersonId: number, search?: string): Promise<DeliveryOrder[]> {
    return deliveryRepository.getAssignedOrders(deliveryPersonId, search);
  }

  // Get all orders (admin view - includes unassigned and assigned)
  async getAllOrders(search?: string): Promise<DeliveryOrder[]> {
    return deliveryRepository.getAllOrders(search);
  }

  // Update order status
  async updateOrderStatus(orderId: number, deliveryPersonId: number, status: 'confirmed' | 'picked_up' | 'in_delivery' | 'delivered'): Promise<boolean> {
    return deliveryRepository.updateOrderStatus(orderId, deliveryPersonId, status);
  }

  // Assign order to delivery person
  async assignOrder(orderId: number, deliveryPersonId: number): Promise<boolean> {
    return deliveryRepository.assignOrder(orderId, deliveryPersonId);
  }

  // Unassign order from delivery person
  async unassignOrder(orderId: number): Promise<boolean> {
    return deliveryRepository.unassignOrder(orderId);
  }
}

export const deliveryService = new DeliveryService();
