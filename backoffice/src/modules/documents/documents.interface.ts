// ─── Core Document Types ──────────────────────────────────────────────────────

export type DocumentType = 'facture' | 'devis' | 'bon_livraison';
export type DocumentDirection = 'vente' | 'achat';
export type DocumentStatus =
  | 'draft'
  | 'unpaid'
  | 'partial'
  | 'paid'
  | 'open'
  | 'signed'
  | 'closed'
  | 'delivered'
  | 'invoiced'
  | 'validated'
  | 'in_progress'
  | 'cancelled';

// ─── Line Item ────────────────────────────────────────────────────────────────

export interface IDocumentLineItem {
  id: string;
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number; // 0 = fixed amount, 1 = percentage
  tax: number;
  total: number;
}

// ─── Base Document ────────────────────────────────────────────────────────────

export interface IBaseDocument {
  id?: number;
  documentNumber?: string;
  documentType?: DocumentType;
  direction?: DocumentDirection;

  partnerId?: number;
  partnerName?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  partnerIce?: string;

  date: string;
  dueDate?: string;
  expirationDate?: string;
  validationDate?: string | null;

  subtotal?: number;
  tax?: number;
  discount?: number;
  discountType?: number;
  total?: number;
  paidAmount?: number;
  remainingAmount?: number;

  status?: DocumentStatus;
  isValidated?: boolean;

  notes?: string;
  paymentTerms?: string;
  deliveryAddress?: string;

  linkedDocumentId?: number;
  dateCreated?: string;
  dateUpdated?: string;
}

export interface IDocumentWithItems extends IBaseDocument {
  items: IDocumentLineItem[];
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateDocumentDTO {
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  supplierId?: number;
  supplierName?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  date: string;
  dueDate?: string;
  expirationDate?: string;
  items: Array<{
    productId?: number;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: number;
    tax?: number;
  }>;
  tax?: number;
  discount?: number;
  discountType?: number;
  notes?: string;
  paymentTerms?: string;
}
