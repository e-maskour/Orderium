/**
 * Notification Templates Module — Interfaces & Types
 */

export type NotificationPortal = 'client' | 'delivery' | 'admin' | 'all';

export type NotificationTemplateCategory =
    | 'clients'
    | 'orders'
    | 'delivery'
    | 'stock'
    | 'payments'
    | 'system';

export interface INotificationTemplate {
    id: number;
    key: string;
    category: NotificationTemplateCategory;
    portal: NotificationPortal;
    titleFr: string;
    bodyFr: string;
    titleAr: string;
    bodyAr: string;
    description: string;
    enabled: boolean;
    priority: string;
    dateCreated: string;
    dateUpdated: string;
}

export interface UpdateNotificationTemplateDTO {
    titleFr?: string;
    bodyFr?: string;
    titleAr?: string;
    bodyAr?: string;
    enabled?: boolean;
    priority?: string;
}

export interface SendCustomNotificationDTO {
    customerId: number;
    title: string;
    message: string;
}

export const CATEGORY_LABELS: Record<NotificationTemplateCategory, string> = {
    clients: 'Clients',
    orders: 'Commandes',
    delivery: 'Livraisons',
    stock: 'Stock',
    payments: 'Paiements',
    system: 'Système',
};

export const CATEGORY_ICONS: Record<NotificationTemplateCategory, string> = {
    clients: 'pi pi-users',
    orders: 'pi pi-shopping-cart',
    delivery: 'pi pi-truck',
    stock: 'pi pi-box',
    payments: 'pi pi-credit-card',
    system: 'pi pi-cog',
};
