import { customerRepo } from './customer.repo';
import { CreateCustomerDTO, UpdateCustomerDTO, Customer } from './customer.model';

export class CustomerService {
  // Initialize repository
  async initialize(): Promise<void> {
    await customerRepo.initialize();
  }

  // Search by phone (exact or prefix)
  async searchByPhone(phone: string): Promise<Customer[]> {
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    // If exact match, return it
    const exact = await customerRepo.findByPhone(cleanPhone);
    if (exact) {
      return [exact];
    }
    
    // Otherwise, search by prefix
    return customerRepo.searchByPhone(cleanPhone);
  }

  // Get customer by phone
  async getByPhone(phone: string): Promise<Customer | null> {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    return customerRepo.findByPhone(cleanPhone);
  }

  // Get all customers
  async getAll(page = 1, pageSize = 50): Promise<{ customers: Customer[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const customers = await customerRepo.findAll(pageSize, offset);
    const total = await customerRepo.count();
    return { customers, total };
  }

  // Create or update customer
  async upsert(data: CreateCustomerDTO): Promise<Customer> {
    // Clean phone number
    const cleanPhone = data.PhoneNumber.replace(/[\s\-()]/g, '');
    
    // Generate map URLs if coordinates provided
    let GoogleMapsUrl = data.GoogleMapsUrl;
    let WazeUrl = data.WazeUrl;
    
    if (data.Latitude && data.Longitude) {
      if (!GoogleMapsUrl) {
        GoogleMapsUrl = `https://www.google.com/maps?q=${data.Latitude},${data.Longitude}`;
      }
      if (!WazeUrl) {
        WazeUrl = `https://waze.com/ul?ll=${data.Latitude},${data.Longitude}&navigate=yes`;
      }
    }

    return customerRepo.upsert({
      ...data,
      PhoneNumber: cleanPhone,
      GoogleMapsUrl,
      WazeUrl,
    });
  }

  // Update customer
  async update(phone: string, data: UpdateCustomerDTO): Promise<Customer | null> {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    // Generate map URLs if coordinates provided
    let updateData = { ...data };
    
    if (data.Latitude && data.Longitude) {
      if (!updateData.GoogleMapsUrl) {
        updateData.GoogleMapsUrl = `https://www.google.com/maps?q=${data.Latitude},${data.Longitude}`;
      }
      if (!updateData.WazeUrl) {
        updateData.WazeUrl = `https://waze.com/ul?ll=${data.Latitude},${data.Longitude}&navigate=yes`;
      }
    }

    return customerRepo.update(cleanPhone, updateData);
  }

  // Delete customer
  async delete(phone: string): Promise<boolean> {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    return customerRepo.delete(cleanPhone);
  }
}

export const customerService = new CustomerService();
