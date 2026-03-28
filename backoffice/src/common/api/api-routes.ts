/**
 * ═══════════════════════════════════════════════════════════════
 *  MOROCOM — Centralized API Route Configuration
 * ═══════════════════════════════════════════════════════════════
 *
 *  Single source of truth for all API endpoints.
 *  Prevents hardcoded URL strings across the application.
 *  Supports both static and dynamic (parameterized) routes.
 * ═══════════════════════════════════════════════════════════════
 */

export const API_ROUTES = {
    // ─── Auth ──────────────────────────────────────────────────
    AUTH: {
        LOGIN: '/api/portal/admin/login',
    },

    // ─── Categories ────────────────────────────────────────────
    CATEGORIES: {
        LIST: '/api/categories',
        HIERARCHY: '/api/categories/hierarchy',
        BY_TYPE: (type: string) => `/api/categories/type/${type}`,
        DETAIL: (id: number) => `/api/categories/${id}`,
        CREATE: '/api/categories',
        UPDATE: (id: number) => `/api/categories/${id}`,
        DELETE: (id: number) => `/api/categories/${id}`,
    },

    // ─── Products ──────────────────────────────────────────────
    PRODUCTS: {
        LIST: '/api/products',
        FILTER: '/api/products/filter',
        CREATE: '/api/products/create',
        DETAIL: (id: number) => `/api/products/${id}`,
        UPDATE: (id: number) => `/api/products/${id}`,
        DELETE: (id: number) => `/api/products/${id}`,
        IMAGE_UPLOAD: (id: number) => `/api/products/${id}/image`,
        IMAGE_DELETE: (id: number) => `/api/products/${id}/image`,
        EXPORT_XLSX: '/api/products/export/xlsx',
        IMPORT_XLSX: '/api/products/import/xlsx',
        IMPORT_TEMPLATE: '/api/products/import/template',
    },

    // ─── Orders ────────────────────────────────────────────────
    ORDERS: {
        LIST: '/api/orders',
        FILTER: '/api/orders/filter',
        CREATE: '/api/orders',
        DETAIL: (id: number) => `/api/orders/${id}`,
        UPDATE: (id: number) => `/api/orders/${id}`,
        DELETE: (id: number) => `/api/orders/${id}`,
        VALIDATE: (id: number) => `/api/orders/${id}/validate`,
        DEVALIDATE: (id: number) => `/api/orders/${id}/devalidate`,
        DELIVER: (id: number) => `/api/orders/${id}/deliver`,
        CANCEL: (id: number) => `/api/orders/${id}/cancel`,
        MARK_INVOICED: (id: number) => `/api/orders/${id}/mark-invoiced`,
        SEARCH_ORDER_NUMBERS: '/api/orders/search/order-numbers',
        ANALYTICS: (direction: string) => `/api/orders/analytics/${direction}`,
        EXPORT_XLSX: '/api/orders/export/xlsx',
        SHARE: (id: number) => `/api/orders/${id}/share`,
        SHARED: (token: string) => `/api/orders/shared/${token}`,
        CHANGE_STATUS: (id: number) => `/api/orders/${id}/status`,
    },

    // ─── Invoices ──────────────────────────────────────────────
    INVOICES: {
        LIST: '/api/invoices/list',
        CREATE: '/api/invoices',
        DETAIL: (id: number) => `/api/invoices/${id}`,
        UPDATE: (id: number) => `/api/invoices/${id}`,
        DELETE: (id: number) => `/api/invoices/${id}`,
        STATISTICS: '/api/invoices/statistics',
        OVERDUE: '/api/invoices/overdue',
        VALIDATE: (id: number) => `/api/invoices/${id}/validate`,
        DEVALIDATE: (id: number) => `/api/invoices/${id}/devalidate`,
        ANALYTICS: (direction: string) => `/api/invoices/analytics/${direction}`,
        EXPORT_XLSX: '/api/invoices/export/xlsx',
        SHARE: (id: number) => `/api/invoices/${id}/share`,
        SHARED: (token: string) => `/api/invoices/shared/${token}`,
    },

    // ─── Quotes ────────────────────────────────────────────────
    QUOTES: {
        LIST: '/api/quotes/list',
        CREATE: '/api/quotes',
        DETAIL: (id: number) => `/api/quotes/${id}`,
        UPDATE: (id: number) => `/api/quotes/${id}`,
        DELETE: (id: number) => `/api/quotes/${id}`,
        VALIDATE: (id: number) => `/api/quotes/${id}/validate`,
        DEVALIDATE: (id: number) => `/api/quotes/${id}/devalidate`,
        ACCEPT: (id: number) => `/api/quotes/${id}/accept`,
        REJECT: (id: number) => `/api/quotes/${id}/reject`,
        SHARE: (id: number) => `/api/quotes/${id}/share`,
        SHARED: (token: string) => `/api/quotes/shared/${token}`,
        SHARED_SIGN: (token: string) => `/api/quotes/shared/${token}/sign`,
        UNSIGN: (id: number) => `/api/quotes/${id}/unsign`,
        CONVERT_TO_ORDER: (id: number) => `/api/quotes/${id}/convert-to-order`,
        CONVERT_TO_INVOICE: (id: number) => `/api/quotes/${id}/convert-to-invoice`,
        ANALYTICS: (direction: string) => `/api/quotes/analytics/${direction}`,
        EXPORT_XLSX: '/api/quotes/export/xlsx',
    },

    // ─── Partners ──────────────────────────────────────────────
    PARTNERS: {
        LIST: '/api/partners',
        CREATE: '/api/partners',
        DETAIL: (id: number) => `/api/partners/${id}`,
        BY_PHONE: (phone: string) => `/api/partners/${encodeURIComponent(phone)}`,
        UPDATE: (id: number) => `/api/partners/${id}`,
        DELETE: (id: number) => `/api/partners/${id}`,
        DASHBOARD_CUSTOMERS: '/api/partners/dashboard/customers',
        DASHBOARD_SUPPLIERS: '/api/partners/dashboard/suppliers',
        CUSTOMER_ANALYTICS: (id: number) => `/api/partners/${id}/customer-analytics`,
        SUPPLIER_ANALYTICS: (id: number) => `/api/partners/${id}/supplier-analytics`,
    },

    // ─── Delivery ──────────────────────────────────────────────
    DELIVERY: {
        LIST_PERSONS: '/api/delivery/persons',
        PERSON_DETAIL: (id: number) => `/api/delivery/persons/${id}`,
        CREATE: '/api/delivery',
        UPDATE: (id: number) => `/api/delivery/${id}`,
        DELETE: (id: number) => `/api/delivery/${id}`,
        ASSIGN: '/api/delivery/assign',
        UNASSIGN: (orderId: number) => `/api/delivery/unassign/${orderId}`,
    },

    // ─── Payments ──────────────────────────────────────────────
    PAYMENTS: {
        LIST: '/api/payments',
        CREATE: '/api/payments',
        DETAIL: (id: number) => `/api/payments/${id}`,
        UPDATE: (id: number) => `/api/payments/${id}`,
        DELETE: (id: number) => `/api/payments/${id}`,
        INVOICE_TOTAL: (invoiceId: number) => `/api/payments/invoice/${invoiceId}/total`,
    },

    // ─── Company / Configurations ──────────────────────────────
    CONFIGURATIONS: {
        BY_ENTITY: (entity: string) => `/api/configurations/entity/${entity}`,
        UPDATE: (id: number) => `/api/configurations/${id}`,
    },

    // ─── Sequences ─────────────────────────────────────────────
    SEQUENCES: {
        CONFIG: '/api/configurations/entity/sequences',
        CREATE: '/api/configurations/entity/sequences',
        UPDATE: (id: string) => `/api/configurations/entity/sequences/${id}`,
        DELETE: (id: string) => `/api/configurations/entity/sequences/${id}`,
        PREVIEW: '/api/configurations/entity/sequences/preview',
        RESET: (id: string) => `/api/configurations/entity/sequences/${id}/reset`,
    },

    // ─── Statistics ────────────────────────────────────────────
    STATISTICS: {
        OVERVIEW: '/api/statistics',
        COMPREHENSIVE: '/api/statistics/comprehensive',
        RECENT_ACTIVITIES: '/api/statistics/recent-activities',
    },

    // ─── Inventory — Warehouses ────────────────────────────────
    WAREHOUSES: {
        LIST: '/api/inventory/warehouses',
        CREATE: '/api/inventory/warehouses',
        DETAIL: (id: number) => `/api/inventory/warehouses/${id}`,
        UPDATE: (id: number) => `/api/inventory/warehouses/${id}`,
        DELETE: (id: number) => `/api/inventory/warehouses/${id}`,
    },

    // ─── Inventory — Stock ─────────────────────────────────────
    STOCK: {
        MOVEMENTS: '/api/inventory/movements',
        MOVEMENT_DETAIL: (id: number) => `/api/inventory/movements/${id}`,
        MOVEMENT_VALIDATE: '/api/inventory/movements/validate',
        MOVEMENT_TRANSFER: '/api/inventory/movements/transfer',
        BY_PRODUCT: (productId: number) => `/api/inventory/stock/product/${productId}`,
        BY_WAREHOUSE: (warehouseId: number) => `/api/inventory/stock/warehouse/${warehouseId}`,
        ALL: '/api/inventory/stock',
        LOW: '/api/inventory/stock/low',
        VALUE: '/api/inventory/stock/value',
    },

    // ─── Inventory — UoM ──────────────────────────────────────
    UOM: {
        LIST: '/api/inventory/uom',
        CATEGORIES: '/api/inventory/uom/categories',
        DETAIL: (id: number) => `/api/inventory/uom/${id}`,
        CREATE: '/api/inventory/uom',
        UPDATE: (id: number) => `/api/inventory/uom/${id}`,
        DELETE: (id: number) => `/api/inventory/uom/${id}`,
        CONVERT: '/api/inventory/uom/convert',
    },

    // ─── Inventory — Adjustments ───────────────────────────────
    INVENTORY_ADJUSTMENTS: {
        LIST: '/api/inventory/adjustments',
        DETAIL: (id: number) => `/api/inventory/adjustments/${id}`,
        CREATE: '/api/inventory/adjustments',
        UPDATE: (id: number) => `/api/inventory/adjustments/${id}`,
        START: (id: number) => `/api/inventory/adjustments/${id}/start`,
        START_COUNTING: (id: number) => `/api/inventory/adjustments/${id}/start-counting`,
        VALIDATE: '/api/inventory/adjustments/validate',
        CANCEL: (id: number) => `/api/inventory/adjustments/${id}/cancel`,
        DELETE: (id: number) => `/api/inventory/adjustments/${id}`,
        GENERATE_LIST: (warehouseId: number) => `/api/inventory/adjustments/generate-list/${warehouseId}`,
        COUNTING_LIST: (locationId: number) => `/api/inventory/adjustments/counting-list/${locationId}`,
    },

    // ─── Notifications ─────────────────────────────────────────
    NOTIFICATIONS: {
        LIST: '/api/notifications',
        DETAIL: (id: number) => `/api/notifications/${id}`,
        STATS: '/api/notifications/stats',
        UNREAD_COUNT: '/api/notifications/unread-count',
        MARK_READ: (id: number) => `/api/notifications/${id}/read`,
        MARK_MANY_READ: '/api/notifications/mark-many-read',
        MARK_ALL_READ: '/api/notifications/mark-all-read',
        ARCHIVE: (id: number) => `/api/notifications/${id}/archive`,
        ARCHIVE_MANY: '/api/notifications/archive-many',
        DELETE: (id: number) => `/api/notifications/${id}`,
        DELETE_MANY: '/api/notifications/delete-many',
        PREFERENCES: '/api/notifications/preferences',
        TEST: '/api/notifications/test',
        DEVICE_TOKEN_REGISTER: (userId: number) => `/api/notifications/device-token/${userId}`,
        DEVICE_TOKEN_UNREGISTER: '/api/notifications/device-token',
        DEVICE_TOKEN_REFRESH: (token: string) => `/api/notifications/device-token/${token}/refresh`,
    },

    // ─── Images ────────────────────────────────────────────────
    IMAGES: {
        UPLOAD: '/api/images/upload',
        DELETE: '/api/images/delete',
    },

    // ─── Drive (File Storage) ──────────────────────────────────
    DRIVE: {
        // Node browsing
        LIST_ROOT: '/api/drive/nodes',
        LIST_CHILDREN: (nodeId: string) => `/api/drive/nodes/${nodeId}/children`,
        NODE_DETAIL: (nodeId: string) => `/api/drive/nodes/${nodeId}`,
        MOVE_NODE: (nodeId: string) => `/api/drive/nodes/${nodeId}/move`,
        // Folders
        CREATE_FOLDER: '/api/drive/folders',
        UPDATE_NODE: (nodeId: string) => `/api/drive/nodes/${nodeId}`,
        DELETE_NODE: (nodeId: string) => `/api/drive/nodes/${nodeId}`,
        RESTORE_NODE: (nodeId: string) => `/api/drive/nodes/${nodeId}/restore`,
        PERMANENT_DELETE: (nodeId: string) => `/api/drive/nodes/${nodeId}/permanent`,
        TRASH: '/api/drive/trash',
        // Files
        UPLOAD_FILE: '/api/drive/files',
        REPLACE_FILE: (nodeId: string) => `/api/drive/files/${nodeId}/replace`,
        DOWNLOAD_URL: (nodeId: string) => `/api/drive/files/${nodeId}/download`,
        // Versions
        LIST_VERSIONS: (nodeId: string) => `/api/drive/files/${nodeId}/versions`,
        RESTORE_VERSION: (nodeId: string, versionId: string) => `/api/drive/files/${nodeId}/versions/${versionId}/restore`,
        // Sharing
        LIST_SHARES: (nodeId: string) => `/api/drive/nodes/${nodeId}/shares`,
        CREATE_SHARE: (nodeId: string) => `/api/drive/nodes/${nodeId}/shares`,
        UPDATE_SHARE: (nodeId: string, shareId: string) => `/api/drive/nodes/${nodeId}/shares/${shareId}`,
        REVOKE_SHARE: (nodeId: string, shareId: string) => `/api/drive/nodes/${nodeId}/shares/${shareId}`,
        SHARED_WITH_ME: '/api/drive/shared-with-me',
        SHARED_BY_ME: '/api/drive/shared-by-me',
        // Search & Discovery
        SEARCH: '/api/drive/search',
        // Activity
        NODE_ACTIVITY: (nodeId: string) => `/api/drive/nodes/${nodeId}/activity`,
        // Tags
        LIST_TAGS: '/api/drive/tags',
        ADD_TAG: (nodeId: string, tagId: number) => `/api/drive/nodes/${nodeId}/tags/${tagId}`,
        REMOVE_TAG: (nodeId: string, tagId: number) => `/api/drive/nodes/${nodeId}/tags/${tagId}`,
        // Stats
        STATS: '/api/drive/stats',
        // Raw MinIO browser
        BROWSE_STORAGE: (prefix?: string) => `/api/drive/browse${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''}`,
        RAW_URL: (key: string) => `/api/drive/raw-url?key=${encodeURIComponent(key)}`,
    },

    // ─── Onboarding ────────────────────────────────────────────
    ONBOARDING: {
        STATUS: '/api/onboarding/status',
        COMPANY: '/api/onboarding/company',
        ADMIN: '/api/onboarding/admin',
        COMPLETE: '/api/onboarding/complete',
    },

    // ─── Permissions ───────────────────────────────────────────
    PERMISSIONS: {
        LIST: '/api/permissions',
        DETAIL: (id: number) => `/api/permissions/${id}`,
        CREATE: '/api/permissions',
        UPDATE: (id: number) => `/api/permissions/${id}`,
        DELETE: (id: number) => `/api/permissions/${id}`,
        SEED: '/api/permissions/seed',
    },

    // ─── Roles ─────────────────────────────────────────────────
    ROLES: {
        LIST: '/api/roles',
        DETAIL: (id: number) => `/api/roles/${id}`,
        CREATE: '/api/roles',
        UPDATE: (id: number) => `/api/roles/${id}`,
        DELETE: (id: number) => `/api/roles/${id}`,
        SEED: '/api/roles/seed',
    },

    // ─── Users ─────────────────────────────────────────────────
    USERS: {
        LIST: '/api/users',
        DETAIL: (id: number) => `/api/users/${id}`,
        CREATE: '/api/users',
        UPDATE: (id: number) => `/api/users/${id}`,
        DELETE: (id: number) => `/api/users/${id}`,
        ACTIVATE: (id: number) => `/api/users/${id}/activate`,
        DEACTIVATE: (id: number) => `/api/users/${id}/deactivate`,
        APPROVE: (id: number) => `/api/portal/admin/users/${id}/approve`,
        REJECT: (id: number) => `/api/portal/admin/users/${id}/reject`,
    },
} as const;
