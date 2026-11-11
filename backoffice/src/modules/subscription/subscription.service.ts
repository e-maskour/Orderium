import { apiClient } from '../../common/api/api-client';
import { API_ROUTES } from '../../common/api/api-routes';
import {
  PLAN_DISPLAY_NAMES,
  SUBSCRIPTION_SALES_WHATSAPP,
  type CurrentSubscription,
  type SubscriptionPlanName,
} from './subscription.interface';

class SubscriptionService {
  /** The calling tenant's plan, feature flags and quota usage. */
  async getCurrent(): Promise<CurrentSubscription> {
    const res = await apiClient.get<CurrentSubscription>(API_ROUTES.SUBSCRIPTION.CURRENT);
    return res.data;
  }

  /** "Starter", "Entreprise"… — falls back to the raw key for unknown plans. */
  planDisplayName(name: string | null | undefined): string {
    if (!name) return '';
    return PLAN_DISPLAY_NAMES[name as SubscriptionPlanName] ?? name;
  }

  /** WhatsApp deep link to the sales team, prefilled with the upgrade request. */
  upgradeWhatsAppUrl(message: string): string {
    return `https://wa.me/${SUBSCRIPTION_SALES_WHATSAPP}?text=${encodeURIComponent(message)}`;
  }
}

export const subscriptionService = new SubscriptionService();
