/**
 * Centralized API route constants for the Client Portal.
 * All API endpoints should be referenced from here — never hardcode URLs in services/hooks/components.
 */
export const API_ROUTES = {
  PORTAL: {
    LOGIN: '/api/portal/login',
    REGISTER: '/api/portal/register',
    ME: '/api/portal/me',
    USER_BY_PHONE: (phone: string) => `/api/portal/user/${encodeURIComponent(phone)}`,
    USER_BY_ID: (id: number) => `/api/portal/user/id/${id}`,
    CATEGORIES: '/api/portal/categories',
  },

  ORDERS: {
    CREATE: '/api/orders',
    DETAIL: (id: number) => `/api/orders/${id}`,
    BY_NUMBER: (orderNumber: string, customerId: number) =>
      `/api/orders/number/${orderNumber}?customerId=${customerId}`,
    CUSTOMER: (customerId: number) => `/api/orders/customer/${customerId}`,
  },

  PRODUCTS: {
    FILTER: '/api/products/filter',
  },

  PARTNERS: {
    SEARCH: '/api/partners/search',
    BY_PHONE: (phone: string) => `/api/partners/phone/${encodeURIComponent(phone)}`,
    DETAIL: (id: number) => `/api/partners/${id}`,
    UPSERT: '/api/partners/upsert',
    INCREMENT_ORDER: (phone: string) =>
      `/api/partners/${encodeURIComponent(phone)}/increment-order`,
  },

  NOTIFICATIONS: {
    LIST: '/api/notifications',
    UNREAD_COUNT: '/api/notifications/unread-count',
    MARK_READ: (id: number) => `/api/notifications/${id}/read`,
    MARK_ALL_READ: '/api/notifications/mark-all-read',
    ARCHIVE: (id: number) => `/api/notifications/${id}/archive`,
    ARCHIVE_ALL: '/api/notifications/archive-all',
    DELETE: (id: number) => `/api/notifications/${id}`,
    DELETE_MANY: '/api/notifications/delete-many',
    DEVICE_TOKEN: (userId: number) => `/api/notifications/device-token/${userId}`,
    DEVICE_TOKEN_DELETE: '/api/notifications/device-token',
    DEVICE_TOKEN_REFRESH: (token: string) => `/api/notifications/device-token/${token}/refresh`,
  },

  PRINTERS: {
    LIST: '/api/printers',
    PRINT_JOBS: '/api/print-jobs',
  },

  PDF: {
    RECEIPT: (orderId: number) => `/api/pdf/receipt/${orderId}?mode=preview`,
    DELIVERY_NOTE: (orderId: number) => `/api/pdf/delivery-note/${orderId}?mode=preview`,
  },

  ONBOARDING: {
    PUBLIC_STATUS: '/api/onboarding/public-status',
  },
} as const;
