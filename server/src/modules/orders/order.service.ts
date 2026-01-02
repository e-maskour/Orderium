import { orderRepo } from './order.repo';
import { CreateOrderDTO, OrderWithItems, Document } from './order.model';

export class OrderService {
  // Get all orders (for admin)
  async getAllOrders(limit = 100): Promise<Document[]> {
    return orderRepo.getAllOrders(limit);
  }

  // Create new order
  async createOrder(data: CreateOrderDTO): Promise<OrderWithItems> {
    // Validate items
    if (!data.Items || data.Items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    // Create order with items
    return orderRepo.createOrder(data);
  }

  // Get order by ID
  async getOrderById(id: number): Promise<OrderWithItems | null> {
    return orderRepo.getOrderWithItems(id);
  }

  // Get customer orders
  async getCustomerOrders(customerId: number, limit = 50): Promise<Document[]> {
    return orderRepo.getOrdersByCustomerId(customerId, limit);
  }
}

export const orderService = new OrderService();
