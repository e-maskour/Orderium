/** Approval state of a portal account. */
export type ClientRequestStatus = 'pending' | 'approved' | 'rejected';

/** A client account created from the customer portal, awaiting a decision. */
export interface ClientRequest {
  id: number;
  name: string | null;
  phoneNumber: string;
  email: string | null;
  status: ClientRequestStatus;
  userType: 'admin' | 'client';
  isAdmin: boolean;
  isCustomer: boolean;
  isActive: boolean;
  customerId: number | null;
  customerName: string | null;
  avatarUrl: string | null;
  dateCreated: string;
  dateUpdated: string;
}

export interface ClientRequestsResponse {
  requests: ClientRequest[];
  total: number;
}

export interface ClientRequestsParams {
  page?: number;
  pageSize?: number;
  status?: ClientRequestStatus;
  search?: string;
}
