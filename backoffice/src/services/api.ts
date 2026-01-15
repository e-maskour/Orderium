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
    const response = await fetch(`${API_URL}/delivery/persons`);
    if (!response.ok) throw new Error('Failed to fetch delivery persons');
    const data = await response.json();
    const deliveryPersons = data.persons || [];
    return deliveryPersons.map((d: any) => ({
      id: d.id,
      name: d.name,
      phoneNumber: d.phoneNumber,
      email: d.email,
      isActive: d.isActive,
      dateCreated: d.dateCreated,
      dateUpdated: d.dateUpdated,
    }));
  },

  async getById(id: number): Promise<DeliveryPerson> {
    const response = await fetch(`${API_URL}/delivery/persons/${id}`);
    if (!response.ok) throw new Error('Failed to fetch delivery person');
    const data = await response.json();
    const d = data.person;
    return {
      id: d.id,
      name: d.name,
      phoneNumber: d.phoneNumber,
      email: d.email,
      isActive: d.isActive,
      dateCreated: d.dateCreated,
      dateUpdated: d.dateUpdated,
    };
  },

  async create(data: Omit<DeliveryPerson, 'Id' | 'DateCreated' | 'DateUpdated'> & { Password: string }): Promise<DeliveryPerson> {
    const response = await fetch(`${API_URL}/delivery/persons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create delivery person');
    }
    const result = await response.json();
    const d = result.person;
    return {
      id: d.id,
      name: d.name,
      phoneNumber: d.phoneNumber,
      email: d.email,
      isActive: d.isActive,
      dateCreated: d.dateCreated,
      dateUpdated: d.dateUpdated,
    };
  },

  async update(id: number, data: Partial<DeliveryPerson>): Promise<DeliveryPerson> {
    const response = await fetch(`${API_URL}/delivery/persons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update delivery person');
    const result = await response.json();
    const d = result.person;
    return {
      id: d.id,
      name: d.name,
      phoneNumber: d.phoneNumber,
      email: d.email,
      isActive: d.isActive,
      dateCreated: d.dateCreated,
      dateUpdated: d.dateUpdated,
    };
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/delivery/persons/${id}`, {
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
    return data.stats;
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
    const data = await response.json();
    
    // Transform PascalCase to camelCase
    if (data.products) {
      data.products = data.products.map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        price: parseFloat(p.price) || 0,
        cost: parseFloat(p.cost) || 0,
        stock: p.stock != null ? parseInt(p.stock) : null,
        isService: p.isService,
        isEnabled: p.isEnabled,
        isPriceChangeAllowed: p.isPriceChangeAllowed,
        dateCreated: p.dateCreated,
        dateUpdated: p.dateUpdated,
        imageUrl: p.imageUrl,
      }));
    }
    
    return data;
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
    const result = await response.json();
    
    // Transform response
    if (result.product) {
      const p = result.product;
      result.product = {
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        price: parseFloat(p.price) || 0,
        cost: parseFloat(p.cost) || 0,
        stock: p.stock != null ? parseInt(p.stock) : null,
        isService: p.isService,
        isEnabled: p.isEnabled,
        isPriceChangeAllowed: p.isPriceChangeAllowed,
        dateCreated: p.dateCreated,
        dateUpdated: p.dateUpdated,
        imageUrl: p.imageUrl,
      };
    }
    
    return result;
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
    const result = await response.json();
    
    // Transform response
    if (result.product) {
      const p = result.product;
      result.product = {
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        price: parseFloat(p.price) || 0,
        cost: parseFloat(p.cost) || 0,
        stock: p.stock != null ? parseInt(p.stock) : null,
        isService: p.isService,
        isEnabled: p.isEnabled,
        isPriceChangeAllowed: p.isPriceChangeAllowed,
        dateCreated: p.dateCreated,
        dateUpdated: p.dateUpdated,
        imageUrl: p.imageUrl,
      };
    }
    
    return result;
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
    const response = await fetch(`${API_URL}/partners`);
    if (!response.ok) throw new Error('Failed to fetch customers');
    const data = await response.json();
    const partners = data.partners || [];
    return { 
      customers: partners.map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        taxNumber: c.taxNumber,
        address: c.address,
        postalCode: c.postalCode,
        city: c.city,
        countryId: c.countryId,
        email: c.email,
        phoneNumber: c.phoneNumber,
        isEnabled: c.isEnabled,
        isCustomer: c.isCustomer,
        isSupplier: c.isSupplier,
        dueDatePeriod: c.dueDatePeriod,
        dateCreated: c.dateCreated,
        dateUpdated: c.dateUpdated,
        streetName: c.streetName,
        additionalStreetName: c.additionalStreetName,
        buildingNumber: c.buildingNumber,
        plotIdentification: c.plotIdentification,
        citySubdivisionName: c.citySubdivisionName,
        countrySubentity: c.countrySubentity,
        isTaxExempt: c.isTaxExempt,
        priceListId: c.priceListId,
        latitude: c.latitude,
        longitude: c.longitude,
        googleMapsUrl: c.googleMapsUrl,
        wazeUrl: c.wazeUrl,
        totalOrders: c.totalOrders,
      })),
      total: data.total || 0 
    };
  },

  async getByPhone(phone: string): Promise<Customer> {
    const response = await fetch(`${API_URL}/partners/${encodeURIComponent(phone)}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    const c = data.partner;
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      taxNumber: c.taxNumber,
      address: c.address,
      postalCode: c.postalCode,
      city: c.city,
      countryId: c.countryId,
      email: c.email,
      phoneNumber: c.phoneNumber,
      isEnabled: c.isEnabled,
      isCustomer: c.isCustomer,
      isSupplier: c.isSupplier,
      dueDatePeriod: c.dueDatePeriod,
      dateCreated: c.dateCreated,
      dateUpdated: c.dateUpdated,
      streetName: c.streetName,
      additionalStreetName: c.additionalStreetName,
      buildingNumber: c.buildingNumber,
      plotIdentification: c.plotIdentification,
      citySubdivisionName: c.citySubdivisionName,
      countrySubentity: c.countrySubentity,
      isTaxExempt: c.isTaxExempt,
      priceListId: c.priceListId,
      latitude: c.latitude,
      longitude: c.longitude,
      googleMapsUrl: c.googleMapsUrl,
      wazeUrl: c.wazeUrl,
      totalOrders: c.totalOrders,
    };
  },

  async create(data: Omit<Customer, 'Id' | 'DateCreated' | 'DateUpdated' | 'Code' | 'IsCustomer' | 'IsSupplier' | 'IsEnabled' | 'DueDatePeriod' | 'IsTaxExempt'>): Promise<Customer> {
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
    const c = result.partner;
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      taxNumber: c.taxNumber,
      address: c.address,
      postalCode: c.postalCode,
      city: c.city,
      countryId: c.countryId,
      email: c.email,
      phoneNumber: c.phoneNumber,
      isEnabled: c.isEnabled,
      isCustomer: c.isCustomer,
      isSupplier: c.isSupplier,
      dueDatePeriod: c.dueDatePeriod,
      dateCreated: c.dateCreated,
      dateUpdated: c.dateUpdated,
      streetName: c.streetName,
      additionalStreetName: c.additionalStreetName,
      buildingNumber: c.buildingNumber,
      plotIdentification: c.plotIdentification,
      citySubdivisionName: c.citySubdivisionName,
      countrySubentity: c.countrySubentity,
      isTaxExempt: c.isTaxExempt,
      priceListId: c.priceListId,
      latitude: c.latitude,
      longitude: c.longitude,
      googleMapsUrl: c.googleMapsUrl,
      wazeUrl: c.wazeUrl,
      totalOrders: c.totalOrders,
    };
  },

  async update(phone: string, data: Partial<Customer>): Promise<Customer> {
    const response = await fetch(`${API_URL}/partners/${encodeURIComponent(phone)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update customer');
    }
    const result = await response.json();
    const c = result.partner;
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      taxNumber: c.taxNumber,
      address: c.address,
      postalCode: c.postalCode,
      city: c.city,
      countryId: c.countryId,
      email: c.email,
      phoneNumber: c.phoneNumber,
      isEnabled: c.isEnabled,
      isCustomer: c.isCustomer,
      isSupplier: c.isSupplier,
      dueDatePeriod: c.dueDatePeriod,
      dateCreated: c.dateCreated,
      dateUpdated: c.dateUpdated,
      streetName: c.streetName,
      additionalStreetName: c.additionalStreetName,
      buildingNumber: c.buildingNumber,
      plotIdentification: c.plotIdentification,
      citySubdivisionName: c.citySubdivisionName,
      countrySubentity: c.countrySubentity,
      isTaxExempt: c.isTaxExempt,
      priceListId: c.priceListId,
      latitude: c.latitude,
      longitude: c.longitude,
      googleMapsUrl: c.googleMapsUrl,
      wazeUrl: c.wazeUrl,
      totalOrders: c.totalOrders,
    };
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
    const invoices = data.invoices || [];
    return invoices.map((inv: any) => ({
      invoice: {
        id: inv.invoice?.id || inv.id,
        invoiceNumber: inv.invoice?.invoiceNumber || inv.invoiceNumber,
        customerId: inv.invoice?.customerId || inv.customerId,
        adminId: inv.invoice?.adminId || inv.adminId,
        date: inv.invoice?.date || inv.date,
        dueDate: inv.invoice?.dueDate || inv.dueDate,
        subtotal: parseFloat(inv.invoice?.subtotal || inv.subtotal) || 0,
        taxAmount: parseFloat(inv.invoice?.taxAmount || inv.taxAmount) || 0,
        discountAmount: parseFloat(inv.invoice?.discountAmount || inv.discountAmount) || 0,
        total: parseFloat(inv.invoice?.total || inv.total) || 0,
        paidAmount: parseFloat(inv.invoice?.paidAmount || inv.paidAmount) || 0,
        status: inv.invoice?.status || inv.status,
        paymentStatus: inv.invoice?.paymentStatus || inv.paymentStatus,
        note: inv.invoice?.note || inv.note,
        terms: inv.invoice?.terms || inv.terms,
        createdAt: inv.invoice?.createdAt || inv.createdAt,
        updatedAt: inv.invoice?.updatedAt || inv.updatedAt,
      },
      items: (inv.items || inv.items || []).map((item: any) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        discountType: item.discountType,
        taxRate: parseFloat(item.taxRate) || 0,
        total: parseFloat(item.total) || 0,
      })),
      customer: inv.customer || inv.customer ? {
        id: inv.customer?.id || inv.customer?.id,
        name: inv.customer?.name || inv.customer?.name,
        email: inv.customer?.email || inv.customer?.email,
        phone: inv.customer?.phone || inv.customer?.phone,
        address: inv.customer?.address || inv.customer?.address,
        city: inv.customer?.city || inv.customer?.city,
      } : undefined,
    }));
  },

  async getById(id: number): Promise<InvoiceWithDetails> {
    const response = await fetch(`${API_URL}/invoices/${id}`);
    if (!response.ok) throw new Error('Failed to fetch invoice');
    const data = await response.json();
    const inv = data.invoice;
    return {
      invoice: {
        id: inv.invoice?.id || inv.id,
        invoiceNumber: inv.invoice?.invoiceNumber || inv.invoiceNumber,
        customerId: inv.invoice?.customerId || inv.customerId,
        adminId: inv.invoice?.adminId || inv.adminId,
        date: inv.invoice?.date || inv.date,
        dueDate: inv.invoice?.dueDate || inv.dueDate,
        subtotal: parseFloat(inv.invoice?.subtotal || inv.subtotal) || 0,
        taxAmount: parseFloat(inv.invoice?.taxAmount || inv.taxAmount) || 0,
        discountAmount: parseFloat(inv.invoice?.discountAmount || inv.discountAmount) || 0,
        total: parseFloat(inv.invoice?.total || inv.total) || 0,
        paidAmount: parseFloat(inv.invoice?.paidAmount || inv.paidAmount) || 0,
        status: inv.invoice?.status || inv.status,
        paymentStatus: inv.invoice?.paymentStatus || inv.paymentStatus,
        note: inv.invoice?.note || inv.note,
        terms: inv.invoice?.terms || inv.terms,
        createdAt: inv.invoice?.createdAt || inv.createdAt,
        updatedAt: inv.invoice?.updatedAt || inv.updatedAt,
      },
      items: (inv.items || inv.items || []).map((item: any) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        discountType: item.discountType,
        taxRate: parseFloat(item.taxRate) || 0,
        total: parseFloat(item.total) || 0,
      })),
      customer: inv.customer || inv.customer ? {
        id: inv.customer?.id || inv.customer?.id,
        name: inv.customer?.name || inv.customer?.name,
        email: inv.customer?.email || inv.customer?.email,
        phone: inv.customer?.phone || inv.customer?.phone,
        address: inv.customer?.address || inv.customer?.address,
        city: inv.customer?.city || inv.customer?.city,
      } : undefined,
    };
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
    const inv = result.invoice;
    return {
      invoice: {
        id: inv.invoice?.id || inv.id,
        invoiceNumber: inv.invoice?.invoiceNumber || inv.invoiceNumber,
        customerId: inv.invoice?.customerId || inv.customerId,
        adminId: inv.invoice?.adminId || inv.adminId,
        date: inv.invoice?.date || inv.date,
        dueDate: inv.invoice?.dueDate || inv.dueDate,
        subtotal: parseFloat(inv.invoice?.subtotal || inv.subtotal) || 0,
        taxAmount: parseFloat(inv.invoice?.taxAmount || inv.taxAmount) || 0,
        discountAmount: parseFloat(inv.invoice?.discountAmount || inv.discountAmount) || 0,
        total: parseFloat(inv.invoice?.total || inv.total) || 0,
        paidAmount: parseFloat(inv.invoice?.paidAmount || inv.paidAmount) || 0,
        status: inv.invoice?.status || inv.status,
        paymentStatus: inv.invoice?.paymentStatus || inv.paymentStatus,
        note: inv.invoice?.note || inv.note,
        terms: inv.invoice?.terms || inv.terms,
        createdAt: inv.invoice?.createdAt || inv.createdAt,
        updatedAt: inv.invoice?.updatedAt || inv.updatedAt,
      },
      items: (inv.items || inv.items || []).map((item: any) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        discountType: item.discountType,
        taxRate: parseFloat(item.taxRate) || 0,
        total: parseFloat(item.total) || 0,
      })),
      customer: inv.customer || inv.customer ? {
        id: inv.customer?.id || inv.customer?.id,
        name: inv.customer?.name || inv.customer?.name,
        email: inv.customer?.email || inv.customer?.email,
        phone: inv.customer?.phone || inv.customer?.phone,
        address: inv.customer?.address || inv.customer?.address,
        city: inv.customer?.city || inv.customer?.city,
      } : undefined,
    };
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
    const inv = result.invoice;
    return {
      invoice: {
        id: inv.invoice?.id || inv.id,
        invoiceNumber: inv.invoice?.invoiceNumber || inv.invoiceNumber,
        customerId: inv.invoice?.customerId || inv.customerId,
        adminId: inv.invoice?.adminId || inv.adminId,
        date: inv.invoice?.date || inv.date,
        dueDate: inv.invoice?.dueDate || inv.dueDate,
        subtotal: parseFloat(inv.invoice?.subtotal || inv.subtotal) || 0,
        taxAmount: parseFloat(inv.invoice?.taxAmount || inv.taxAmount) || 0,
        discountAmount: parseFloat(inv.invoice?.discountAmount || inv.discountAmount) || 0,
        total: parseFloat(inv.invoice?.total || inv.total) || 0,
        paidAmount: parseFloat(inv.invoice?.paidAmount || inv.paidAmount) || 0,
        status: inv.invoice?.status || inv.status,
        paymentStatus: inv.invoice?.paymentStatus || inv.paymentStatus,
        note: inv.invoice?.note || inv.note,
        terms: inv.invoice?.terms || inv.terms,
        createdAt: inv.invoice?.createdAt || inv.createdAt,
        updatedAt: inv.invoice?.updatedAt || inv.updatedAt,
      },
      items: (inv.items || inv.items || []).map((item: any) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        discountType: item.discountType,
        taxRate: parseFloat(item.taxRate) || 0,
        total: parseFloat(item.total) || 0,
      })),
      customer: inv.customer || inv.customer ? {
        id: inv.customer?.id || inv.customer?.id,
        name: inv.customer?.name || inv.customer?.name,
        email: inv.customer?.email || inv.customer?.email,
        phone: inv.customer?.phone || inv.customer?.phone,
        address: inv.customer?.address || inv.customer?.address,
        city: inv.customer?.city || inv.customer?.city,
      } : undefined,
    };
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
    const inv = result.invoice;
    return {
      invoice: {
        id: inv.invoice?.id || inv.id,
        invoiceNumber: inv.invoice?.invoiceNumber || inv.invoiceNumber,
        customerId: inv.invoice?.customerId || inv.customerId,
        adminId: inv.invoice?.adminId || inv.adminId,
        date: inv.invoice?.date || inv.date,
        dueDate: inv.invoice?.dueDate || inv.dueDate,
        subtotal: parseFloat(inv.invoice?.subtotal || inv.subtotal) || 0,
        taxAmount: parseFloat(inv.invoice?.taxAmount || inv.taxAmount) || 0,
        discountAmount: parseFloat(inv.invoice?.discountAmount || inv.discountAmount) || 0,
        total: parseFloat(inv.invoice?.total || inv.total) || 0,
        paidAmount: parseFloat(inv.invoice?.paidAmount || inv.paidAmount) || 0,
        status: inv.invoice?.status || inv.status,
        paymentStatus: inv.invoice?.paymentStatus || inv.paymentStatus,
        note: inv.invoice?.note || inv.note,
        terms: inv.invoice?.terms || inv.terms,
        createdAt: inv.invoice?.createdAt || inv.createdAt,
        updatedAt: inv.invoice?.updatedAt || inv.updatedAt,
      },
      items: (inv.items || inv.items || []).map((item: any) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        discountType: item.discountType,
        taxRate: parseFloat(item.taxRate) || 0,
        total: parseFloat(item.total) || 0,
      })),
      customer: inv.customer || inv.customer ? {
        id: inv.customer?.id || inv.customer?.id,
        name: inv.customer?.name || inv.customer?.name,
        email: inv.customer?.email || inv.customer?.email,
        phone: inv.customer?.phone || inv.customer?.phone,
        address: inv.customer?.address || inv.customer?.address,
        city: inv.customer?.city || inv.customer?.city,
      } : undefined,
    };
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
    const inv = result.invoice;
    return {
      invoice: {
        id: inv.invoice?.id || inv.id,
        invoiceNumber: inv.invoice?.invoiceNumber || inv.invoiceNumber,
        customerId: inv.invoice?.customerId || inv.customerId,
        adminId: inv.invoice?.adminId || inv.adminId,
        date: inv.invoice?.date || inv.date,
        dueDate: inv.invoice?.dueDate || inv.dueDate,
        subtotal: parseFloat(inv.invoice?.subtotal || inv.subtotal) || 0,
        taxAmount: parseFloat(inv.invoice?.taxAmount || inv.taxAmount) || 0,
        discountAmount: parseFloat(inv.invoice?.discountAmount || inv.discountAmount) || 0,
        total: parseFloat(inv.invoice?.total || inv.total) || 0,
        paidAmount: parseFloat(inv.invoice?.paidAmount || inv.paidAmount) || 0,
        status: inv.invoice?.status || inv.status,
        paymentStatus: inv.invoice?.paymentStatus || inv.paymentStatus,
        note: inv.invoice?.note || inv.note,
        terms: inv.invoice?.terms || inv.terms,
        createdAt: inv.invoice?.createdAt || inv.createdAt,
        updatedAt: inv.invoice?.updatedAt || inv.updatedAt,
      },
      items: (inv.items || inv.items || []).map((item: any) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        discountType: item.discountType,
        taxRate: parseFloat(item.taxRate) || 0,
        total: parseFloat(item.total) || 0,
      })),
      customer: inv.customer || inv.customer ? {
        id: inv.customer?.id || inv.customer?.id,
        name: inv.customer?.name || inv.customer?.name,
        email: inv.customer?.email || inv.customer?.email,
        phone: inv.customer?.phone || inv.customer?.phone,
        address: inv.customer?.address || inv.customer?.address,
        city: inv.customer?.city || inv.customer?.city,
      } : undefined,
    };
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
