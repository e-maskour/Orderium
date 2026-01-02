import { Customer, CustomerFormData } from '@/types/customer';
import { http } from './httpClient';

export const customerService = {
  /**
   * Search customers by phone number
   */
  searchByPhone: (phone: string) => {
    return http<{ customers: Customer[] }>(
      `/api/customers/search?phone=${encodeURIComponent(phone)}`
    );
  },

  /**
   * Get customer by phone number
   */
  getByPhone: (phone: string) => {
    return http<{ customer: Customer }>(
      `/api/customers/${encodeURIComponent(phone)}`
    );
  },

  /**
   * Create or update customer
   */
  upsert: (data: CustomerFormData) => {
    return http<{ customer: Customer }>(`/api/customers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Increment customer order count
   */
  incrementOrderCount: (phone: string) => {
    return http<void>(
      `/api/customers/${encodeURIComponent(phone)}/increment-order`,
      {
        method: 'POST',
      }
    );
  },
};
