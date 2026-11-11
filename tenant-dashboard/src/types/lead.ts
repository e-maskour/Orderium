export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** A prospect captured by the landing page contact form. */
export interface Lead {
  id: number;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  activity: string | null;
  message: string | null;
  locale: string;
  channel: 'whatsapp' | 'email';
  status: LeadStatus;
  notes: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPath: string | null;
  contactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadList {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<LeadStatus, number>;
}

export interface ListLeadsParams {
  status?: LeadStatus | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateLeadInput {
  status?: LeadStatus;
  notes?: string;
}
