/**
 * Centralized API route constants for the Delivery Portal.
 * All API endpoints should be referenced from here — never hardcode URLs in services/hooks/components.
 */
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export const API_ROUTES = {
  DELIVERY: {
    LOGIN: `${BASE}/api/delivery/login`,
    PERSON_ORDERS: (deliveryPersonId: number) =>
      `${BASE}/api/delivery/person/${deliveryPersonId}/orders`,
    UPDATE_ORDER_STATUS: (deliveryPersonId: number, orderId: number) =>
      `${BASE}/api/delivery/person/${deliveryPersonId}/order/${orderId}/status`,
  },

  NOTIFICATIONS: {
    LIST: `${BASE}/api/notifications`,
    UNREAD_COUNT: `${BASE}/api/notifications/unread-count`,
    MARK_READ: (id: number) => `${BASE}/api/notifications/${id}/read`,
    MARK_ALL_READ: `${BASE}/api/notifications/mark-all-read`,
    ARCHIVE: (id: number) => `${BASE}/api/notifications/${id}/archive`,
    ARCHIVE_ALL: `${BASE}/api/notifications/archive-all`,
    DEVICE_TOKEN: (userId: number) => `${BASE}/api/notifications/device-token/${userId}`,
    DEVICE_TOKEN_DELETE: `${BASE}/api/notifications/device-token`,
    DEVICE_TOKEN_REFRESH: (token: string) =>
      `${BASE}/api/notifications/device-token/${token}/refresh`,
  },

  PRINTERS: {
    LIST: `${BASE}/api/printers`,
    PRINT_JOBS: `${BASE}/api/print-jobs`,
  },

  ONBOARDING: {
    PUBLIC_STATUS: `${BASE}/api/onboarding/public-status`,
  },
} as const;
