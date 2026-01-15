import { CustomersResponse, CreateCustomerDTO, UpdateCustomerDTO } from './customers.interface';
import { Customer } from './customers.model';

const API_URL = '/api';

export class CustomersService {
  async getAll(): Promise<CustomersResponse> {
    const response = await fetch(`${API_URL}/partners`);
    if (!response.ok) throw new Error('Failed to fetch customers');
    const data = await response.json();
    const partners = data.partners || [];
    return { 
      customers: partners.map((c: any) => Customer.fromApiResponse(c)),
      total: data.total || 0 
    };
  }

  async getByPhone(phone: string): Promise<Customer> {
    const response = await fetch(`${API_URL}/partners/${encodeURIComponent(phone)}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    return Customer.fromApiResponse(data.partner);
  }

  async create(data: CreateCustomerDTO): Promise<Customer> {
    const response = await fetch(`${API_URL}/partners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create customer');
    }
    const result = await response.json();
    return Customer.fromApiResponse(result.partner);
  }

  async update(id: number, data: UpdateCustomerDTO): Promise<Customer> {
    const response = await fetch(`${API_URL}/partners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update customer');
    }
    const result = await response.json();
    return Customer.fromApiResponse(result.partner);
  }

  async delete(phone: string): Promise<void> {
    const response = await fetch(`${API_URL}/customers/${encodeURIComponent(phone)}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete customer');
  }
}

export const customersService = new CustomersService();