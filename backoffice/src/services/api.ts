import { 
  DeliveryPerson, 
  Customer, 
  InvoiceWithDetails, 
  CreateInvoiceDTO, 
  UpdateInvoiceDTO, 
  RecordPaymentDTO, 
  InvoiceFilters,
  InvoiceStatistics 
} from '../types';

const API_URL = '/api';

export const deliveryPersonService = {
  async getAll(): Promise<DeliveryPerson[]> {
    const response = await fetch(`${API_URL}/delivery`);
    if (!response.ok) throw new Error('Failed to fetch delivery persons');
    const data = await response.json();
    return data.deliveryPersons || [];
  },

  async getById(id: number): Promise<DeliveryPerson> {
    const response = await fetch(`${API_URL}/delivery/${id}`);
    if (!response.ok) throw new Error('Failed to fetch delivery person');
    const data = await response.json();
    return data.deliveryPerson;
  },

  async create(data: Omit<DeliveryPerson, 'Id' | 'DateCreated' | 'DateUpdated'> & { Password: string }): Promise<DeliveryPerson> {
    const response = await fetch(`${API_URL}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create delivery person');
    }
    const result = await response.json();
    return result.deliveryPerson;
  },

  async update(id: number, data: Partial<DeliveryPerson>): Promise<DeliveryPerson> {
    const response = await fetch(`${API_URL}/delivery/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update delivery person');
    const result = await response.json();
    return result.deliveryPerson;
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/delivery/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete delivery person');
  },
};

export const orderService = {
  async getAll(search?: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/delivery/orders${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    const data = await response.json();
    return data.orders || data;
  },

  async assignToDelivery(orderId: number, deliveryPersonId: number): Promise<void> {
    const response = await fetch(`${API_URL}/delivery/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ OrderId: orderId, DeliveryPersonId: deliveryPersonId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to assign order');
    }
  },

  async unassignOrder(orderId: number): Promise<void> {
    const response = await fetch(`${API_URL}/delivery/unassign/${orderId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to unassign order');
  },

  async getById(orderId: number): Promise<any> {
    const response = await fetch(`${API_URL}/orders/${orderId}`);
    if (!response.ok) throw new Error('Failed to fetch order details');
    const data = await response.json();
    return data.order;
  },
};

export const statisticsService = {
  async getStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/statistics${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch statistics');
    const data = await response.json();
    return data.statistics;
  },
};

export const productsService = {
  async getProducts({ search, page = 1, limit = 24 }: { search?: string; page?: number; limit?: number } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/products${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return await response.json();
  },

  async createProduct(data: any): Promise<any> {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create product');
    }
    return await response.json();
  },

  async updateProduct(id: number, data: any): Promise<any> {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update product');
    }
    return await response.json();
  },

  async deleteProduct(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete product');
    }
  },
};

export const customerService = {
  async getAll(): Promise<{ customers: Customer[]; total: number }> {
    const response = await fetch(`${API_URL}/customers`);
    if (!response.ok) throw new Error('Failed to fetch customers');
    const data = await response.json();
    return { customers: data.customers || [], total: data.total || 0 };
  },

  async getByPhone(phone: string): Promise<Customer> {
    const response = await fetch(`${API_URL}/customers/${encodeURIComponent(phone)}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    return data.customer;
  },

  async create(data: Omit<Customer, 'Id' | 'DateCreated' | 'DateUpdated' | 'Code' | 'IsCustomer' | 'IsSupplier' | 'IsEnabled' | 'DueDatePeriod' | 'IsTaxExempt'>): Promise<Customer> {
    const response = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create customer');
    }
    const result = await response.json();
    return result.customer;
  },

  async update(phone: string, data: Partial<Customer>): Promise<Customer> {
    const response = await fetch(`${API_URL}/customers/${encodeURIComponent(phone)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update customer');
    }
    const result = await response.json();
    return result.customer;
  },

  async delete(phone: string): Promise<void> {
    const response = await fetch(`${API_URL}/customers/${encodeURIComponent(phone)}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete customer');
  },
};

export const invoiceService = {
  async getAll(filters?: InvoiceFilters): Promise<InvoiceWithDetails[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
    if (filters?.customerId) params.append('customerId', filters.customerId.toString());
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/invoices${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch invoices');
    const data = await response.json();
    return data.invoices || [];
  },

  async getById(id: number): Promise<InvoiceWithDetails> {
    const response = await fetch(`${API_URL}/invoices/${id}`);
    if (!response.ok) throw new Error('Failed to fetch invoice');
    const data = await response.json();
    return data.invoice;
  },

  async create(data: CreateInvoiceDTO): Promise<InvoiceWithDetails> {
    const response = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create invoice');
    }
    const result = await response.json();
    return result.invoice;
  },

  async update(id: number, data: UpdateInvoiceDTO): Promise<InvoiceWithDetails> {
    const response = await fetch(`${API_URL}/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update invoice');
    }
    const result = await response.json();
    return result.invoice;
  },

  async updateStatus(id: number, status: string): Promise<InvoiceWithDetails> {
    const response = await fetch(`${API_URL}/invoices/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update invoice status');
    }
    const result = await response.json();
    return result.invoice;
  },

  async recordPayment(id: number, data: Omit<RecordPaymentDTO, 'InvoiceId'>): Promise<InvoiceWithDetails> {
    const response = await fetch(`${API_URL}/invoices/${id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to record payment');
    }
    const result = await response.json();
    return result.invoice;
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/invoices/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete invoice');
    }
  },

  async getStatistics(filters?: InvoiceFilters): Promise<InvoiceStatistics> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
    if (filters?.customerId) params.append('customerId', filters.customerId.toString());
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/invoices/statistics${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch invoice statistics');
    const data = await response.json();
    return data.statistics;
  },

  async getOverdue(): Promise<InvoiceWithDetails[]> {
    const response = await fetch(`${API_URL}/invoices/overdue`);
    if (!response.ok) throw new Error('Failed to fetch overdue invoices');
    const data = await response.json();
    return data.invoices || [];
  },
};
