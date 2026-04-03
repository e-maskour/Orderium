// Document type definitions
export type DocumentType = 'facture' | 'devis' | 'bon_livraison';
export type DocumentDirection = 'vente' | 'achat';

export type DocumentStatus =
  | 'draft'
  | 'unpaid'
  | 'partial'
  | 'paid'
  | 'open' // Devis - Ouvert
  | 'signed' // Devis - Signée (à facturer)
  | 'closed' // Devis - Non signée (fermée)
  | 'delivered' // Devis - Convertie en bon de livraison seulement
  | 'invoiced' // Devis - Convertie en facture (avec ou sans bon)
  | 'validated' // Bon de livraison - Validée
  | 'in_progress' // Bon de livraison - En cours
  | 'cancelled';

export interface DocumentFeatures {
  hasPayments?: boolean;
  hasValidation?: boolean;
  canDownloadPDF?: boolean;
  canConvertToInvoice?: boolean;
  affectsInventory?: boolean;
  linkedToInvoice?: boolean;
  requiresSignature?: boolean;
  expirationDate?: boolean;
  showTax?: boolean;
  showDiscount?: boolean;
}

export interface DocumentItem {
  id: string;
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number; // 0 = amount, 1 = percentage
  tax: number;
  total: number;
}

export interface IBaseDocument {
  id?: number;
  documentNumber?: string;
  documentType?: DocumentType;
  direction?: DocumentDirection;

  // Partner info
  partnerId?: number;
  partnerName?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  partnerIce?: string;

  // Dates
  date: string;
  dueDate?: string;
  expirationDate?: string;
  validationDate?: string | null;

  // Amounts
  subtotal?: number;
  tax?: number;
  discount?: number;
  discountType?: number;
  total?: number;
  paidAmount?: number;
  remainingAmount?: number;

  // Status
  status?: DocumentStatus;
  isValidated?: boolean;

  // Additional fields
  notes?: string;
  paymentTerms?: string;
  deliveryAddress?: string;

  // Metadata
  linkedDocumentId?: number;
  dateCreated?: string;
  dateUpdated?: string;
}

export interface IDocumentWithItems extends IBaseDocument {
  items: DocumentItem[];
}

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
