import { Customer, CustomerFormData } from '@/types/customer';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

async function http<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`HTTP error! status: ${res.status}, body: ${errorBody}`);
    }

    return res.json();
}

export const api = {
  getProducts: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) => {
    const q = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined) as any
    ).toString();

    return http<any[]>(`/api/products${q ? `?${q}` : ""}`);
  },

  // Customer APIs
  searchCustomers: (phone: string) => {
    return http<{ customers: Customer[] }>(`/api/customers/search?phone=${encodeURIComponent(phone)}`);
  },

  getCustomerByPhone: (phone: string) => {
    return http<{ customer: Customer }>(`/api/customers/${encodeURIComponent(phone)}`);
  },

  upsertCustomer: (data: CustomerFormData) => {
    return http<{ customer: Customer }>(`/api/customers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  incrementCustomerOrderCount: (phone: string) => {
    return http<void>(`/api/customers/${encodeURIComponent(phone)}/increment-order`, {
      method: 'POST',
    });
  },
};
