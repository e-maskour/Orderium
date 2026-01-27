import { FileText, FileEdit, Truck } from 'lucide-react';
import { DocumentType, DocumentDirection, DocumentFeatures, DocumentStatus } from './document.types';

export interface DocumentConfig {
  type: DocumentType;
  direction: DocumentDirection;
  title: string;
  titleShort: string;
  prefix: string;
  icon: any;
  features: DocumentFeatures;
  statuses: DocumentStatus[];
  partnerLabel: string;
}

export const DOCUMENT_CONFIGS: Record<string, DocumentConfig> = {
  facture_vente: {
    type: 'facture',
    direction: 'vente',
    title: 'Factures de Vente',
    titleShort: 'Facture Client',
    prefix: 'FA',
    icon: FileText,
    partnerLabel: 'Client',
    features: {
      hasPayments: true,
      hasValidation: true,
      canDownloadPDF: true,
      affectsInventory: true,
      showTax: true,
      showDiscount: true
    },
    statuses: ['draft', 'unpaid', 'partial', 'paid']
  },
  facture_achat: {
    type: 'facture',
    direction: 'achat',
    title: 'Factures d\'Achat',
    titleShort: 'Facture Fournisseur',
    prefix: 'FB',
    icon: FileText,
    partnerLabel: 'Fournisseur',
    features: {
      hasPayments: true,
      hasValidation: true,
      canDownloadPDF: true,
      affectsInventory: true,
      showTax: true,
      showDiscount: true
    },
    statuses: ['draft', 'unpaid', 'partial', 'paid']
  },
  devis_vente: {
    type: 'devis',
    direction: 'vente',
    title: 'Devis',
    titleShort: 'Devis',
    prefix: 'DV',
    icon: FileEdit,
    partnerLabel: 'Client',
    features: {
      hasValidation: true,
      canDownloadPDF: true,
      canConvertToInvoice: true,
      expirationDate: true,
      showTax: true,
      showDiscount: true
    },
    statuses: ['draft', 'open', 'signed', 'closed', 'delivered', 'invoiced']
  },
  bon_livraison_vente: {
    type: 'bon_livraison',
    direction: 'vente',
    title: 'Bons de Livraison',
    titleShort: 'Bon de Livraison',
    prefix: 'BL',
    icon: Truck,
    partnerLabel: 'Client',
    features: {
      hasValidation: true,
      canDownloadPDF: true,
      linkedToInvoice: true,
      requiresSignature: true,
      showTax: true,
      showDiscount: true
    },
    statuses: ['draft', 'validated', 'in_progress', 'delivered', 'cancelled']
  }
};

export function getDocumentConfig(
  type: DocumentType, 
  direction: DocumentDirection = 'vente'
): DocumentConfig {
  const key = `${type}_${direction}`;
  return DOCUMENT_CONFIGS[key] || DOCUMENT_CONFIGS.facture_vente;
}

export function getDocumentIcon(type: DocumentType) {
  switch (type) {
    case 'facture':
      return FileText;
    case 'devis':
      return FileEdit;
    case 'bon_livraison':
      return Truck;
    default:
      return FileText;
  }
}
