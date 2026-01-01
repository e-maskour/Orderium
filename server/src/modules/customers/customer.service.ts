import { customerRepo } from './customer.repo';
import { CreateCustomerDTO, UpdateCustomerDTO, Customer } from './customer.model';

export class CustomerService {
  // Search by phone (exact or prefix)
  async searchByPhone(phone: string): Promise<Customer[]> {
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    // If exact match, return it
    const exact = customerRepo.findByPhone(cleanPhone);
    if (exact) {
      return [exact];
    }
    
    // Otherwise, search by prefix
    return customerRepo.searchByPhone(cleanPhone);
  }

  // Get customer by phone
  async getByPhone(phone: string): Promise<Customer | null> {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    return customerRepo.findByPhone(cleanPhone) || null;
  }

  // Get all customers
  async getAll(page = 1, pageSize = 50): Promise<{ customers: Customer[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const customers = customerRepo.findAll(pageSize, offset);
    const total = customerRepo.count();
    return { customers, total };
  }

  // Create or update customer
  async upsert(data: CreateCustomerDTO): Promise<Customer> {
    // Clean phone number
    const cleanPhone = data.phone.replace(/[\s\-()]/g, '');
    
    // Generate map URLs if coordinates provided
    let googleMapsUrl = data.googleMapsUrl;
    let wazeUrl = data.wazeUrl;
    
    if (data.latitude && data.longitude) {
      if (!googleMapsUrl) {
        googleMapsUrl = `https://www.google.com/maps?q=${data.latitude},${data.longitude}`;
      }
      if (!wazeUrl) {
        wazeUrl = `https://waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes`;
      }
    }

    return customerRepo.upsert({
      ...data,
      phone: cleanPhone,
      googleMapsUrl,
      wazeUrl,
    });
  }

  // Update customer
  async update(phone: string, data: UpdateCustomerDTO): Promise<Customer | null> {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    // Generate map URLs if coordinates provided
    let updateData = { ...data };
    
    if (data.latitude && data.longitude) {
      if (!updateData.googleMapsUrl) {
        updateData.googleMapsUrl = `https://www.google.com/maps?q=${data.latitude},${data.longitude}`;
      }
      if (!updateData.wazeUrl) {
        updateData.wazeUrl = `https://waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes`;
      }
    }

    return customerRepo.update(cleanPhone, updateData) || null;
  }

  // Increment order count after successful checkout
  async incrementOrderCount(phone: string): Promise<void> {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    customerRepo.incrementOrderCount(cleanPhone);
  }

  // Delete customer
  async delete(phone: string): Promise<boolean> {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    return customerRepo.delete(cleanPhone);
  }
}

export const customerService = new CustomerService();
