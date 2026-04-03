/**
 * Centralized API route constants for the Delivery Portal.
 * All API endpoints should be referenced from here — never hardcode URLs in services/hooks/components.
 */
export const API_ROUTES = {
  DELIVERY: {
    LOGIN: '/api/delivery/login',
    PERSON_ORDERS: (deliveryPersonId: number) => `/api/delivery/person/${deliveryPersonId}/orders`,
    UPDATE_ORDER_STATUS: (deliveryPersonId: number, orderId: number) =>
      `/api/delivery/person/${deliveryPersonId}/order/${orderId}/status`,
  },

  NOTIFICATIONS: {
    LIST: '/api/notifications',
    UNREAD_COUNT: '/api/notifications/unread-count',
    MARK_READ: (id: number) => `/api/notifications/${id}/read`,
    MARK_ALL_READ: '/api/notifications/mark-all-read',
    ARCHIVE: (id: number) => `/api/notifications/${id}/archive`,
    ARCHIVE_ALL: '/api/notifications/archive-all',
    DEVICE_TOKEN: (userId: number) => `/api/notifications/device-token/${userId}`,
    DEVICE_TOKEN_DELETE: '/api/notifications/device-token',
    DEVICE_TOKEN_REFRESH: (token: string) => `/api/notifications/device-token/${token}/refresh`,
  },

  PRINTERS: {
    LIST: '/api/printers',
    PRINT_JOBS: '/api/print-jobs',
  },

  ONBOARDING: {
    PUBLIC_STATUS: '/api/onboarding/public-status',
  },
} as const;
