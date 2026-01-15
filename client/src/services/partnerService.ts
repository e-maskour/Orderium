import { Partner, PartnerFormData } from '@/types/partner';
import { http } from './httpClient';

export const partnerService = {
  /**
   * Search partners by phone number
   */
  searchByPhone: (phone: string) => {
    return http<{ partners: Partner[] }>(
      `/api/partners/search?phone=${encodeURIComponent(phone)}`
    );
  },

  /**
   * Get partner by phone number
   */
  getByPhone: (phone: string) => {
    return http<{ partner: Partner }>(
      `/api/partners/${encodeURIComponent(phone)}`
    );
  },

  /**
   * Create or update partner
   */
  upsert: (data: PartnerFormData & { portalPhoneNumber?: string }) => {
    return http<{ partner: Partner }>(`/api/partners/upsert`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Increment partner order count
   */
  incrementOrderCount: (phone: string) => {
    return http<void>(
      `/api/partners/${encodeURIComponent(phone)}/increment-order`,
      {
        method: 'POST',
      }
    );
  },
};
