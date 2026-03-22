export interface ISequence {
  id: string;
  name: string;
  entityType: SequenceEntityType;
  prefix: string;
  suffix: string;
  nextNumber: number;
  numberLength: number;
  isActive: boolean;
  yearInPrefix: boolean;
  monthInPrefix: boolean;
  dayInPrefix: boolean;
  trimesterInPrefix: boolean;
  createdAt?: string;
  updatedAt?: string;
  realTimeNextNumber?: number; // Enhanced field from database calculation
  format?: string; // Format pattern (e.g., "DV YYYY-MM-000X")
  nextDocumentNumber?: string; // Next actual document number (e.g., "DV 2026-01-0011")
}

export type SequenceEntityType =
  | 'invoice_sale'      // Facture de vente
  | 'invoice_purchase'  // Facture d'achat
  | 'quote'            // Devis
  | 'delivery_note'    // Bon de livraison
  | 'price_request'    // Demande de prix
  | 'purchase_order'   // Bon d'achat
  | 'payment'          // Paiement
  | 'credit_note'      // Avoir
  | 'receipt';         // Reçu

export interface CreateSequenceDTO {
  name: string;
  entityType: SequenceEntityType;
  prefix: string;
  suffix: string;
  numberLength: number;
  isActive: boolean;
  yearInPrefix: boolean;
  monthInPrefix: boolean;
  dayInPrefix: boolean;
  trimesterInPrefix: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateSequenceDTO extends Partial<CreateSequenceDTO> { }

export interface SequencePreview {
  example: string;
  nextSequence: string;
  format?: string;
}