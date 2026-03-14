/* eslint-disable prettier/prettier */
/**
 * ═══════════════════════════════════════════════════════════════
 *  ORDERIUM — Unified API Response Code Registry
 * ═══════════════════════════════════════════════════════════════
 *
 *  Code format:  PREFIX + HTTP_STATUS + "_" + SEQUENCE
 *  Example:      ORD201_01  →  Orders module, HTTP 201, first endpoint
 *
 *  Each entry defines:
 *    code     – Unique application-level response code (string)
 *    status   – HTTP status code (number)
 *    message  – Human-readable, generic message (string)
 *
 *  data      → Described in comments. Either object or list.
 *  metadata  → null for single-resource responses;
 *              PaginationMeta for list responses.
 *
 *  This file is the SINGLE SOURCE OF TRUTH for all API response
 *  contracts. Every controller must import codes from here.
 * ═══════════════════════════════════════════════════════════════
 */

export interface ResponseDef {
    readonly code: string;
    readonly status: number;
    readonly message: string;
}

// ─────────────────────────────────────────────────────────────
//  APP  (AppController)
// ─────────────────────────────────────────────────────────────
export const APP = {
    /** GET /                → data: string                       | metadata: null */
    API_INFO: { code: 'APP200_01', status: 200, message: 'API Info' },
    /** GET /health          → data: { status, database, timestamp } | metadata: null */
    HEALTH_OK: { code: 'APP200_02', status: 200, message: 'Health Check Retrieved' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  CATEGORIES  (CategoriesController)
// ─────────────────────────────────────────────────────────────
export const CAT = {
    /** GET /categories                  → data: Category[]           | metadata: null */
    LIST: { code: 'CAT200_01', status: 200, message: 'Categories Retrieved' },
    /** GET /categories/hierarchy        → data: CategoryHierarchy[]  | metadata: null */
    HIERARCHY: { code: 'CAT200_02', status: 200, message: 'Category Hierarchy Retrieved' },
    /** GET /categories/type/:type       → data: Category[]           | metadata: null */
    BY_TYPE: { code: 'CAT200_03', status: 200, message: 'Categories Retrieved' },
    /** GET /categories/:id              → data: Category             | metadata: null */
    DETAIL: { code: 'CAT200_04', status: 200, message: 'Category Retrieved' },
    /** POST /categories                 → data: Category             | metadata: null */
    CREATED: { code: 'CAT201_01', status: 201, message: 'Category Created' },
    /** PUT /categories/:id              → data: Category             | metadata: null */
    UPDATED: { code: 'CAT200_05', status: 200, message: 'Category Updated' },
    /** DELETE /categories/:id           → data: null                 | metadata: null */
    DELETED: { code: 'CAT200_06', status: 200, message: 'Category Deleted' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  PRODUCTS  (ProductsController)
// ─────────────────────────────────────────────────────────────
export const PRD = {
    /** POST /products/create            → data: Product              | metadata: null */
    CREATED: { code: 'PRD201_01', status: 201, message: 'Product Created' },
    /** POST /products/filter            → data: Product[]            | metadata: { total, page, pageSize, totalPages } */
    FILTERED: { code: 'PRD200_01', status: 200, message: 'Products Retrieved' },
    /** GET /products                    → data: Product[]            | metadata: { total, limit, offset } */
    LIST: { code: 'PRD200_02', status: 200, message: 'Products Retrieved' },
    /** GET /products/:id                → data: Product              | metadata: null */
    DETAIL: { code: 'PRD200_03', status: 200, message: 'Product Retrieved' },
    /** PATCH /products/:id              → data: Product              | metadata: null */
    UPDATED: { code: 'PRD200_04', status: 200, message: 'Product Updated' },
    /** DELETE /products/:id             → data: null                 | metadata: null */
    DELETED: { code: 'PRD200_05', status: 200, message: 'Product Deleted' },
    /** POST /products/:id/image         → data: { product, image }  | metadata: null */
    IMAGE_UPLOADED: { code: 'PRD201_02', status: 201, message: 'Product Image Uploaded' },
    /** DELETE /products/:id/image       → data: Product              | metadata: null */
    IMAGE_DELETED: { code: 'PRD200_06', status: 200, message: 'Product Image Deleted' },
    /** GET /products/:id/image/optimize → data: { url, originalUrl } | metadata: null */
    IMAGE_OPTIMIZED: { code: 'PRD200_07', status: 200, message: 'Optimized URL Retrieved' },
    /** GET /products/export/xlsx        → binary (not wrapped)       | metadata: n/a */
    EXPORTED: { code: 'PRD200_08', status: 200, message: 'Products Exported' },
    /** POST /products/import/xlsx       → data: { imported, updated, failed } | metadata: null */
    IMPORTED: { code: 'PRD200_09', status: 200, message: 'Products Imported' },
    /** GET /products/import/template    → binary (not wrapped)       | metadata: n/a */
    TEMPLATE: { code: 'PRD200_10', status: 200, message: 'Import Template Downloaded' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  ORDERS  (OrdersController)
// ─────────────────────────────────────────────────────────────
export const ORD = {
    /** POST /orders                       → data: Order               | metadata: null */
    CREATED: { code: 'ORD201_01', status: 201, message: 'Order Created' },
    /** POST /orders/filter                → data: Order[]             | metadata: { total, page, pageSize, totalPages, statusCounts } */
    FILTERED: { code: 'ORD200_01', status: 200, message: 'Orders Retrieved' },
    /** GET /orders                        → data: Order[]             | metadata: { count, statusCounts } */
    LIST: { code: 'ORD200_02', status: 200, message: 'Orders Retrieved' },
    /** GET /orders/search/order-numbers   → data: [{ value, label }] | metadata: null */
    SEARCH_NUMBERS: { code: 'ORD200_03', status: 200, message: 'Order Numbers Retrieved' },
    /** GET /orders/number/:orderNumber    → data: Order               | metadata: null */
    BY_NUMBER: { code: 'ORD200_04', status: 200, message: 'Order Retrieved' },
    /** GET /orders/customer/:customerId   → data: Order[]             | metadata: { total, page, pageSize, totalPages } */
    CUSTOMER_ORDERS: { code: 'ORD200_05', status: 200, message: 'Customer Orders Retrieved' },
    /** GET /orders/analytics/:direction   → data: analytics           | metadata: null */
    ANALYTICS: { code: 'ORD200_06', status: 200, message: 'Order Analytics Retrieved' },
    /** GET /orders/:id                    → data: Order               | metadata: null */
    DETAIL: { code: 'ORD200_07', status: 200, message: 'Order Retrieved' },
    /** PUT /orders/:id                    → data: Order               | metadata: null */
    UPDATED: { code: 'ORD200_08', status: 200, message: 'Order Updated' },
    /** DELETE /orders/:id                 → data: null                | metadata: null */
    DELETED: { code: 'ORD200_09', status: 200, message: 'Order Deleted' },
    /** PUT /orders/:id/validate           → data: Order               | metadata: null */
    VALIDATED: { code: 'ORD200_10', status: 200, message: 'Order Validated' },
    /** PUT /orders/:id/devalidate         → data: Order               | metadata: null */
    DEVALIDATED: { code: 'ORD200_11', status: 200, message: 'Order Devalidated' },
    /** PUT /orders/:id/deliver            → data: Order               | metadata: null */
    DELIVERED: { code: 'ORD200_12', status: 200, message: 'Order Delivered' },
    /** PUT /orders/:id/cancel             → data: Order               | metadata: null */
    CANCELLED: { code: 'ORD200_13', status: 200, message: 'Order Cancelled' },
    /** PUT /orders/:id/mark-invoiced      → data: Order               | metadata: null */
    MARKED_INVOICED: { code: 'ORD200_14', status: 200, message: 'Order Marked as Invoiced' },
    /** GET /orders/export/xlsx            → binary (not wrapped)      | metadata: n/a */
    EXPORTED: { code: 'ORD200_15', status: 200, message: 'Orders Exported' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  INVOICES  (InvoicesController)
// ─────────────────────────────────────────────────────────────
export const INV = {
    /** POST /invoices/list                → data: Invoice[]           | metadata: { total, page, pageSize, totalPages } */
    FILTERED: { code: 'INV200_01', status: 200, message: 'Invoices Retrieved' },
    /** GET /invoices                      → data: Invoice[]           | metadata: null */
    LIST: { code: 'INV200_02', status: 200, message: 'Invoices Retrieved' },
    /** GET /invoices/analytics/:direction → data: analytics           | metadata: null */
    ANALYTICS: { code: 'INV200_03', status: 200, message: 'Invoice Analytics Retrieved' },
    /** GET /invoices/:id                  → data: Invoice             | metadata: null */
    DETAIL: { code: 'INV200_04', status: 200, message: 'Invoice Retrieved' },
    /** POST /invoices                     → data: Invoice             | metadata: null */
    CREATED: { code: 'INV201_01', status: 201, message: 'Invoice Created' },
    /** PUT /invoices/:id                  → data: Invoice             | metadata: null */
    UPDATED: { code: 'INV200_05', status: 200, message: 'Invoice Updated' },
    /** DELETE /invoices/:id               → data: null                | metadata: null */
    DELETED: { code: 'INV200_06', status: 200, message: 'Invoice Deleted' },
    /** PUT /invoices/:id/validate         → data: Invoice             | metadata: null */
    VALIDATED: { code: 'INV200_07', status: 200, message: 'Invoice Validated' },
    /** PUT /invoices/:id/devalidate       → data: Invoice             | metadata: null */
    DEVALIDATED: { code: 'INV200_08', status: 200, message: 'Invoice Devalidated' },
    /** GET /invoices/export/xlsx          → binary (not wrapped)      | metadata: n/a */
    EXPORTED: { code: 'INV200_09', status: 200, message: 'Invoices Exported' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  QUOTES  (QuotesController)
// ─────────────────────────────────────────────────────────────
export const QUO = {
    /** POST /quotes/list                   → data: Quote[]            | metadata: { total, page, pageSize, totalPages } */
    FILTERED: { code: 'QUO200_01', status: 200, message: 'Quotes Retrieved' },
    /** GET /quotes                         → data: Quote[]            | metadata: null */
    LIST: { code: 'QUO200_02', status: 200, message: 'Quotes Retrieved' },
    /** GET /quotes/:id                     → data: Quote              | metadata: null */
    DETAIL: { code: 'QUO200_03', status: 200, message: 'Quote Retrieved' },
    /** POST /quotes                        → data: Quote              | metadata: null */
    CREATED: { code: 'QUO201_01', status: 201, message: 'Quote Created' },
    /** PUT /quotes/:id                     → data: Quote              | metadata: null */
    UPDATED: { code: 'QUO200_04', status: 200, message: 'Quote Updated' },
    /** DELETE /quotes/:id                  → data: null               | metadata: null */
    DELETED: { code: 'QUO200_05', status: 200, message: 'Quote Deleted' },
    /** PUT /quotes/:id/validate            → data: Quote              | metadata: null */
    VALIDATED: { code: 'QUO200_06', status: 200, message: 'Quote Validated' },
    /** PUT /quotes/:id/devalidate          → data: Quote              | metadata: null */
    DEVALIDATED: { code: 'QUO200_07', status: 200, message: 'Quote Devalidated' },
    /** PUT /quotes/:id/accept              → data: Quote              | metadata: null */
    ACCEPTED: { code: 'QUO200_08', status: 200, message: 'Quote Accepted' },
    /** PUT /quotes/:id/reject              → data: Quote              | metadata: null */
    REJECTED: { code: 'QUO200_09', status: 200, message: 'Quote Rejected' },
    /** POST /quotes/:id/share              → data: shareResult        | metadata: null */
    SHARED: { code: 'QUO200_10', status: 200, message: 'Quote Share Link Generated' },
    /** GET /quotes/shared/:token (Public)  → data: Quote              | metadata: null */
    SHARED_DETAIL: { code: 'QUO200_11', status: 200, message: 'Shared Quote Retrieved' },
    /** POST /quotes/shared/:token/sign     → data: Quote              | metadata: null */
    SIGNED: { code: 'QUO200_12', status: 200, message: 'Quote Signed' },
    /** PUT /quotes/:id/unsign              → data: Quote              | metadata: null */
    UNSIGNED: { code: 'QUO200_13', status: 200, message: 'Quote Unsigned' },
    /** PUT /quotes/:id/convert-to-order    → data: Quote              | metadata: null */
    CONVERTED_ORDER: { code: 'QUO200_14', status: 200, message: 'Quote Converted to Order' },
    /** PUT /quotes/:id/convert-to-invoice  → data: Quote              | metadata: null */
    CONVERTED_INVOICE: { code: 'QUO200_15', status: 200, message: 'Quote Converted to Invoice' },
    /** GET /quotes/analytics/:direction    → data: analytics          | metadata: null */
    ANALYTICS: { code: 'QUO200_16', status: 200, message: 'Quote Analytics Retrieved' },
    /** GET /quotes/export/xlsx             → binary (not wrapped)     | metadata: n/a */
    EXPORTED: { code: 'QUO200_17', status: 200, message: 'Quotes Exported' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  PARTNERS  (PartnersController)
// ─────────────────────────────────────────────────────────────
export const PTR = {
    /** POST /partners                           → data: Partner       | metadata: null */
    CREATED: { code: 'PTR201_01', status: 201, message: 'Partner Created' },
    /** POST /partners/upsert                    → data: Partner       | metadata: null */
    UPSERTED: { code: 'PTR200_01', status: 200, message: 'Partner Upserted' },
    /** GET /partners                            → data: Partner[]     | metadata: { total, limit, offset } */
    LIST: { code: 'PTR200_02', status: 200, message: 'Partners Retrieved' },
    /** GET /partners/dashboard/customers        → data: stats         | metadata: null */
    CUSTOMER_DASHBOARD: { code: 'PTR200_03', status: 200, message: 'Customer Dashboard Retrieved' },
    /** GET /partners/dashboard/suppliers        → data: stats         | metadata: null */
    SUPPLIER_DASHBOARD: { code: 'PTR200_04', status: 200, message: 'Supplier Dashboard Retrieved' },
    /** GET /partners/search                     → data: Partner[]     | metadata: null */
    SEARCH: { code: 'PTR200_05', status: 200, message: 'Partners Found' },
    /** GET /partners/phone/:phoneNumber         → data: Partner       | metadata: null */
    BY_PHONE: { code: 'PTR200_06', status: 200, message: 'Partner Retrieved' },
    /** GET /partners/:id/customer-analytics     → data: analytics     | metadata: null */
    CUSTOMER_ANALYTICS: { code: 'PTR200_07', status: 200, message: 'Customer Analytics Retrieved' },
    /** GET /partners/:id/supplier-analytics     → data: analytics     | metadata: null */
    SUPPLIER_ANALYTICS: { code: 'PTR200_08', status: 200, message: 'Supplier Analytics Retrieved' },
    /** GET /partners/:id                        → data: Partner       | metadata: null */
    DETAIL: { code: 'PTR200_09', status: 200, message: 'Partner Retrieved' },
    /** PATCH /partners/:id                      → data: Partner       | metadata: null */
    UPDATED: { code: 'PTR200_10', status: 200, message: 'Partner Updated' },
    /** DELETE /partners/:id                     → data: null          | metadata: null */
    DELETED: { code: 'PTR200_11', status: 200, message: 'Partner Deleted' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  DELIVERY  (DeliveryController)
// ─────────────────────────────────────────────────────────────
export const DLV = {
    /** POST /delivery/login (Public)                         → data: { deliveryPerson, token }  | metadata: null */
    LOGIN: { code: 'DLV200_01', status: 200, message: 'Login Successful' },
    /** GET /delivery/persons                                 → data: DeliveryPerson[]            | metadata: null */
    PERSONS_LIST: { code: 'DLV200_02', status: 200, message: 'Delivery Persons Retrieved' },
    /** GET /delivery/persons/:id                             → data: DeliveryPerson              | metadata: null */
    PERSON_DETAIL: { code: 'DLV200_03', status: 200, message: 'Delivery Person Retrieved' },
    /** POST /delivery                                        → data: DeliveryPerson              | metadata: null */
    PERSON_CREATED: { code: 'DLV201_01', status: 201, message: 'Delivery Person Created' },
    /** PUT /delivery/:id                                     → data: DeliveryPerson              | metadata: null */
    PERSON_UPDATED: { code: 'DLV200_04', status: 200, message: 'Delivery Person Updated' },
    /** DELETE /delivery/:id                                  → data: null                        | metadata: null */
    PERSON_DELETED: { code: 'DLV204_01', status: 204, message: 'Delivery Person Deleted' },
    /** GET /delivery/orders                                  → data: Order[]                     | metadata: null */
    ORDERS_LIST: { code: 'DLV200_05', status: 200, message: 'Delivery Orders Retrieved' },
    /** POST /delivery/person/:id/orders                      → data: Order[]                     | metadata: { total, page, pageSize, totalPages } */
    PERSON_ORDERS: { code: 'DLV200_06', status: 200, message: 'Delivery Person Orders Retrieved' },
    /** POST /delivery/assign                                 → data: OrderDelivery               | metadata: null */
    ASSIGNED: { code: 'DLV200_07', status: 200, message: 'Order Assigned to Delivery' },
    /** POST /delivery/unassign/:orderId                      → data: null                        | metadata: null */
    UNASSIGNED: { code: 'DLV200_08', status: 200, message: 'Order Unassigned' },
    /** PUT /delivery/person/:id/order/:orderId/status        → data: null                        | metadata: null */
    STATUS_UPDATED: { code: 'DLV200_09', status: 200, message: 'Delivery Status Updated' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  PORTAL  (PortalController)
// ─────────────────────────────────────────────────────────────
export const PRT = {
    /** POST /portal/login (Public)              → data: { user, token }  | metadata: null */
    LOGIN: { code: 'PRT200_01', status: 200, message: 'Login Successful' },
    /** POST /portal/register (Public)           → data: { user, token }  | metadata: null */
    REGISTERED: { code: 'PRT201_01', status: 201, message: 'Registration Successful' },
    /** GET /portal/user/:phoneNumber            → data: User             | metadata: null */
    USER_DETAIL: { code: 'PRT200_02', status: 200, message: 'User Retrieved' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  NOTIFICATIONS  (NotificationsController)
// ─────────────────────────────────────────────────────────────
export const NOT = {
    /** GET /notifications                               → data: Notification[]    | metadata: { total, page, pageSize, totalPages } */
    LIST: { code: 'NOT200_01', status: 200, message: 'Notifications Retrieved' },
    /** GET /notifications/stats                         → data: stats             | metadata: null */
    STATS: { code: 'NOT200_02', status: 200, message: 'Notification Stats Retrieved' },
    /** GET /notifications/unread-count                  → data: { count }         | metadata: null */
    UNREAD_COUNT: { code: 'NOT200_03', status: 200, message: 'Unread Count Retrieved' },
    /** GET /notifications/user/:userId                  → data: Notification[]    | metadata: null */
    USER_LIST: { code: 'NOT200_04', status: 200, message: 'User Notifications Retrieved' },
    /** GET /notifications/:id                           → data: Notification      | metadata: null */
    DETAIL: { code: 'NOT200_05', status: 200, message: 'Notification Retrieved' },
    /** PATCH /notifications/:id/read                    → data: Notification      | metadata: null */
    MARKED_READ: { code: 'NOT200_06', status: 200, message: 'Notification Marked as Read' },
    /** PATCH /notifications/mark-many-read              → data: { updated }       | metadata: null */
    MARKED_MANY_READ: { code: 'NOT200_07', status: 200, message: 'Notifications Marked as Read' },
    /** PATCH /notifications/mark-all-read               → data: { updated }       | metadata: null */
    MARKED_ALL_READ: { code: 'NOT200_08', status: 200, message: 'All Notifications Marked as Read' },
    /** PATCH /notifications/:id/archive                 → data: Notification      | metadata: null */
    ARCHIVED: { code: 'NOT200_09', status: 200, message: 'Notification Archived' },
    /** PATCH /notifications/archive-many                → data: { updated }       | metadata: null */
    ARCHIVED_MANY: { code: 'NOT200_10', status: 200, message: 'Notifications Archived' },
    /** DELETE /notifications/delete-many                → data: { deleted }       | metadata: null */
    DELETED_MANY: { code: 'NOT200_11', status: 200, message: 'Notifications Deleted' },
    /** DELETE /notifications/:id                        → data: null              | metadata: null */
    DELETED: { code: 'NOT200_12', status: 200, message: 'Notification Deleted' },
    /** GET /notifications/preferences                   → data: preferences       | metadata: null */
    PREFS_DETAIL: { code: 'NOT200_13', status: 200, message: 'Preferences Retrieved' },
    /** PATCH /notifications/preferences                 → data: preferences       | metadata: null */
    PREFS_UPDATED: { code: 'NOT200_14', status: 200, message: 'Preferences Updated' },
    /** POST /notifications/test                         → data: null              | metadata: null */
    TEST_SENT: { code: 'NOT200_15', status: 200, message: 'Test Notification Sent' },
    /** POST /notifications/device-token/:userId         → data: DeviceToken       | metadata: null */
    TOKEN_REGISTERED: { code: 'NOT201_01', status: 201, message: 'Device Token Registered' },
    /** DELETE /notifications/device-token               → data: null              | metadata: null */
    TOKEN_UNREGISTERED: { code: 'NOT200_16', status: 200, message: 'Device Token Unregistered' },
    /** GET /notifications/device-token/:userId          → data: DeviceToken[]     | metadata: null */
    TOKEN_LIST: { code: 'NOT200_17', status: 200, message: 'User Devices Retrieved' },
    /** PATCH /notifications/device-token/:token/refresh → data: null              | metadata: null */
    TOKEN_REFRESHED: { code: 'NOT200_18', status: 200, message: 'Device Token Refreshed' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  CONFIGURATIONS  (ConfigurationsController)
// ─────────────────────────────────────────────────────────────
export const CFG = {
    /** GET /configurations                                      → data: Configuration[]  | metadata: null */
    LIST: { code: 'CFG200_01', status: 200, message: 'Configurations Retrieved' },
    /** GET /configurations/:id                                  → data: Configuration    | metadata: null */
    DETAIL: { code: 'CFG200_02', status: 200, message: 'Configuration Retrieved' },
    /** GET /configurations/entity/:entity                       → data: Configuration    | metadata: null */
    BY_ENTITY: { code: 'CFG200_03', status: 200, message: 'Configuration Retrieved' },
    /** POST /configurations                                     → data: Configuration    | metadata: null */
    CREATED: { code: 'CFG201_01', status: 201, message: 'Configuration Created' },
    /** PUT /configurations/:id                                  → data: Configuration    | metadata: null */
    UPDATED: { code: 'CFG200_04', status: 200, message: 'Configuration Updated' },
    /** DELETE /configurations/:id                               → data: null             | metadata: null */
    DELETED: { code: 'CFG204_01', status: 204, message: 'Configuration Deleted' },
    /** POST /configurations/entity/sequences                    → data: Sequence         | metadata: null */
    SEQ_CREATED: { code: 'CFG201_02', status: 201, message: 'Sequence Created' },
    /** PUT /configurations/entity/sequences/:id                 → data: Sequence         | metadata: null */
    SEQ_UPDATED: { code: 'CFG200_05', status: 200, message: 'Sequence Updated' },
    /** POST /configurations/entity/sequences/preview            → data: preview          | metadata: null */
    SEQ_PREVIEW: { code: 'CFG200_06', status: 200, message: 'Sequence Preview Generated' },
    /** GET /configurations/entity/sequences/next/:entityType    → data: { nextSequence, nextNumber, format } | metadata: null */
    SEQ_NEXT: { code: 'CFG200_07', status: 200, message: 'Next Sequence Retrieved' },
    /** POST /configurations/entity/sequences/:id/reset          → data: Sequence         | metadata: null */
    SEQ_RESET: { code: 'CFG200_08', status: 200, message: 'Sequence Reset' },
    /** GET /configurations/entity/my_company                    → data: company          | metadata: null */
    COMPANY_DETAIL: { code: 'CFG200_09', status: 200, message: 'Company Info Retrieved' },
    /** PUT /configurations/entity/my_company                    → data: company          | metadata: null */
    COMPANY_UPDATED: { code: 'CFG200_10', status: 200, message: 'Company Info Updated' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  STATISTICS  (StatisticsController)
// ─────────────────────────────────────────────────────────────
export const STT = {
    /** GET /statistics                   → data: OrderStatistics      | metadata: null */
    ALL: { code: 'STT200_01', status: 200, message: 'Statistics Retrieved' },
    /** GET /statistics/orders            → data: OrderStatistics      | metadata: null */
    ORDERS: { code: 'STT200_02', status: 200, message: 'Order Statistics Retrieved' },
    /** GET /statistics/daily             → data: DailyStats[]         | metadata: null */
    DAILY: { code: 'STT200_03', status: 200, message: 'Daily Statistics Retrieved' },
    /** GET /statistics/top-products      → data: TopProduct[]         | metadata: null */
    TOP_PRODUCTS: { code: 'STT200_04', status: 200, message: 'Top Products Retrieved' },
    /** GET /statistics/comprehensive     → data: ComprehensiveStats   | metadata: null */
    COMPREHENSIVE: { code: 'STT200_05', status: 200, message: 'Comprehensive Statistics Retrieved' },
    /** GET /statistics/recent-activities → data: RecentActivity[]     | metadata: null */
    RECENT_ACTIVITIES: { code: 'STT200_06', status: 200, message: 'Recent Activities Retrieved' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  PAYMENTS  (PaymentsController)
// ─────────────────────────────────────────────────────────────
export const PAY = {
    /** POST /payments                            → data: Payment       | metadata: null */
    CREATED: { code: 'PAY201_01', status: 201, message: 'Payment Created' },
    /** GET /payments                             → data: Payment[]     | metadata: null */
    LIST: { code: 'PAY200_01', status: 200, message: 'Payments Retrieved' },
    /** GET /payments/:id                         → data: Payment       | metadata: null */
    DETAIL: { code: 'PAY200_02', status: 200, message: 'Payment Retrieved' },
    /** GET /payments/invoice/:invoiceId/total    → data: { totalPaid } | metadata: null */
    TOTAL_PAID: { code: 'PAY200_03', status: 200, message: 'Total Paid Retrieved' },
    /** PATCH /payments/:id                       → data: Payment       | metadata: null */
    UPDATED: { code: 'PAY200_04', status: 200, message: 'Payment Updated' },
    /** DELETE /payments/:id                      → data: null          | metadata: null */
    DELETED: { code: 'PAY200_05', status: 200, message: 'Payment Deleted' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  IMAGES  (ImagesController)
// ─────────────────────────────────────────────────────────────
export const IMG = {
    /** POST /images/upload        → data: ImageResponse   | metadata: null */
    UPLOADED: { code: 'IMG201_01', status: 201, message: 'Image Uploaded' },
    /** DELETE /images/delete      → data: null            | metadata: null */
    DELETED: { code: 'IMG200_01', status: 200, message: 'Image Deleted' },
    /** GET /images/optimize       → data: { url }         | metadata: null */
    OPTIMIZED: { code: 'IMG200_02', status: 200, message: 'Optimized URL Retrieved' },
    /** GET /images/thumbnail      → data: { url }         | metadata: null */
    THUMBNAIL: { code: 'IMG200_03', status: 200, message: 'Thumbnail URL Retrieved' },
    /** GET /images/provider       → data: providerInfo    | metadata: null */
    PROVIDER_INFO: { code: 'IMG200_04', status: 200, message: 'Provider Info Retrieved' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  PDF  (PDFController) — all binary stream responses
// ─────────────────────────────────────────────────────────────
export const PDF = {
    /** GET /pdf/invoice/:invoiceId          → binary PDF stream */
    INVOICE: { code: 'PDF200_01', status: 200, message: 'Invoice PDF Generated' },
    /** GET /pdf/quote/:quoteId              → binary PDF stream */
    QUOTE: { code: 'PDF200_02', status: 200, message: 'Quote PDF Generated' },
    /** GET /pdf/delivery-note/:orderId      → binary PDF stream */
    DELIVERY_NOTE: { code: 'PDF200_03', status: 200, message: 'Delivery Note PDF Generated' },
    /** GET /pdf/receipt/:orderId            → binary PDF stream */
    RECEIPT: { code: 'PDF200_04', status: 200, message: 'Receipt PDF Generated' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  INVENTORY — WAREHOUSES  (WarehouseController)
// ─────────────────────────────────────────────────────────────
export const WRH = {
    /** POST /inventory/warehouses         → data: Warehouse    | metadata: null */
    CREATED: { code: 'WRH201_01', status: 201, message: 'Warehouse Created' },
    /** GET /inventory/warehouses          → data: Warehouse[]  | metadata: null */
    LIST: { code: 'WRH200_01', status: 200, message: 'Warehouses Retrieved' },
    /** GET /inventory/warehouses/:id      → data: Warehouse    | metadata: null */
    DETAIL: { code: 'WRH200_02', status: 200, message: 'Warehouse Retrieved' },
    /** PATCH /inventory/warehouses/:id    → data: Warehouse    | metadata: null */
    UPDATED: { code: 'WRH200_03', status: 200, message: 'Warehouse Updated' },
    /** DELETE /inventory/warehouses/:id   → data: null         | metadata: null */
    DELETED: { code: 'WRH204_01', status: 204, message: 'Warehouse Deleted' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  INVENTORY — STOCK  (StockController)
// ─────────────────────────────────────────────────────────────
export const STK = {
    /** GET /inventory/stock                                           → data: Stock[]           | metadata: null */
    LIST: { code: 'STK200_01', status: 200, message: 'Stock Retrieved' },
    /** GET /inventory/stock/product/:productId                        → data: Stock[]           | metadata: null */
    BY_PRODUCT: { code: 'STK200_02', status: 200, message: 'Product Stock Retrieved' },
    /** GET /inventory/stock/warehouse/:warehouseId                    → data: Stock[]           | metadata: null */
    BY_WAREHOUSE: { code: 'STK200_03', status: 200, message: 'Warehouse Stock Retrieved' },
    /** GET /inventory/stock/product/:productId/warehouse/:warehouseId → data: Stock             | metadata: null */
    AT_WAREHOUSE: { code: 'STK200_04', status: 200, message: 'Stock Retrieved' },
    /** GET /inventory/stock/low                                       → data: Product[]         | metadata: null */
    LOW_STOCK: { code: 'STK200_05', status: 200, message: 'Low Stock Products Retrieved' },
    /** GET /inventory/stock/value                                     → data: { totalValue, productCount } | metadata: null */
    VALUE: { code: 'STK200_06', status: 200, message: 'Stock Value Retrieved' },
    /** POST /inventory/stock/reserve                                  → data: Stock             | metadata: null */
    RESERVED: { code: 'STK200_07', status: 200, message: 'Stock Reserved' },
    /** POST /inventory/stock/unreserve                                → data: Stock             | metadata: null */
    UNRESERVED: { code: 'STK200_08', status: 200, message: 'Stock Unreserved' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  INVENTORY — MOVEMENTS  (StockMovementController)
// ─────────────────────────────────────────────────────────────
export const MOV = {
    /** POST /inventory/movements            → data: StockMovement    | metadata: null */
    CREATED: { code: 'MOV201_01', status: 201, message: 'Stock Movement Created' },
    /** GET /inventory/movements             → data: StockMovement[]  | metadata: null */
    LIST: { code: 'MOV200_01', status: 200, message: 'Stock Movements Retrieved' },
    /** GET /inventory/movements/:id         → data: StockMovement    | metadata: null */
    DETAIL: { code: 'MOV200_02', status: 200, message: 'Stock Movement Retrieved' },
    /** POST /inventory/movements/validate   → data: StockMovement    | metadata: null */
    VALIDATED: { code: 'MOV200_03', status: 200, message: 'Stock Movement Validated' },
    /** POST /inventory/movements/transfer   → data: StockMovement    | metadata: null */
    TRANSFERRED: { code: 'MOV201_02', status: 201, message: 'Internal Transfer Completed' },
    /** PATCH /inventory/movements/:id       → data: StockMovement    | metadata: null */
    UPDATED: { code: 'MOV200_04', status: 200, message: 'Stock Movement Updated' },
    /** DELETE /inventory/movements/:id      → data: null             | metadata: null */
    CANCELLED: { code: 'MOV200_05', status: 200, message: 'Stock Movement Cancelled' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  INVENTORY — UNITS OF MEASURE  (UnitOfMeasureController)
// ─────────────────────────────────────────────────────────────
export const UOM = {
    /** POST /inventory/uom                  → data: UnitOfMeasure    | metadata: null */
    CREATED: { code: 'UOM201_01', status: 201, message: 'Unit of Measure Created' },
    /** GET /inventory/uom                   → data: UnitOfMeasure[]  | metadata: null */
    LIST: { code: 'UOM200_01', status: 200, message: 'Units of Measure Retrieved' },
    /** GET /inventory/uom/categories        → data: string[]         | metadata: null */
    CATEGORIES: { code: 'UOM200_02', status: 200, message: 'UoM Categories Retrieved' },
    /** POST /inventory/uom/convert          → data: { convertedQuantity } | metadata: null */
    CONVERTED: { code: 'UOM200_03', status: 200, message: 'Quantity Converted' },
    /** GET /inventory/uom/:id               → data: UnitOfMeasure    | metadata: null */
    DETAIL: { code: 'UOM200_04', status: 200, message: 'Unit of Measure Retrieved' },
    /** PATCH /inventory/uom/:id             → data: UnitOfMeasure    | metadata: null */
    UPDATED: { code: 'UOM200_05', status: 200, message: 'Unit of Measure Updated' },
    /** DELETE /inventory/uom/:id            → data: null             | metadata: null */
    DELETED: { code: 'UOM204_01', status: 204, message: 'Unit of Measure Deleted' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  INVENTORY — ADJUSTMENTS  (InventoryAdjustmentController)
// ─────────────────────────────────────────────────────────────
export const ADJ = {
    /** POST /inventory/adjustments                            → data: InventoryAdjustment  | metadata: null */
    CREATED: { code: 'ADJ201_01', status: 201, message: 'Inventory Adjustment Created' },
    /** GET /inventory/adjustments                             → data: InventoryAdjustment[] | metadata: null */
    LIST: { code: 'ADJ200_01', status: 200, message: 'Inventory Adjustments Retrieved' },
    /** GET /inventory/adjustments/generate-list/:warehouseId  → data: CountingList          | metadata: null */
    COUNTING_LIST: { code: 'ADJ200_02', status: 200, message: 'Counting List Generated' },
    /** GET /inventory/adjustments/:id                         → data: InventoryAdjustment   | metadata: null */
    DETAIL: { code: 'ADJ200_03', status: 200, message: 'Inventory Adjustment Retrieved' },
    /** POST /inventory/adjustments/:id/start                  → data: InventoryAdjustment   | metadata: null */
    STARTED: { code: 'ADJ200_04', status: 200, message: 'Counting Started' },
    /** POST /inventory/adjustments/validate                   → data: InventoryAdjustment   | metadata: null */
    VALIDATED: { code: 'ADJ200_05', status: 200, message: 'Adjustment Validated' },
    /** POST /inventory/adjustments/:id/cancel                 → data: InventoryAdjustment   | metadata: null */
    CANCELLED: { code: 'ADJ200_06', status: 200, message: 'Adjustment Cancelled' },
    /** PATCH /inventory/adjustments/:id                       → data: InventoryAdjustment   | metadata: null */
    UPDATED: { code: 'ADJ200_07', status: 200, message: 'Adjustment Updated' },
    /** DELETE /inventory/adjustments/:id                      → data: null                  | metadata: null */
    DELETED: { code: 'ADJ204_01', status: 204, message: 'Adjustment Deleted' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  DRIVE
// ─────────────────────────────────────────────────────────────
export const DRV = {
    /** GET  /drive/nodes                → data: DriveNode[]   | metadata: { total, page, limit } */
    NODES_LISTED: { code: 'DRV200_01', status: 200, message: 'Drive Nodes Retrieved' },
    /** GET  /drive/nodes/:id            → data: DriveNode     | metadata: null */
    NODE_DETAIL: { code: 'DRV200_02', status: 200, message: 'Drive Node Retrieved' },
    /** POST /drive/folders              → data: DriveNode     | metadata: null */
    FOLDER_CREATED: { code: 'DRV201_01', status: 201, message: 'Folder Created' },
    /** PATCH /drive/nodes/:id           → data: DriveNode     | metadata: null */
    NODE_UPDATED: { code: 'DRV200_03', status: 200, message: 'Drive Node Updated' },
    /** DELETE /drive/nodes/:id          → data: null          | metadata: null */
    NODE_TRASHED: { code: 'DRV200_04', status: 200, message: 'Drive Node Trashed' },
    /** POST /drive/nodes/:id/restore    → data: DriveNode     | metadata: null */
    NODE_RESTORED: { code: 'DRV200_05', status: 200, message: 'Drive Node Restored' },
    /** DELETE /drive/nodes/:id/permanent→ data: null          | metadata: null */
    NODE_DELETED: { code: 'DRV200_06', status: 200, message: 'Drive Node Permanently Deleted' },
    /** POST /drive/files                → data: DriveNode     | metadata: null */
    FILE_UPLOADED: { code: 'DRV201_02', status: 201, message: 'File Uploaded' },
    /** PUT  /drive/files/:id/replace    → data: DriveVersion  | metadata: null */
    FILE_REPLACED: { code: 'DRV200_07', status: 200, message: 'File Version Replaced' },
    /** GET  /drive/files/:id/download   → data: { url }       | metadata: null */
    DOWNLOAD_URL: { code: 'DRV200_08', status: 200, message: 'Download URL Generated' },
    /** GET  /drive/files/:id/versions   → data: DriveVersion[]| metadata: { total } */
    VERSIONS_LISTED: { code: 'DRV200_09', status: 200, message: 'Versions Retrieved' },
    /** GET  /drive/nodes/:id/shares     → data: DriveShare[]  | metadata: null */
    SHARES_LISTED: { code: 'DRV200_10', status: 200, message: 'Shares Retrieved' },
    /** POST /drive/nodes/:id/shares     → data: DriveShare    | metadata: null */
    SHARE_CREATED: { code: 'DRV201_03', status: 201, message: 'Share Created' },
    /** PATCH /drive/nodes/:id/shares/:s → data: DriveShare    | metadata: null */
    SHARE_UPDATED: { code: 'DRV200_11', status: 200, message: 'Share Updated' },
    /** DELETE /drive/nodes/:id/shares/:s→ data: null          | metadata: null */
    SHARE_REVOKED: { code: 'DRV200_12', status: 200, message: 'Share Revoked' },
    /** GET  /drive/search               → data: DriveNode[]   | metadata: { total, page, limit } */
    SEARCH_RESULTS: { code: 'DRV200_13', status: 200, message: 'Search Results' },
    /** GET  /drive/nodes/:id/activity   → data: DriveActivity[]| metadata: { total } */
    ACTIVITY_LISTED: { code: 'DRV200_14', status: 200, message: 'Activity Retrieved' },
    /** GET  /drive/tags                 → data: DriveTag[]    | metadata: null */
    TAGS_LISTED: { code: 'DRV200_15', status: 200, message: 'Tags Retrieved' },
    /** POST /drive/nodes/:id/tags/:tagId→ data: null          | metadata: null */
    TAG_ADDED: { code: 'DRV200_16', status: 200, message: 'Tag Added' },
    /** DELETE /drive/nodes/:id/tags/:tagId→ data: null        | metadata: null */
    TAG_REMOVED: { code: 'DRV200_17', status: 200, message: 'Tag Removed' },
    /** GET  /drive/stats                → data: DriveStats    | metadata: null */
    STATS: { code: 'DRV200_18', status: 200, message: 'Drive Stats Retrieved' },
    /** PATCH /drive/nodes/:id/move      → data: DriveNode     | metadata: null */
    NODE_MOVED: { code: 'DRV200_19', status: 200, message: 'Node Moved' },
    /** GET  /drive/trash                → data: DriveNode[]   | metadata: { total, page, limit } */
    TRASH_LISTED: { code: 'DRV200_20', status: 200, message: 'Trash Listed' },
    /** GET  /drive/shared-with-me       → data: DriveNode[]   | metadata: { total, page, limit } */
    SHARED_WITH_ME: { code: 'DRV200_21', status: 200, message: 'Shared Nodes Retrieved' },
} as const satisfies Record<string, ResponseDef>;

// ─────────────────────────────────────────────────────────────
//  ERROR CODES  (Shared across all modules)
// ─────────────────────────────────────────────────────────────
export const ERR = {
    BAD_REQUEST: { code: 'ERR400_01', status: 400, message: 'Bad Request' },
    UNAUTHORIZED: { code: 'ERR401_01', status: 401, message: 'Unauthorized' },
    FORBIDDEN: { code: 'ERR403_01', status: 403, message: 'Forbidden' },
    NOT_FOUND: { code: 'ERR404_01', status: 404, message: 'Resource Not Found' },
    CONFLICT: { code: 'ERR409_01', status: 409, message: 'Conflict' },
    VALIDATION_ERROR: { code: 'ERR422_01', status: 422, message: 'Validation Error' },
    TOO_MANY_REQUESTS: { code: 'ERR429_01', status: 429, message: 'Too Many Requests' },
    INTERNAL_ERROR: { code: 'ERR500_01', status: 500, message: 'Internal Server Error' },
} as const satisfies Record<string, ResponseDef>;

/**
 * Map an HTTP status code to the corresponding ERR entry.
 */
export function httpStatusToErrorDef(httpStatus: number): ResponseDef {
    switch (httpStatus) {
        case 400: return ERR.BAD_REQUEST;
        case 401: return ERR.UNAUTHORIZED;
        case 403: return ERR.FORBIDDEN;
        case 404: return ERR.NOT_FOUND;
        case 409: return ERR.CONFLICT;
        case 422: return ERR.VALIDATION_ERROR;
        case 429: return ERR.TOO_MANY_REQUESTS;
        default: return ERR.INTERNAL_ERROR;
    }
}
